import { v } from 'convex/values';
import { internalMutation, query } from './_generated/server';
import {
  LIMITS,
  enforceRateLimit,
  requireProject,
  requireSession,
  sanitizeActionType,
  sanitizeText,
} from './lib';

type MessageDoc = {
  _id: string;
  _creationTime: number;
  role: string;
  content: string;
  actionType: string;
};

function serialize(message: MessageDoc) {
  return {
    id: message._id,
    role: message.role,
    content: message.content,
    action_type: message.actionType,
    created_at: new Date(message._creationTime).toISOString(),
  };
}

export const listByProject = query({
  args: { sessionId: v.string(), projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const sessionId = requireSession(args.sessionId);
    await requireProject(ctx, sessionId, args.projectId);
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('asc')
      .collect();
    return messages.map(serialize);
  },
});

// --- Internal helpers used by the chat action (convex/chat.ts) ---

/**
 * Validates the session, applies the AI rate limit, sanitizes the prompt and
 * records the user's message. Returns the persisted user message plus the
 * context (files + recent history) needed to build the AI request.
 */
export const beginChat = internalMutation({
  args: {
    sessionId: v.string(),
    projectId: v.id('projects'),
    userPrompt: v.string(),
    actionType: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionId = requireSession(args.sessionId);
    await requireProject(ctx, sessionId, args.projectId);
    // Rate limit the expensive AI path per session.
    await enforceRateLimit(ctx, sessionId, 'chat.send', 15, 60_000);

    const actionType = sanitizeActionType(args.actionType);
    const content = sanitizeText(args.userPrompt, LIMITS.message);

    const userMessageId = await ctx.db.insert('messages', {
      sessionId,
      projectId: args.projectId,
      role: 'user',
      content,
      actionType,
    });
    const userMessage = await ctx.db.get(userMessageId);

    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    const history = await ctx.db
      .query('messages')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(7); // most recent, excluding/including the just-added user msg

    return {
      userMessage: serialize(userMessage!),
      actionType,
      files: files.map((f) => ({
        name: f.name,
        mimeType: f.mimeType,
        storageId: f.storageId,
        contentText: f.contentText,
      })),
      history: history
        .reverse()
        .map((m) => ({ role: m.role, content: m.content })),
    };
  },
});

/** Persists the assistant's reply once the AI call completes. */
export const finishChat = internalMutation({
  args: {
    sessionId: v.string(),
    projectId: v.id('projects'),
    content: v.string(),
    actionType: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionId = requireSession(args.sessionId);
    await requireProject(ctx, sessionId, args.projectId);
    const id = await ctx.db.insert('messages', {
      sessionId,
      projectId: args.projectId,
      role: 'assistant',
      content: sanitizeText(args.content, LIMITS.message),
      actionType: sanitizeActionType(args.actionType),
    });
    const message = await ctx.db.get(id);
    return serialize(message!);
  },
});
