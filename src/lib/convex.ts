import { ConvexHttpClient } from 'convex/browser';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  // Surfaced early during development so the missing deployment URL is obvious.
  console.warn(
    'NEXT_PUBLIC_CONVEX_URL não definido. Rode `npx convex dev` para provisionar o backend.',
  );
}

export const convex = new ConvexHttpClient(convexUrl ?? '');

const SESSION_KEY = 'metope_session_id_v1';

/**
 * Opaque per-browser session token. There is no login yet, so this token is
 * how the backend scopes and authorizes each visitor's projects, files and
 * messages. It is generated once and persisted in localStorage.
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}
