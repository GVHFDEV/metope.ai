import { Project, ProjectFile, ChatMessage, QuickActionType } from '@/types';
import { convex, getSessionId } from './convex';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';

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
// Infer a sensible value from the extension so backend validation succeeds.
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
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown' ||
    mimeType === 'application/json'
  );
}

/**
 * Client-side data layer backed entirely by Convex (database, storage and the
 * chat action). Ownership/authorization is enforced on the backend using the
 * per-browser session token.
 */
export class StorageService {
  // --- PROJECTS ---
  static async getProjects(): Promise<Project[]> {
    const result = await convex.query(api.projects.list, { sessionId: getSessionId() });
    return result as Project[];
  }

  static async createProject(
    name: string,
    description?: string,
    category: Project['category'] = 'Residencial',
  ): Promise<Project> {
    const result = await convex.mutation(api.projects.create, {
      sessionId: getSessionId(),
      name,
      description,
      category,
    });
    return result as Project;
  }

  static async updateProject(
    id: string,
    updates: { name?: string; description?: string; category?: Project['category'] },
  ): Promise<Project> {
    const result = await convex.mutation(api.projects.update, {
      sessionId: getSessionId(),
      projectId: id as Id<'projects'>,
      ...updates,
    });
    return result as Project;
  }

  static async deleteProject(id: string): Promise<void> {
    await convex.mutation(api.projects.remove, {
      sessionId: getSessionId(),
      projectId: id as Id<'projects'>,
    });
  }

  // --- FILES ---
  static async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    const result = await convex.query(api.files.listByProject, {
      sessionId: getSessionId(),
      projectId: projectId as Id<'projects'>,
    });
    return result as ProjectFile[];
  }

  static async uploadFile(projectId: string, file: File): Promise<ProjectFile> {
    const sessionId = getSessionId();
    const mimeType = inferMimeType(file);

    // 1. Get a single-use upload URL from Convex (no storage credentials leak).
    const uploadUrl = await convex.mutation(api.files.generateUploadUrl, {
      sessionId,
      projectId: projectId as Id<'projects'>,
    });

    // 2. Upload the raw bytes directly to Convex storage.
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': mimeType },
      body: file,
    });
    if (!uploadRes.ok) {
      throw new Error('Falha ao enviar o arquivo para o storage.');
    }
    const { storageId } = (await uploadRes.json()) as { storageId: string };

    // 3. Extract text for text-like docs so the AI has readable context.
    const contentText = isTextLike(mimeType) ? await readAsText(file) : '';

    // 4. Persist metadata (backend validates type/size against the real blob).
    const result = await convex.mutation(api.files.create, {
      sessionId,
      projectId: projectId as Id<'projects'>,
      storageId: storageId as Id<'_storage'>,
      name: file.name,
      mimeType,
      contentText,
    });
    return result as ProjectFile;
  }

  static async deleteFile(fileId: string): Promise<void> {
    await convex.mutation(api.files.remove, {
      sessionId: getSessionId(),
      fileId: fileId as Id<'files'>,
    });
  }

  // --- MESSAGES ---
  static async getProjectMessages(projectId: string): Promise<ChatMessage[]> {
    const result = await convex.query(api.messages.listByProject, {
      sessionId: getSessionId(),
      projectId: projectId as Id<'projects'>,
    });
    return result as ChatMessage[];
  }

  /**
   * Runs the full chat turn on the backend: persists the user message, calls
   * Gemini with file context, and persists the assistant reply.
   */
  static async sendChat(
    projectId: string,
    userPrompt: string,
    actionType: QuickActionType | 'general' = 'general',
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    const result = await convex.action(api.chat.send, {
      sessionId: getSessionId(),
      projectId: projectId as Id<'projects'>,
      userPrompt,
      actionType,
    });
    return result as { userMessage: ChatMessage; assistantMessage: ChatMessage };
  }
}
