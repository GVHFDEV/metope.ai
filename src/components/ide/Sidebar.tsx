'use client';

import React, { useRef, useState } from 'react';
import { Project, ProjectFile, Conversation } from '@/types';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileCode,
  Eye,
  Trash2,
  File,
  Search,
  Layers,
  Folder,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Plus,
  Pencil,
  Check,
  MoreVertical,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthPanel } from './AuthPanel';
import type { User } from '@supabase/supabase-js';

interface SidebarProps {
  projects: Project[];
  activeProject: Project | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  files: ProjectFile[];
  onSelectProject: (project: Project) => void;
  onSelectConversation: (conversation: Conversation) => void;
  onNewChat: (projectId?: string) => void;
  onOpenProjectFiles: (project: Project) => void;
  onOpenNewProjectModal: () => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
  onRenameConversation?: (conversationId: string, currentTitle: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
  onUpload: (files: FileList | File[]) => void;
  onDeleteFile: (fileId: string) => void;
  onPreviewFile: (file: ProjectFile) => void;
  isUploading?: boolean;
  user: User | null;
  isAuthLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function Sidebar({
  projects,
  activeProject,
  conversations,
  activeConversationId,
  files,
  onSelectProject,
  onSelectConversation,
  onNewChat,
  onOpenProjectFiles,
  onOpenNewProjectModal,
  onEditProject,
  onDeleteProject,
  onRenameConversation,
  onDeleteConversation,
  onUpload,
  onDeleteFile,
  onPreviewFile,
  isUploading = false,
  user,
  isAuthLoading,
  onSignIn,
  onSignOut,
}: SidebarProps) {
  const [expandedProjectIds, setExpandedProjectIds] = useState<Record<string, boolean>>({});
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingConvTitle, setEditingConvTitle] = useState('');
  
  // Track open 3-dots dropdown menu: 'proj-123' or 'conv-456'
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Toggle Project Expansion in Tree
  const toggleProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjectIds((prev) => ({
      ...prev,
      [projectId]: prev[projectId] === undefined ? true : !prev[projectId],
    }));
  };

  const handleStartRenameConv = (conv: Conversation) => {
    setEditingConvId(conv.id);
    setEditingConvTitle(conv.title);
    setActiveMenuId(null);
  };

  const handleSaveRenameConv = (convId: string) => {
    if (editingConvTitle.trim()) {
      onRenameConversation?.(convId, editingConvTitle.trim());
    }
    setEditingConvId(null);
  };

  return (
    <aside className="w-72 bg-[#f8f9fa] border-r border-[#e4e4e7] flex flex-col h-screen select-none font-sans text-[#09090b] shrink-0">
      {/* Top Header: Logo SVG */}
      <div className="px-4.5 py-4 border-b border-[#e4e4e7] flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Metope AI"
            className="h-4.5 w-auto object-contain"
          />
        </div>
      </div>

      {/* New Chat Primary Action Button */}
      <div className="p-3 border-b border-[#e4e4e7] bg-white shrink-0">
        <button
          onClick={() => onNewChat(activeProject?.id)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#BA4E20] hover:bg-[#9c3f19] text-white text-xs font-semibold rounded-lg transition-all shadow-2xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Chat</span>
        </button>
      </div>

      {/* Main Tree Explorer Section */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar select-none">
        <div className="px-2 py-1.5 text-[10px] font-mono font-semibold text-[#71717a] uppercase tracking-wider flex items-center justify-between">
          <span>ESPAÇO DE TRABALHO</span>
          <button
            onClick={onOpenNewProjectModal}
            className="p-0.5 hover:bg-[#e4e4e7] rounded text-[#71717a] hover:text-[#BA4E20] transition-colors cursor-pointer"
            title="Criar Novo Projeto"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tree View */}
        {projects.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#71717a] italic">
            Nenhum projeto no espaço de trabalho. Clique em &quot;Novo Chat&quot; para iniciar.
          </div>
        ) : (
          projects.map((proj) => {
            const isProjectActive = activeProject?.id === proj.id;
            const isExpanded = expandedProjectIds[proj.id] !== false; // expanded by default
            const projectConversations = conversations.filter((c) => c.project_id === proj.id);
            const menuKeyProj = `proj-${proj.id}`;
            const isProjMenuOpen = activeMenuId === menuKeyProj;

            return (
              <div key={proj.id} className="space-y-0.5">
                {/* Project Header Node */}
                <div
                  onClick={() => onSelectProject(proj)}
                  className={`group relative px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isProjectActive
                      ? 'bg-[#fdf5f2] text-[#09090b] font-semibold'
                      : 'hover:bg-[#e4e4e7]/60 text-[#27272a]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <button
                      onClick={(e) => toggleProject(proj.id, e)}
                      className="p-0.5 hover:bg-[#e4e4e7] rounded text-[#71717a] shrink-0 cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <Folder className="w-3.5 h-3.5 text-[#BA4E20] shrink-0" />
                    <span className="truncate">{proj.name}</span>
                  </div>

                  {/* 3-Dots Dropdown Trigger Button */}
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isProjMenuOpen ? null : menuKeyProj);
                      }}
                      className={`p-1 rounded text-[#71717a] hover:text-[#09090b] transition-colors cursor-pointer ${
                        isProjMenuOpen ? 'bg-[#e4e4e7]' : 'hidden group-hover:block'
                      }`}
                      title="Opções do projeto"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Project 3-Dots Popover Menu */}
                    <AnimatePresence>
                      {isProjMenuOpen && (
                        <>
                          <div
                            key="proj-backdrop"
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                            }}
                          />
                          <motion.div
                            key="proj-popover"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-0 top-full mt-1 w-36 bg-white border border-[#e4e4e7] rounded-lg shadow-lg z-50 py-1 font-normal text-xs"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                onNewChat(proj.id);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[#fdf5f2] hover:text-[#BA4E20] flex items-center gap-2 text-[#09090b]"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#BA4E20]" />
                              <span>Nova conversa</span>
                            </button>
                            {onEditProject && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  onEditProject(proj);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-[#f8f9fa] flex items-center gap-2 text-[#09090b]"
                              >
                                <Pencil className="w-3.5 h-3.5 text-[#71717a]" />
                                <span>Renomear</span>
                              </button>
                            )}
                            {onDeleteProject && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  onDeleteProject(proj.id);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-[#fdf5f2] text-red-600 flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                <span>Apagar</span>
                              </button>
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Sub-Tree (Conversations + Files) */}
                {isExpanded && (
                  <div className="pl-6 space-y-0.5 border-l-2 border-[#e4e4e7] ml-3.5 py-0.5">
                    {/* Conversations Sub-Nodes */}
                    {projectConversations.map((conv) => {
                      const isConvActive = activeConversationId === conv.id;
                      const isEditing = editingConvId === conv.id;
                      const menuKeyConv = `conv-${conv.id}`;
                      const isConvMenuOpen = activeMenuId === menuKeyConv;

                      if (isEditing) {
                        return (
                          <div
                            key={conv.id}
                            className="flex items-center gap-1 px-2 py-1 bg-white border border-[#BA4E20] rounded-md text-xs"
                          >
                            <input
                              type="text"
                              value={editingConvTitle}
                              onChange={(e) => setEditingConvTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRenameConv(conv.id);
                                if (e.key === 'Escape') setEditingConvId(null);
                              }}
                              className="flex-1 bg-transparent text-xs text-[#09090b] focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRenameConv(conv.id)}
                              className="p-0.5 text-[#BA4E20] hover:bg-[#fdf5f2] rounded cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={conv.id}
                          onClick={() => {
                            onSelectProject(proj);
                            onSelectConversation(conv);
                          }}
                          className={`group relative px-2 py-1 rounded-md text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isConvActive
                              ? 'bg-white border border-[#e4e4e7] text-[#BA4E20] font-semibold shadow-2xs'
                              : 'hover:bg-[#e4e4e7]/40 text-[#52525b] hover:text-[#09090b]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isConvActive ? 'text-[#BA4E20]' : 'text-[#71717a]'}`} />
                            <span className="truncate">{conv.title}</span>
                          </div>

                          {/* 3-Dots Dropdown Trigger Button */}
                          <div className="relative shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(isConvMenuOpen ? null : menuKeyConv);
                              }}
                              className={`p-1 rounded text-[#71717a] hover:text-[#09090b] transition-colors cursor-pointer ${
                                isConvMenuOpen ? 'bg-[#e4e4e7]' : 'hidden group-hover:block'
                              }`}
                              title="Opções da conversa"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Conversation 3-Dots Popover Menu */}
                            <AnimatePresence>
                              {isConvMenuOpen && (
                                <>
                                  <div
                                    key="conv-backdrop"
                                    className="fixed inset-0 z-40"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(null);
                                    }}
                                  />
                                  <motion.div
                                    key="conv-popover"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute right-0 top-full mt-1 w-32 bg-white border border-[#e4e4e7] rounded-lg shadow-lg z-50 py-1 font-normal text-xs"
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartRenameConv(conv);
                                      }}
                                      className="w-full px-3 py-1.5 text-left hover:bg-[#f8f9fa] flex items-center gap-2 text-[#09090b]"
                                    >
                                      <Pencil className="w-3.5 h-3.5 text-[#71717a]" />
                                      <span>Renomear</span>
                                    </button>
                                    {onDeleteConversation && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuId(null);
                                          onDeleteConversation(conv.id);
                                        }}
                                        className="w-full px-3 py-1.5 text-left hover:bg-[#fdf5f2] text-red-600 flex items-center gap-2"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                        <span>Apagar</span>
                                      </button>
                                    )}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}

                    {/* Shared Project Files Node */}
                    <div
                      onClick={() => {
                        onSelectProject(proj);
                        onOpenProjectFiles(proj);
                      }}
                      className="group px-2 py-1 rounded-md text-xs flex items-center gap-2 text-[#71717a] hover:text-[#09090b] hover:bg-[#e4e4e7]/40 cursor-pointer font-mono text-[11px]"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#BA4E20] shrink-0" />
                      <span className="truncate">Arquivos do Projeto</span>
                      <span className="ml-auto text-[10px] bg-white border border-[#e4e4e7] px-1.5 py-0.2 rounded-full font-bold text-[#BA4E20]">
                        {isProjectActive ? files.length : '📁'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Account / Auth Bar Fixed at Bottom */}
      <AuthPanel
        user={user}
        isLoading={isAuthLoading}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />
    </aside>
  );
}
