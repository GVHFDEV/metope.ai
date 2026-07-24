import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  error: string | null;
}

const MIN_PASSWORD_LENGTH = 8;

/** Client-side pre-check; the backend (Supabase Auth) also enforces its own minimum. */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}

export async function signUpWithPassword(email: string, password: string, username?: string): Promise<AuthResult> {
  const passwordError = validatePassword(password);
  if (passwordError) return { user: null, error: passwordError };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username?.trim() || email.split('@')[0],
      },
    },
  });
  if (error) return { user: null, error: translateAuthError(error.message) };
  return { user: data.user, error: null };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: translateAuthError(error.message) };
  return { user: data.user, error: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Google OAuth -- wired end to end but left disabled in the UI until Client
 * ID/Secret are configured in the Supabase dashboard (Authentication →
 * Providers → Google). Calling this before that configuration will fail
 * with a clear Supabase error.
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) return { error: translateAuthError(error.message) };
  return { error: null };
}

function translateAuthError(message: string): string {
  if (message.includes('already registered') || message.includes('already exists')) {
    return 'Já existe uma conta com este email.';
  }
  if (message.includes('Invalid login credentials')) {
    return 'Email ou senha incorretos.';
  }
  if (message.includes('Password should be at least')) {
    return 'Senha muito curta. Use pelo menos 8 caracteres.';
  }
  if (message.includes('Unable to validate email')) {
    return 'Email inválido.';
  }
  return message;
}
