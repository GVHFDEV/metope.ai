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
      <div className="p-3 border-t border-[#e4e4e7] text-[11px] font-mono text-[#71717a]">
        Verificando sessão...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-3 border-t border-[#e4e4e7]">
        <button
          onClick={onSignIn}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-[#fdf5f2] border border-[#e4e4e7] hover:border-[#BA4E20]/50 text-[#09090b] hover:text-[#BA4E20] text-xs font-medium rounded-lg transition-colors"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Entrar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 border-t border-[#e4e4e7] flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-full bg-[#f4f4f5] border border-[#e4e4e7] flex items-center justify-center flex-shrink-0">
          <UserIcon className="w-3.5 h-3.5 text-[#71717a]" />
        </div>
        <span className="text-xs text-[#09090b] truncate" title={user.email ?? ''}>
          {user.email}
        </span>
      </div>
      <button
        onClick={onSignOut}
        title="Sair"
        className="p-1.5 hover:bg-[#e4e4e7] rounded-md text-[#71717a] hover:text-[#BA4E20] transition-colors flex-shrink-0"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
