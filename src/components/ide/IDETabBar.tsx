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
  return (
    <div className="h-10 px-3 bg-[#f4f4f5] border-b border-[#e4e4e7] flex items-center gap-1 overflow-x-auto select-none no-scrollbar shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`group h-8 px-3 rounded-t-lg text-xs flex items-center gap-2 border-t border-x transition-all cursor-pointer ${
              isActive
                ? 'bg-white border-[#e4e4e7] text-[#09090b] font-medium shadow-2xs'
                : 'bg-transparent border-transparent text-[#71717a] hover:bg-[#e4e4e7]/50 hover:text-[#09090b]'
            }`}
          >
            {tab.type === 'chat' ? (
              <MessageSquare className={`w-3.5 h-3.5 ${isActive ? 'text-[#BA4E20]' : 'text-[#71717a]'}`} />
            ) : (
              <Layers className={`w-3.5 h-3.5 ${isActive ? 'text-[#BA4E20]' : 'text-[#71717a]'}`} />
            )}
            
            <span className="truncate max-w-[140px]">{tab.title}</span>

            {/* Close button for non-chat tabs */}
            {tab.type !== 'chat' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="p-0.5 hover:bg-[#fdf5f2] rounded text-[#71717a] hover:text-[#BA4E20] opacity-60 group-hover:opacity-100 transition-opacity ml-1"
                title="Fechar aba"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
