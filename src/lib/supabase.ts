import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não definidos em .env.local.',
  );
}

// Anon/publishable key -- safe in the frontend by design, RLS enforces
// per-row access at the database. Never use the service_role key here.
export const supabase = createClient<Database>(supabaseUrl ?? '', supabaseAnonKey ?? '');

const SESSION_KEY = 'metope_session_id_v1';

/**
 * Opaque per-browser session token, used to scope anonymous (logged-out)
 * projects/files/messages. Generated once and persisted in localStorage.
 * Cleared once its data has been successfully migrated to an account.
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

export function clearSessionId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}
