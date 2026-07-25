'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { User } from '@supabase/supabase-js';
import { updateProfileUsername, updateProfileEmail, uploadProfileAvatar } from '@/lib/auth';
import {
  X,
  User as UserIcon,
  Settings as SettingsIcon,
  Loader2,
  Mail,
} from 'lucide-react';

export type SettingsCategory = 'profile';

export interface CategoryItem {
  id: SettingsCategory;
  label: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'profile', label: 'Perfil', icon: <UserIcon className="w-4 h-4" /> },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated?: (updatedUser: User) => void;
  onShowToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
  onOpenOnboarding?: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  onShowToast,
  onOpenOnboarding,
}: SettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('profile');

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Local ref to prevent flicker if onAuthStateChange emits a stale user object temporarily
  const uploadedAvatarRef = useRef<string | null>(null);

  // Status feedback
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form states when user or modal state changes
  useEffect(() => {
    if (user) {
      const initialUsername = (user.user_metadata?.username as string) || user.email?.split('@')[0] || '';
      setUsername(initialUsername);
      setEmail(user.email || '');

      const userMetadataAvatar = (user.user_metadata?.avatar_url as string) || null;
      if (uploadedAvatarRef.current) {
        setAvatarUrl(uploadedAvatarRef.current);
      } else {
        setAvatarUrl(userMetadataAvatar);
      }
    }
    setEmailStatus(null);
  }, [user, isOpen]);

  // Save username ONLY when modal closes
  const handleModalClose = async () => {
    if (user) {
      const storedUsername = (user.user_metadata?.username as string) || user.email?.split('@')[0] || '';
      const trimmed = username.trim();

      if (trimmed && trimmed !== storedUsername) {
        try {
          const { user: updatedUser, error } = await updateProfileUsername(trimmed);
          if (!error && updatedUser) {
            onUserUpdated?.(updatedUser);
            onShowToast?.('Salvo', undefined, 'success');
          } else if (error) {
            onShowToast?.('Algo deu errado. Tente novamente.', undefined, 'error');
          }
        } catch (_err) {
          onShowToast?.('Algo deu errado. Tente novamente.', undefined, 'error');
        }
      }
    }
    onClose();
  };

  if (!isOpen || !user) return null;

  const initialLetter = (username || user.email || 'U').charAt(0).toUpperCase();

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatus(null);

    if (email.trim() === user.email) {
      return;
    }

    setIsSavingEmail(true);
    try {
      const { user: updatedUser, error, notice } = await updateProfileEmail(email);
      if (error) {
        setEmailStatus({ type: 'error', message: error });
        onShowToast?.('Algo deu errado. Tente novamente.', undefined, 'error');
      } else {
        setEmailStatus({
          type: 'success',
          message: notice || 'Solicitação enviada! Verifique a caixa de entrada do novo e-mail.',
        });
        onShowToast?.('Salvo', undefined, 'success');
        if (updatedUser) onUserUpdated?.(updatedUser);
      }
    } catch (_err) {
      setEmailStatus({ type: 'error', message: 'Erro ao solicitar alteração de e-mail.' });
      onShowToast?.('Algo deu errado. Tente novamente.', undefined, 'error');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const { avatarUrl: newAvatarUrl, error } = await uploadProfileAvatar(file);
      if (error) {
        onShowToast?.('Algo deu errado. Tente novamente.', undefined, 'error');
      } else if (newAvatarUrl) {
        uploadedAvatarRef.current = newAvatarUrl;
        setAvatarUrl(newAvatarUrl);
        onShowToast?.('Salvo', undefined, 'success');
        if (user) {
          onUserUpdated?.({
            ...user,
            user_metadata: { ...user.user_metadata, avatar_url: newAvatarUrl },
          });
        }
      }
    } catch (_err) {
      onShowToast?.('Algo deu errado. Tente novamente.', undefined, 'error');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 font-sans select-none text-[#09090b] dark:text-[#f4f4f5]">
      {/* Backdrop overlay */}
      <div className="absolute inset-0" onClick={handleModalClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl w-full max-w-2xl h-[500px] max-h-[90vh] shadow-2xl flex overflow-hidden relative z-10"
      >
        {/* Close Button */}
        <button
          onClick={handleModalClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] text-[#71717a] hover:text-[#09090b] dark:hover:text-[#f4f4f5] rounded-lg transition-colors cursor-pointer z-20"
          title="Fechar Configurações"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Left Navigation Sidebar */}
        <div className="w-48 border-r border-[#e4e4e7] dark:border-[#27272a] bg-[#fafafa] dark:bg-[#121214] p-3 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 px-2 py-2 mb-3 text-xs font-semibold text-[#09090b] dark:text-[#f4f4f5] border-b border-[#e4e4e7] dark:border-[#27272a]">
              <SettingsIcon className="w-4 h-4 text-[#BA4E20]" />
              <span>Configurações</span>
            </div>

            <nav className="space-y-1">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] text-[#BA4E20] font-semibold shadow-2xs'
                        : 'text-[#71717a] dark:text-[#a1a1aa] hover:text-[#09090b] dark:hover:text-[#f4f4f5] hover:bg-[#e4e4e7]/50 dark:hover:bg-[#27272a]/50 font-medium'
                    }`}
                  >
                    <span className={isActive ? 'text-[#BA4E20]' : 'text-[#71717a] dark:text-[#a1a1aa]'}>
                      {cat.icon}
                    </span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="px-2 py-1 text-[10px] font-mono text-[#71717a] dark:text-[#a1a1aa]">
            METOPE AI v0.1.0
          </div>
        </div>

        {/* Modal Right Content Panel */}
        <div className="flex-1 p-6 overflow-y-auto font-sans">
          {activeCategory === 'profile' && (
            <div className="space-y-6 max-w-lg">
              {/* Category Header */}
              <div>
                <h3 className="text-base font-bold tracking-tight text-[#09090b] dark:text-[#f4f4f5]">
                  Perfil do Usuário
                </h3>
                <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-0.5">
                  Gerencie suas informações pessoais e credenciais da conta.
                </p>
              </div>

              {/* Avatar Section */}
              <div className="flex items-center gap-4 p-3.5 bg-[#fafafa] dark:bg-[#121214] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileSelect}
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                />

                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-14 h-14 rounded-full object-cover shadow-sm border border-[#e4e4e7] dark:border-[#3f3f46]"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#BA4E20] text-white flex items-center justify-center text-xl font-bold font-mono shadow-sm">
                      {initialLetter}
                    </div>
                  )}

                  {isUploadingAvatar && (
                    <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center z-10">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-[#09090b] dark:text-[#f4f4f5]">
                    Foto de Perfil
                  </h4>
                  <p className="text-[11px] text-[#71717a] dark:text-[#a1a1aa] mt-0.5">
                    Envie uma imagem PNG, JPG ou WebP (máx. 5MB).
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-3 py-1.5 bg-white dark:bg-[#27272a] hover:bg-[#f4f4f5] dark:hover:bg-[#3f3f46] border border-[#e4e4e7] dark:border-[#3f3f46] text-[#09090b] dark:text-[#f4f4f5] text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                    isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BA4E20]" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <span>Trocar foto</span>
                  )}
                </button>
              </div>

              {/* Username Input Field (Saved ONLY when modal closes) */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono text-[#71717a] dark:text-[#a1a1aa] uppercase font-semibold mb-1">
                  NOME DE USUÁRIO
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: arq_gustavo"
                  className="w-full bg-[#fafafa] dark:bg-[#121214] border border-[#e4e4e7] dark:border-[#3f3f46] focus:border-[#BA4E20] dark:focus:border-[#BA4E20] text-xs text-[#09090b] dark:text-[#f4f4f5] px-3.5 py-2 rounded-xl focus:outline-none placeholder-[#a1a1aa]"
                />
              </div>

              <hr className="border-[#e4e4e7] dark:border-[#27272a]" />

              {/* Email Edit Form (Side-by-side Input + Button) */}
              <form onSubmit={handleSaveEmail} className="space-y-2">
                <label className="block text-[11px] font-mono text-[#71717a] dark:text-[#a1a1aa] uppercase font-semibold mb-1">
                  E-MAIL DA CONTA
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-[#71717a] dark:text-[#a1a1aa] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full pl-9 bg-[#fafafa] dark:bg-[#121214] border border-[#e4e4e7] dark:border-[#3f3f46] focus:border-[#BA4E20] dark:focus:border-[#BA4E20] text-xs text-[#09090b] dark:text-[#f4f4f5] px-3.5 py-2 rounded-xl focus:outline-none placeholder-[#a1a1aa]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingEmail || !email.trim() || email.trim() === user.email}
                    className={`px-3.5 py-2 bg-white dark:bg-[#27272a] hover:bg-[#f4f4f5] dark:hover:bg-[#3f3f46] border border-[#e4e4e7] dark:border-[#3f3f46] text-[#09090b] dark:text-[#f4f4f5] text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                      isSavingEmail || !email.trim() || email.trim() === user.email
                        ? 'opacity-40 cursor-not-allowed'
                        : 'cursor-pointer'
                    }`}
                  >
                    {isSavingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BA4E20]" />}
                    <span>Atualizar e-mail</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#71717a] dark:text-[#a1a1aa] mt-1">
                  Alterações de e-mail exigem confirmação via mensagem de verificação no novo endereço.
                </p>

                {emailStatus && (
                  <div
                    className={`text-xs p-2.5 rounded-lg border flex items-center gap-2 mt-2 ${
                      emailStatus.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400'
                    }`}
                  >
                    <span>{emailStatus.message}</span>
                  </div>
                )}
              </form>

              <hr className="border-[#e4e4e7] dark:border-[#27272a]" />

              {/* Onboarding Preferences Section */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono text-[#71717a] dark:text-[#a1a1aa] uppercase font-semibold mb-1">
                  PREFERÊNCIAS & FUNÇÃO
                </label>
                <div className="p-3 bg-[#fafafa] dark:bg-[#121214] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 text-xs">
                    {user.user_metadata?.onboarding_completo ? (
                      <>
                        <div className="font-semibold text-[#09090b] dark:text-[#f4f4f5]">
                          {user.user_metadata?.funcao === 'Outro'
                            ? user.user_metadata?.funcao_outro || 'Outro'
                            : user.user_metadata?.funcao || 'Não especificado'}
                        </div>
                        <div className="text-[11px] text-[#71717a] dark:text-[#a1a1aa] truncate mt-0.5">
                          {Array.isArray(user.user_metadata?.objetivo_principal)
                            ? user.user_metadata.objetivo_principal.join(', ')
                            : 'Sem objetivos cadastrados'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-[#09090b] dark:text-[#f4f4f5]">
                          Perfil de uso incompleto
                        </div>
                        <div className="text-[11px] text-[#71717a] dark:text-[#a1a1aa] mt-0.5">
                          Configure sua função e objetivos para personalizar sua experiência.
                        </div>
                      </>
                    )}
                  </div>

                  {onOpenOnboarding && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenOnboarding();
                      }}
                      className="px-3 py-1.5 bg-white dark:bg-[#27272a] hover:bg-[#f4f4f5] dark:hover:bg-[#3f3f46] border border-[#e4e4e7] dark:border-[#3f3f46] text-[#09090b] dark:text-[#f4f4f5] text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      {user.user_metadata?.onboarding_completo ? 'Refazer onboarding' : 'Completar onboarding'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
