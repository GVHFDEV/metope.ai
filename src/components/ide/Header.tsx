'use client';

import React, { useState } from 'react';
import { Project } from '@/types';
import { Folder, Plus, ChevronDown, Check, Layers, Cpu } from 'lucide-react';

interface HeaderProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (project: Project) => void;
  onOpenNewProjectModal: () => void;
}

export function Header({
  projects,
  activeProject,
  onSelectProject,
  onOpenNewProjectModal,
}: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="h-14 bg-[#0c0c0e] border-b border-[#27272a] px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Project Switcher */}
      <div className="flex items-center gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 pr-4 border-r border-[#27272a]">
          <div className="w-7 h-7 bg-[#18181b] border border-[#3f3f46] flex items-center justify-center rounded-sm">
            <Layers className="w-4 h-4 text-[#f4f4f5]" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-wider text-[#f4f4f5]">
            METOPE <span className="text-[#a1a1aa] font-normal text-xs">AI</span>
          </span>
        </div>

        {/* Project Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#121215] hover:bg-[#1c1c21] border border-[#27272a] rounded-sm text-xs font-medium text-[#f4f4f5] transition-colors"
          >
            <Folder className="w-3.5 h-3.5 text-[#a1a1aa]" />
            <span className="max-w-[200px] truncate">
              {activeProject ? activeProject.name : 'Selecionar Projeto'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#71717a] ml-1" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1 w-72 bg-[#121215] border border-[#27272a] rounded-sm shadow-2xl z-50 py-1">
                <div className="px-3 py-1.5 border-b border-[#27272a] flex items-center justify-between text-[11px] font-mono text-[#71717a]">
                  <span>PROJETOS REGISTRADOS</span>
                  <span>{projects.length} TOTAL</span>
                </div>

                <div className="max-h-60 overflow-y-auto py-1">
                  {projects.map((proj) => {
                    const isSelected = activeProject?.id === proj.id;
                    return (
                      <button
                        key={proj.id}
                        onClick={() => {
                          onSelectProject(proj);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-[#27272a] text-[#f4f4f5]'
                            : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#f4f4f5]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-medium truncate">{proj.name}</div>
                          {proj.category && (
                            <div className="text-[10px] font-mono text-[#71717a]">
                              {proj.category}
                            </div>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#f4f4f5] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="p-1.5 border-t border-[#27272a]">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenNewProjectModal();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#18181b] hover:bg-[#27272a] border border-[#3f3f46] text-[#f4f4f5] text-xs rounded-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Projeto</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Controls & Meta Status */}
      <div className="flex items-center gap-3">
        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#121215] border border-[#27272a] rounded-sm text-[11px] font-mono text-[#a1a1aa]">
          <Cpu className="w-3 h-3 text-[#a1a1aa]" />
          <span>COPILOT IDE</span>
        </div>

        {/* Create Project Quick Button */}
        <button
          onClick={onOpenNewProjectModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f4f4f5] hover:bg-[#e4e4e7] text-[#09090b] font-medium text-xs rounded-sm transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Criar Projeto</span>
        </button>
      </div>
    </header>
  );
}
