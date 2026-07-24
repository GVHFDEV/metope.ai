import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Convex data model for Metope AI.
//
// Note: there is no login/auth yet, so ownership is enforced through an opaque
// per-browser `sessionId` token that the client generates and stores locally.
// Every row records the session that created it and the backend validates that
// the caller's session matches before reading or writing.
export default defineSchema({
  projects: defineTable({
    sessionId: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    updatedAt: v.number(),
  }).index('by_session', ['sessionId']),

  files: defineTable({
    sessionId: v.string(),
    projectId: v.id('projects'),
    name: v.string(),
    // Coarse UI category: 'pdf' | 'image' | 'doc' | 'txt'
    type: v.string(),
    mimeType: v.string(),
    size: v.number(),
    // Native Convex storage reference. Never exposed raw to the client.
    storageId: v.id('_storage'),
    contentText: v.string(),
  })
    .index('by_project', ['projectId'])
    .index('by_session', ['sessionId']),

  messages: defineTable({
    sessionId: v.string(),
    projectId: v.id('projects'),
    role: v.string(), // 'user' | 'assistant'
    content: v.string(),
    actionType: v.string(), // 'general' | 'summary' | 'memorial' | 'layout_analysis'
  }).index('by_project', ['projectId']),

  // Simple fixed-window rate limiting keyed by `${sessionId}:${action}`.
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index('by_key', ['key']),
});
