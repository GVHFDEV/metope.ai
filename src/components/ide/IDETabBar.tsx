'use client';

import React from 'react';
import { IDETab } from '@/types';
import { MessageSquare, Layers, X } from 'lucide-react';

interface IDETabBarProps {
  tabs: IDETab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export function IDETabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}: IDETabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="h-9 px-2 bg-[#f4f4f5] border-b border-[#e4e4e7] flex items-center gap-1 overflow-x-auto select-none no-scrollbar shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`group h-7 px-3 rounded-t text-xs flex items-center gap-2 border-t-2 border-x transition-all cursor-pointer ${
              isActive
                ? 'bg-white border-t-[#BA4E20] border-x-[#e4e4e7] text-[#09090b] font-medium shadow-2xs'
                : 'bg-[#f4f4f5] border-t-transparent border-x-transparent text-[#71717a] hover:bg-[#e4e4e7]/60 hover:text-[#09090b]'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${isActive ? 'text-[#BA4E20]' : 'text-[#71717a]'}`} />
            <span className="truncate max-w-[160px] font-mono text-[11px]">{tab.title}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className="p-0.5 hover:bg-[#fdf5f2] rounded text-[#71717a] hover:text-[#BA4E20] opacity-60 group-hover:opacity-100 transition-opacity ml-1"
              title="Fechar aba"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
