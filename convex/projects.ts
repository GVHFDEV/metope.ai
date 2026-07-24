import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import {
  LIMITS,
  enforceRateLimit,
  requireProject,
  requireSession,
  sanitizeCategory,
  sanitizeText,
} from './lib';

// Normalized shape returned to the client (stable across the migration).
function serialize(project: {
  _id: string;
  _creationTime: number;
  name: string;
  description: string;
  category: string;
  updatedAt: number;
}) {
  return {
    id: project._id,
    name: project.name,
    description: project.description,
    category: project.category,
    created_at: new Date(project._creationTime).toISOString(),
    updated_at: new Date(project.updatedAt).toISOString(),
  };
}

export const list = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const sessionId = requireSession(args.sessionId);
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .order('desc')
      .collect();
    return projects.map(serialize);
  },
});

export const create = mutation({
  args: {
    sessionId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessionId = requireSession(args.sessionId);
    await enforceRateLimit(ctx, sessionId, 'project.create', 30, 60_000);

    const name = sanitizeText(args.name, LIMITS.projectName);
    if (!name) throw new Error('Nome do projeto é obrigatório.');

    const now = Date.now();
    const id = await ctx.db.insert('projects', {
      sessionId,
      name,
      description: sanitizeText(args.description ?? '', LIMITS.projectDescription),
      category: sanitizeCategory(args.category),
      updatedAt: now,
    });

    const project = await ctx.db.get(id);
    return serialize(project!);
  },
});

export const update = mutation({
  args: {
    sessionId: v.string(),
    projectId: v.id('projects'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessionId = requireSession(args.sessionId);
    await requireProject(ctx, sessionId, args.projectId);

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const name = sanitizeText(args.name, LIMITS.projectName);
      if (!name) throw new Error('Nome do projeto é obrigatório.');
      patch.name = name;
    }
    if (args.description !== undefined) {
      patch.description = sanitizeText(args.description, LIMITS.projectDescription);
    }
    if (args.category !== undefined) {
      patch.category = sanitizeCategory(args.category);
    }

    await ctx.db.patch(args.projectId, patch);
    const project = await ctx.db.get(args.projectId);
    return serialize(project!);
  },
});

export const remove = mutation({
  args: { sessionId: v.string(), projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const sessionId = requireSession(args.sessionId);
    await requireProject(ctx, sessionId, args.projectId);

    // Cascade delete: files (with their stored blobs) and messages.
    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    for (const file of files) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(file._id);
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(args.projectId);
  },
});
