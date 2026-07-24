'use client';

import React from 'react';
import { QuickActionType } from '@/types';
import { FileText, FileCode, Layers, Zap } from 'lucide-react';

interface QuickActionsProps {
  onExecuteAction: (actionType: QuickActionType) => void;
  disabled?: boolean;
}

export function QuickActions({ onExecuteAction, disabled = false }: QuickActionsProps) {
  const actions: { id: QuickActionType; label: string; icon: React.ReactNode; tooltip: string }[] = [
    {
      id: 'summary',
      label: 'Resumir projeto',
      icon: <FileText className="w-3.5 h-3.5" />,
      tooltip: 'Sintetiza ficha técnica, documentos e plantas do projeto ativo.',
    },
    {
      id: 'memorial',
      label: 'Gerar memorial descritivo',
      icon: <FileCode className="w-3.5 h-3.5" />,
      tooltip: 'Gera minuta técnica formal de memorial descritivo da edificação.',
    },
    {
      id: 'layout_analysis',
      label: 'Analisar layout',
      icon: <Layers className="w-3.5 h-3.5" />,
      tooltip: 'Avalia fluxos de circulação, insolação e setorização das plantas.',
    },
  ];

  return (
    <div className="px-4 py-2.5 bg-[#0c0c0e] border-b border-[#27272a] flex items-center justify-between gap-3 select-none flex-wrap">
      <div className="flex items-center gap-1.5 text-xs font-mono text-[#a1a1aa]">
        <Zap className="w-3.5 h-3.5 text-[#f4f4f5]" />
        <span>ATALHOS DE ANÁLISE RÁPIDA:</span>
      </div>

      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            disabled={disabled}
            onClick={() => onExecuteAction(action.id)}
            title={action.tooltip}
            className={`flex items-center gap-2 px-3 py-1.5 bg-[#18181b] hover:bg-[#27272a] active:bg-[#3f3f46] border border-[#27272a] hover:border-[#3f3f46] text-[#f4f4f5] text-xs font-medium rounded-sm transition-colors ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
