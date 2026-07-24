import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  LIMITS,
  MAX_FILE_SIZE,
  classifyFile,
  enforceRateLimit,
  requireFile,
  requireProject,
  requireSession,
  sanitizeText,
} from './lib';

/**
 * Issues a short-lived, single-use upload URL from Convex storage. The client
 * POSTs the raw file bytes to this URL directly; it never receives any storage
 * credentials or bucket details.
 */
export const generateUploadUrl = mutation({
  args: { sessionId: v.string(), projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const sessionId = requireSession(args.sessionId);
    await requireProject(ctx, sessionId, args.projectId);
    await enforceRateLimit(ctx, sessionId, 'file.upload', 40, 60_000);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Records file metadata after the bytes have been uploaded to storage.
 * Validates ownership, mime type and the real stored size before persisting.
 */
export const create = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id('projects'),
    storageId: v.id('_storage'),
    name: v.string(),
    mimeType: v.string(),
    contentText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessionId = requireSession(args.sessionId);
    await requireProject(ctx, sessionId, args.projectId);

    const category = classifyFile(args.mimeType);
    if (!category) {
      await ctx.storage.delete(args.storageId);
      throw new Error(`Tipo de arquivo não suportado: ${args.mimeType}`);
    }

    // Verify the actual stored blob rather than trusting a client-sent size.
    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) {
      throw new Error('Upload não encontrado no storage.');
    }
    if (metadata.size > MAX_FILE_SIZE) {
      await ctx.storage.delete(args.storageId);
      throw new Error('Arquivo excede o tamanho máximo de 15 MB.');
    }

    const name = sanitizeText(args.name, LIMITS.fileName) || 'arquivo';
    const id = await ctx.db.insert('files', {
      sessionId,
      projectId: args.projectId,
      name,
      type: category,
      mimeType: args.mimeType,
      size: metadata.size,
      storageId: args.storageId,
      contentText: sanitizeText(args.contentText ?? '', 200_000),
    });

    const file = await ctx.db.get(id);
    const url = await ctx.storage.getUrl(args.storageId);
    return serializeFile(file!, url);
  },
});

export const listByProject = query({
  args: { sessionId: v.string(), projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const sessionId = requireSession(args.sessionId);
    await requireProject(ctx, sessionId, args.projectId);

    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('asc')
      .collect();

    return await Promise.all(
      files.map(async (file) => serializeFile(file, await ctx.storage.getUrl(file.storageId))),
    );
  },
});

export const remove = mutation({
  args: { sessionId: v.string(), fileId: v.id('files') },
  handler: async (ctx, args) => {
    const sessionId = requireSession(args.sessionId);
    const file = await requireFile(ctx, sessionId, args.fileId);
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(file._id);
  },
});

type FileDoc = {
  _id: string;
  _creationTime: number;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  contentText: string;
};

// Resolves a fresh, access-checked download URL. `storageId` is never exposed.
function serializeFile(file: FileDoc, url: string | null) {
  return {
    id: file._id,
    name: file.name,
    type: file.type,
    mime_type: file.mimeType,
    size: file.size,
    url: url ?? '',
    content_text: file.contentText,
    created_at: new Date(file._creationTime).toISOString(),
  };
}
