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

export async function updateProfileUsername(username: string): Promise<AuthResult> {
  const trimmed = username.trim();
  if (!trimmed) {
    return { user: null, error: 'O nome de usuário não pode estar em branco.' };
  }
  if (trimmed.length < 2 || trimmed.length > 30) {
    return { user: null, error: 'O nome de usuário deve ter entre 2 e 30 caracteres.' };
  }
  if (!/^[a-zA-Z0-9_\-\.\s]{2,30}$/.test(trimmed)) {
    return { user: null, error: 'O nome de usuário possui caracteres inválidos.' };
  }

  const { data, error } = await supabase.auth.updateUser({
    data: { username: trimmed },
  });
  if (error) return { user: null, error: translateAuthError(error.message) };
  return { user: data.user, error: null };
}

export async function updateProfileEmail(newEmail: string): Promise<AuthResult & { notice?: string }> {
  const trimmed = newEmail.trim();
  if (!trimmed || !trimmed.includes('@')) {
    return { user: null, error: 'E-mail inválido.' };
  }

  const { data, error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) return { user: null, error: translateAuthError(error.message) };
  return {
    user: data.user,
    error: null,
    notice: 'Solicitação registrada! Um e-mail de verificação foi enviado para o novo endereço.',
  };
}

export async function uploadProfileAvatar(file: File): Promise<{ avatarUrl?: string; error?: string }> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return { error: 'Selecione uma imagem válida (JPG, PNG ou WebP).' };
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { error: 'A imagem deve ter no máximo 5MB.' };
  }

  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });

    const { data, error } = await supabase.functions.invoke('upload-avatar', {
      body: {
        file_base64: base64,
        mime_type: file.type,
        file_name: file.name,
      },
    });

    if (error) {
      return { error: error.message || 'Falha ao enviar foto para o servidor.' };
    }

    if (!data || !data.avatar_url) {
      return { error: data?.error || 'Erro ao processar imagem na Cloudinary.' };
    }

    return { avatarUrl: data.avatar_url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao comunicar com o servidor de fotos.';
    return { error: msg };
  }
}

export interface OnboardingData {
  funcao?: string;
  funcao_outro?: string;
  objetivos?: string[];
  onboarding_completo?: boolean;
  onboarding_pulado?: boolean;
  onboarding_card_dismissed?: boolean;
}

export async function updateUserOnboardingData(data: OnboardingData): Promise<AuthResult> {
  const allowedFuncoes = [
    'Arquiteto(a)',
    'Engenheiro(a) Civil',
    'Estudante de Arquitetura/Engenharia',
    'Designer de Interiores',
    'Outro',
  ];

  if (data.funcao && !allowedFuncoes.includes(data.funcao)) {
    return { user: null, error: 'Função selecionada inválida.' };
  }

  let sanitizedOutro = data.funcao_outro?.trim();
  if (sanitizedOutro && sanitizedOutro.length > 50) {
    sanitizedOutro = sanitizedOutro.substring(0, 50);
  }

  const allowedObjetivos = [
    'Organizar e consultar documentos de projeto',
    'Gerar memoriais e documentos',
    'Estudos de layout/plantas',
    'Renders e apresentação visual',
    'Ainda não sei, só explorando',
  ];

  let sanitizedObjetivos = data.objetivos;
  if (Array.isArray(sanitizedObjetivos)) {
    sanitizedObjetivos = sanitizedObjetivos.filter((obj) => allowedObjetivos.includes(obj));
  }

  const { data: resData, error } = await supabase.auth.updateUser({
    data: {
      ...(data.funcao !== undefined && { funcao: data.funcao }),
      ...(sanitizedOutro !== undefined && { funcao_outro: sanitizedOutro }),
      ...(sanitizedObjetivos !== undefined && { objetivo_principal: sanitizedObjetivos }),
      ...(data.onboarding_completo !== undefined && { onboarding_completo: data.onboarding_completo }),
      ...(data.onboarding_pulado !== undefined && { onboarding_pulado: data.onboarding_pulado }),
      ...(data.onboarding_card_dismissed !== undefined && { onboarding_card_dismissed: data.onboarding_card_dismissed }),
    },
  });

  if (error) return { user: null, error: translateAuthError(error.message) };
  return { user: resData.user, error: null };
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
