import { Project, ProjectFile, ChatMessage, QuickActionType, FloorPlanData, Conversation } from '@/types';
import { supabase, getSessionId, clearSessionId } from './supabase';
import { callGeminiApi } from './gemini';

const STORAGE_BUCKET = 'project-files';

// Reads a text-like file's contents so it can be indexed for the AI context.
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// Some files (e.g. .md, .json) arrive with an empty MIME type in the browser.
function inferMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
      return 'text/markdown';
    case 'txt':
      return 'text/plain';
    case 'json':
      return 'application/json';
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function isTextLike(mimeType: string): boolean {
  return (
    mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType === 'application/json'
  );
}

function classifyFile(mime: string): ProjectFile['type'] {
  if (mime === 'application/json') return 'floorplan';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('word') || mime.includes('document')) return 'doc';
  return 'txt';
}

/** Resolves the caller's identity: the logged-in user's id, or the anonymous session id. */
async function getOwnerKey(): Promise<{ userId: string | null; sessionId: string | null }> {
  const { data } = await supabase.auth.getUser();
  if (data.user) return { userId: data.user.id, sessionId: null };
  return { userId: null, sessionId: getSessionId() };
}

type ProjectRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
  updated_at: string;
};

function serializeProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category as Project['category'],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

type FileRow = {
  id: string;
  name: string;
  type: string;
  mime_type: string;
  size: number;
  storage_path: string;
  content_text: string;
  created_at: string;
};

async function serializeFile(row: FileRow): Promise<ProjectFile> {
  // Bucket is private; resolve a short-lived signed URL for reads instead of
  // exposing the raw storage path.
  const { data } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(row.storage_path, 3600);
  return {
    id: row.id,
    name: row.name,
    type: row.type as ProjectFile['type'],
    mime_type: row.mime_type,
    size: row.size,
    url: data?.signedUrl ?? '',
    content_text: row.content_text,
    created_at: row.created_at,
  };
}

type MessageRow = {
  id: string;
  conversation_id?: string | null;
  project_id: string;
  role: string;
  content: string;
  action_type: string;
  model_used?: string | null;
  created_at: string;
};

function serializeMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversation_id: row.conversation_id || undefined,
    project_id: row.project_id,
    role: row.role as ChatMessage['role'],
    content: row.content,
    action_type: row.action_type as ChatMessage['action_type'],
    model_used: row.model_used || undefined,
    created_at: row.created_at,
  };
}

/**
 * Client-side data layer backed by Supabase (Postgres + Storage + Auth).
 * Row Level Security enforces ownership on every read/write at the database
 * level -- the userId/sessionId scoping here is what determines which rows a
 * new insert belongs to, not a substitute for RLS.
 */
export class StorageService {
  // --- PROJECTS ---
  static async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(serializeProject);
  }

  static async createProject(
    name: string,
    description?: string,
    category: Project['category'] = 'Residencial',
  ): Promise<Project> {
    const { userId, sessionId } = await getOwnerKey();
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        session_id: sessionId,
        name,
        description: description ?? '',
        category,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return serializeProject(data);
  }

  static async updateProject(
    id: string,
    updates: { name?: string; description?: string; category?: Project['category'] },
  ): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return serializeProject(data);
  }

  static async deleteProject(id: string): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  /**
   * Migrates a single anonymous project (created under the current browser's
   * sessionId) to the now-logged-in user via the `claim_session_project` RPC.
   * The RPC itself re-checks ownership server-side (RLS + explicit WHERE),
   * so this call cannot be used to claim someone else's project.
   */
  static async claimSessionProject(projectId: string): Promise<Project> {
    const { data, error } = await supabase.rpc('claim_session_project', {
      p_project_id: projectId,
      p_session_id: getSessionId(),
    });
    if (error) throw new Error(error.message);
    return serializeProject(data as ProjectRow);
  }

  // --- FILES ---
  static async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return Promise.all((data ?? []).map(serializeFile));
  }

  static async uploadFile(projectId: string, file: File): Promise<ProjectFile> {
    const { userId, sessionId } = await getOwnerKey();
    const mimeType = inferMimeType(file);
    const ownerFolder = userId ?? sessionId ?? 'anon';

    // Sanitize filename for Supabase Storage S3 key rules (alphanumeric, dots, dashes, underscores)
    const sanitizedFileName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    const storagePath = `${ownerFolder}/${projectId}/${Date.now()}_${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, { contentType: mimeType });
    if (uploadError) throw new Error(uploadError.message);

    const contentText = isTextLike(mimeType) ? await readAsText(file) : '';

    const { data, error } = await supabase
      .from('files')
      .insert({
        user_id: userId,
        session_id: sessionId,
        project_id: projectId,
        name: file.name,
        type: classifyFile(mimeType),
        mime_type: mimeType,
        size: file.size,
        storage_path: storagePath,
        content_text: contentText,
      })
      .select()
      .single();

    if (error) {
      // Roll back the uploaded blob if the metadata insert failed.
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      throw new Error(error.message);
    }
    return serializeFile(data);
  }

  static async createFloorPlanFile(
    projectId: string,
    fileName: string,
    floorPlanData: FloorPlanData
  ): Promise<ProjectFile> {
    const { userId, sessionId } = await getOwnerKey();
    const contentText = JSON.stringify(floorPlanData, null, 2);
    const size = Buffer.byteLength(contentText, 'utf-8');
    const storagePath = `floorplans/${projectId}/${Date.now()}_${fileName}`;

    const { data, error } = await supabase
      .from('files')
      .insert({
        user_id: userId,
        session_id: sessionId,
        project_id: projectId,
        name: fileName,
        type: 'floorplan',
        mime_type: 'application/json',
        size,
        storage_path: storagePath,
        content_text: contentText,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return serializeFile(data);
  }

  static async deleteFile(fileId: string): Promise<void> {
    const { data: fileRow, error: fetchError } = await supabase
      .from('files')
      .select('storage_path')
      .eq('id', fileId)
      .single();
    if (fetchError) throw new Error(fetchError.message);

    const { error } = await supabase.from('files').delete().eq('id', fileId);
    if (error) throw new Error(error.message);

    if (fileRow?.storage_path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([fileRow.storage_path]);
    }
  }

  // --- CONVERSATIONS ---
  static async getConversations(projectId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      project_id: row.project_id,
      title: row.title,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  static async createConversation(projectId: string, title = 'Nova Conversa'): Promise<Conversation> {
    const { userId, sessionId } = await getOwnerKey();
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        project_id: projectId,
        title,
        user_id: userId,
        session_id: sessionId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      project_id: data.project_id,
      title: data.title,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  static async renameConversation(conversationId: string, newTitle: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ title: newTitle, updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    if (error) throw new Error(error.message);
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
    if (error) throw new Error(error.message);
  }

  // --- MESSAGES ---
  static async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(serializeMessage);
  }

  static async getProjectMessages(projectId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(serializeMessage);
  }

  static async addMessage(
    projectId: string,
    conversationId: string | undefined,
    role: 'user' | 'assistant',
    content: string,
    actionType: ChatMessage['action_type'] = 'general',
    modelUsed?: string,
  ): Promise<ChatMessage> {
    const { userId, sessionId } = await getOwnerKey();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertPayload: any = {
      user_id: userId,
      session_id: sessionId,
      project_id: projectId,
      conversation_id: conversationId || null,
      role,
      content,
      action_type: actionType,
    };
    if (modelUsed) {
      insertPayload.model_used = modelUsed;
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select()
      .single();
    if (error) {
      // Fallback if DB table messages does not have model_used column yet
      delete insertPayload.model_used;
      const fallback = await supabase
        .from('messages')
        .insert(insertPayload)
        .select()
        .single();
      if (fallback.error) throw new Error(fallback.error.message);
      const msg = serializeMessage(fallback.data as MessageRow);
      msg.model_used = modelUsed;
      return msg;
    }
    const msg = serializeMessage(data as MessageRow);
    if (modelUsed) msg.model_used = modelUsed;
    return msg;
  }

  /**
   * Persists the user message, calls the Supabase Edge Function ai-chat, then persists the reply.
   */
  static async sendChat(
    projectId: string,
    conversationId: string,
    userPrompt: string,
    actionType: QuickActionType | 'general' = 'general',
    files: ProjectFile[] = [],
    forceSearch: boolean = false,
    forceThinking: boolean = false,
    onProgress?: (stage: string, message: string) => void
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    const userMessage = await this.addMessage(projectId, conversationId, 'user', userPrompt, actionType);

    const previousMessages = await this.getConversationMessages(conversationId);
    
    let aiText: string;
    let modelUsed: string | undefined = undefined;
    try {
      const res = await callGeminiApi({
        userPrompt,
        files,
        actionType,
        previousMessages: previousMessages.map((m) => ({ role: m.role, content: m.content })),
        forceSearch,
        forceThinking,
      }, onProgress);
      aiText = res.response;
      modelUsed = res.modelUsed;
    } catch (err) {
      aiText = err instanceof Error ? err.message : 'O serviço de IA (Supabase Edge Function) está indisponível.';
    }

    const assistantMessage = await this.addMessage(projectId, conversationId, 'assistant', aiText, actionType, modelUsed);
    return { userMessage, assistantMessage };
  }

  /**
   * Full local→account migration: reads every project still tied to the
   * current browser's sessionId, claims each one for the now-logged-in
   * user, and only clears the local sessionId once every project has been
   * confirmed migrated.
   */
  static async migrateSessionProjectsToAccount(): Promise<number> {
    const sessionId = getSessionId();
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('session_id', sessionId);
    if (error) throw new Error(error.message);

    const projectIds = (data ?? []).map((p) => p.id as string);
    let migrated = 0;
    for (const id of projectIds) {
      try {
        await this.claimSessionProject(id);
        migrated += 1;
      } catch (err) {
        console.error('Falha ao migrar projeto', id, err);
      }
    }

    if (migrated === projectIds.length) {
      clearSessionId();
    }
    return migrated;
  }
}
