'use client';

import React, { useState } from 'react';
import { LogIn, LogOut, Settings, MoreVertical } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { AnimatePresence, motion } from 'framer-motion';

interface AuthPanelProps {
  user: User | null;
  isLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
}

/**
 * Profile area at the bottom of the file Sidebar.
 * Clicking opens a popover menu with "Configurações" and "Sair".
 */
export function AuthPanel({
  user,
  isLoading,
  onSignIn,
  onSignOut,
  onOpenSettings,
}: AuthPanelProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-3 border-t border-[#e4e4e7] dark:border-[#27272a] text-[11px] font-mono text-[#71717a] dark:text-[#a1a1aa]">
        Verificando sessão...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-3 border-t border-[#e4e4e7] dark:border-[#27272a]">
        <button
          onClick={onSignIn}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-[#27272a] hover:bg-[#fdf5f2] dark:hover:bg-[#3f3f46] border border-[#e4e4e7] dark:border-[#3f3f46] hover:border-[#BA4E20]/50 text-[#09090b] dark:text-[#f4f4f5] hover:text-[#BA4E20] text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Entrar</span>
        </button>
      </div>
    );
  }

  const username = (user.user_metadata?.username as string) || user.email?.split('@')[0] || 'Usuário';
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const initialLetter = username.charAt(0).toUpperCase();

  return (
    <div className="p-3 border-t border-[#e4e4e7] dark:border-[#27272a] relative">
      {/* Profile Card Trigger */}
      <div
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center justify-between gap-2 p-1.5 -mx-1 rounded-xl hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] transition-colors cursor-pointer select-none group"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              className="w-7 h-7 rounded-full object-cover shrink-0 shadow-2xs border border-[#e4e4e7] dark:border-[#3f3f46]"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#BA4E20] text-white flex items-center justify-center text-xs font-bold font-mono shrink-0 shadow-2xs">
              {initialLetter}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#09090b] dark:text-[#f4f4f5] truncate">
              {username}
            </div>
            <div className="text-[10px] text-[#71717a] dark:text-[#a1a1aa] truncate font-mono">
              {user.email}
            </div>
          </div>
        </div>

        <div className="p-1 rounded-lg text-[#71717a] dark:text-[#a1a1aa] group-hover:text-[#09090b] dark:group-hover:text-[#f4f4f5] shrink-0">
          <MoreVertical className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Profile Dropdown Popover */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <div
              key="profile-menu-backdrop"
              className="fixed inset-0 z-40"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              key="profile-menu-popover"
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="absolute left-3 right-3 bottom-full mb-2 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-xl z-50 py-1 font-sans text-xs overflow-hidden"
            >
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-[#fdf5f2] dark:hover:bg-[#27272a] text-[#09090b] dark:text-[#f4f4f5] hover:text-[#BA4E20] dark:hover:text-[#BA4E20] transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-[#BA4E20]" />
                <span className="font-medium">Configurações</span>
              </button>

              <div className="my-1 border-t border-[#e4e4e7] dark:border-[#27272a]" />

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onSignOut();
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span className="font-medium">Sair</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
