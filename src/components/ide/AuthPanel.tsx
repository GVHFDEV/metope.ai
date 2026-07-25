'use client';

import React from 'react';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface AuthPanelProps {
  user: User | null;
  isLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

/**
 * Fixed footer block at the bottom of the file Sidebar. Discreet: user
 * name/email + logout icon when signed in, a plain "Entrar" button when
 * anonymous. No badges, gradients or avatars beyond a simple line icon.
 */
export function AuthPanel({ user, isLoading, onSignIn, onSignOut }: AuthPanelProps) {
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
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-[#27272a] hover:bg-[#fdf5f2] dark:hover:bg-[#3f3f46] border border-[#e4e4e7] dark:border-[#3f3f46] hover:border-[#BA4E20]/50 text-[#09090b] dark:text-[#f4f4f5] hover:text-[#BA4E20] text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Entrar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 border-t border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-full bg-[#f4f4f5] dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-3.5 h-3.5 text-[#71717a] dark:text-[#a1a1aa]" />
        </div>
        <span className="text-xs text-[#09090b] dark:text-[#f4f4f5] truncate" title={user.email ?? ''}>
          {user.email}
        </span>
      </div>
      <button
        onClick={onSignOut}
        title="Sair"
        className="p-1.5 hover:bg-[#e4e4e7] dark:hover:bg-[#27272a] rounded-md text-[#71717a] dark:text-[#a1a1aa] hover:text-[#BA4E20] transition-colors flex-shrink-0 cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
