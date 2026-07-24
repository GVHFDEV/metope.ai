import { Id } from './_generated/dataModel';
import { MutationCtx, QueryCtx } from './_generated/server';

// ---------------------------------------------------------------------------
// Input sanitization
// ---------------------------------------------------------------------------

/**
 * Strips control characters, collapses excessive whitespace and enforces a
 * maximum length. Runs on the backend so the client can never bypass it.
 */
export function sanitizeText(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  // Remove ASCII control chars (except newline/tab) and zero-width chars.
  const cleaned = input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  return cleaned.slice(0, maxLength);
}

export const LIMITS = {
  projectName: 120,
  projectDescription: 2000,
  message: 8000,
  fileName: 255,
} as const;

const VALID_CATEGORIES = [
  'Residencial',
  'Comercial',
  'Corporativo',
  'Interiores',
  'Outro',
] as const;

export function sanitizeCategory(input: unknown): string {
  return (VALID_CATEGORIES as readonly string[]).includes(input as string)
    ? (input as string)
    : 'Residencial';
}

const VALID_ACTION_TYPES = ['general', 'summary', 'memorial', 'layout_analysis'];

export function sanitizeActionType(input: unknown): string {
  return VALID_ACTION_TYPES.includes(input as string) ? (input as string) : 'general';
}

// ---------------------------------------------------------------------------
// File validation
// ---------------------------------------------------------------------------

export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

// Map of accepted mime types -> coarse UI category.
const ALLOWED_MIME: Record<string, 'pdf' | 'image' | 'doc' | 'txt'> = {
  'application/pdf': 'pdf',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'text/plain': 'txt',
  'text/markdown': 'txt',
  'application/json': 'doc',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
};

export function classifyFile(mimeType: string): 'pdf' | 'image' | 'doc' | 'txt' | null {
  return ALLOWED_MIME[mimeType] ?? null;
}

export function isTextLike(mimeType: string): boolean {
  return (
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown' ||
    mimeType === 'application/json'
  );
}

// ---------------------------------------------------------------------------
// Ownership / authorization
// ---------------------------------------------------------------------------

/** A valid session token is a non-empty opaque string. */
export function requireSession(sessionId: unknown): string {
  if (typeof sessionId !== 'string' || sessionId.length < 8 || sessionId.length > 128) {
    throw new Error('Sessão inválida.');
  }
  return sessionId;
}

/** Loads a project and confirms it belongs to the caller's session. */
export async function requireProject(
  ctx: QueryCtx | MutationCtx,
  sessionId: string,
  projectId: Id<'projects'>,
) {
  const project = await ctx.db.get(projectId);
  if (!project || project.sessionId !== sessionId) {
    throw new Error('Projeto não encontrado ou acesso negado.');
  }
  return project;
}

/** Loads a file and confirms it belongs to the caller's session. */
export async function requireFile(
  ctx: QueryCtx | MutationCtx,
  sessionId: string,
  fileId: Id<'files'>,
) {
  const file = await ctx.db.get(fileId);
  if (!file || file.sessionId !== sessionId) {
    throw new Error('Arquivo não encontrado ou acesso negado.');
  }
  return file;
}

// ---------------------------------------------------------------------------
// Rate limiting (fixed window)
// ---------------------------------------------------------------------------

/**
 * Enforces a fixed-window rate limit. Throws when the caller exceeds `limit`
 * calls within `windowMs`. Must run inside a mutation (it writes state).
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  sessionId: string,
  action: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const key = `${sessionId}:${action}`;
  const now = Date.now();
  const existing = await ctx.db
    .query('rateLimits')
    .withIndex('by_key', (q) => q.eq('key', key))
    .unique();

  if (!existing || now - existing.windowStart >= windowMs) {
    if (existing) {
      await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
    } else {
      await ctx.db.insert('rateLimits', { key, windowStart: now, count: 1 });
    }
    return;
  }

  if (existing.count >= limit) {
    throw new Error('Limite de requisições atingido. Aguarde alguns instantes.');
  }
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}
