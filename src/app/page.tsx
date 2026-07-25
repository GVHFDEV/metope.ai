'use client';

import { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { signOut as authSignOut } from '@/lib/auth';
import { Project, ProjectFile, ChatMessage, QuickActionType, IDETab, FloorPlanData, Conversation } from '@/types';
import { StorageService } from '@/lib/storage';
import { Sidebar } from '@/components/ide/Sidebar';
import { ChatPanel } from '@/components/ide/ChatPanel';
import { FilePreviewModal } from '@/components/ide/FilePreviewModal';
import { ProjectModal } from '@/components/ide/ProjectModal';
import { AuthModal } from '@/components/ide/AuthModal';
import { FloorPlanCanvas } from '@/components/ide/FloorPlanCanvas';
import { ProjectFilesManager } from '@/components/ide/ProjectFilesManager';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Track auth state via Supabase's own listener
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setIsAuthLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const isAuthenticated = user !== null;

  // Workspace Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Central View Mode
  const [isProjectFilesViewOpen, setIsProjectFilesViewOpen] = useState(false);

  // IDE Editor Tabs (Floor Plans / File Editors)
  const [editorTabs, setEditorTabs] = useState<IDETab[]>([]);
  const [activeEditorTabId, setActiveEditorTabId] = useState<string | null>(null);

  const activeEditorTab = editorTabs.find((t) => t.id === activeEditorTabId) || editorTabs[0] || null;
  const hasOpenEditorTabs = editorTabs.length > 0;

  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [migrationNotice, setMigrationNotice] = useState<string | null>(null);
  const pendingMigrationRef = useRef(false);

  // Load Projects and initial state settling
  useEffect(() => {
    async function loadWorkspaceData() {
      const projs = await StorageService.getProjects();
      setProjects(projs);

      if (projs.length > 0) {
        const firstProj = projs[0];
        setActiveProject(firstProj);

        const projectFiles = await StorageService.getProjectFiles(firstProj.id);
        setFiles(projectFiles);

        const projectConvs = await StorageService.getConversations(firstProj.id);
        setConversations(projectConvs);

        if (projectConvs.length > 0) {
          const firstConv = projectConvs[0];
          setActiveConversationId(firstConv.id);
          const msgs = await StorageService.getConversationMessages(firstConv.id);
          setMessages(msgs);
        } else {
          const newConv = await StorageService.createConversation(firstProj.id, 'Layout Inicial');
          setConversations([newConv]);
          setActiveConversationId(newConv.id);
          setMessages([]);
        }
      } else {
        setActiveProject(null);
        setConversations([]);
        setActiveConversationId(null);
        setFiles([]);
        setMessages([]);
      }
    }
    loadWorkspaceData();
  }, [isAuthenticated]);

  // Account Migration effect
  useEffect(() => {
    if (!isAuthenticated || !pendingMigrationRef.current) return;
    pendingMigrationRef.current = false;

    async function migrate() {
      const migratedCount = await StorageService.migrateSessionProjectsToAccount();
      const projs = await StorageService.getProjects();
      setProjects(projs);
      if (projs.length > 0) {
        setActiveProject(projs[0]);
      }
      if (migratedCount > 0) {
        setMigrationNotice(
          `${migratedCount} projeto${migratedCount > 1 ? 's' : ''} importado${migratedCount > 1 ? 's' : ''} para sua conta.`,
        );
        setTimeout(() => setMigrationNotice(null), 5000);
      }
    }
    migrate();
  }, [isAuthenticated]);

  const handleSignedUp = () => {
    pendingMigrationRef.current = true;
  };

  const handleSignOut = async () => {
    await authSignOut();
  };

  // Handle Project Selection from Tree
  const handleSelectProject = async (project: Project) => {
    setActiveProject(project);
    setIsProjectFilesViewOpen(false);

    const projectFiles = await StorageService.getProjectFiles(project.id);
    setFiles(projectFiles);

    const projectConvs = await StorageService.getConversations(project.id);
    setConversations(projectConvs);

    if (projectConvs.length > 0) {
      setActiveConversationId(projectConvs[0].id);
      const msgs = await StorageService.getConversationMessages(projectConvs[0].id);
      setMessages(msgs);
    } else {
      const newConv = await StorageService.createConversation(project.id, 'Layout Inicial');
      setConversations([newConv]);
      setActiveConversationId(newConv.id);
      setMessages([]);
    }
  };

  // Handle Conversation Selection from Tree
  const handleSelectConversation = async (conversation: Conversation) => {
    setActiveConversationId(conversation.id);
    setIsProjectFilesViewOpen(false);
    const msgs = await StorageService.getConversationMessages(conversation.id);
    setMessages(msgs);
  };

  // Handle "Novo Chat" Action (Zero-Friction Flow)
  const handleNewChat = async (targetProjectId?: string) => {
    setIsProjectFilesViewOpen(false);
    const projId = targetProjectId || activeProject?.id;

    if (projId) {
      const projConvs = conversations.filter((c) => c.project_id === projId);
      const title = `Conversa ${projConvs.length + 1}`;
      const newConv = await StorageService.createConversation(projId, title);
      setConversations((prev) => [...prev, newConv]);
      setActiveConversationId(newConv.id);
      setMessages([]);
    } else {
      // Clear active selection so sending first message creates Project + Conversation
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  // Handle Project File Manager View Trigger
  const handleOpenProjectFiles = (project: Project) => {
    setActiveProject(project);
    setIsProjectFilesViewOpen(true);
  };

  // Handle Project Creation Modal
  const handleCreateProject = async (
    name: string,
    description?: string,
    category?: Project['category']
  ) => {
    const newProj = await StorageService.createProject(name, description, category);
    setProjects((prev) => [newProj, ...prev]);
    setActiveProject(newProj);
    
    const newConv = await StorageService.createConversation(newProj.id, 'Layout Inicial');
    setConversations((prev) => [...prev, newConv]);
    setActiveConversationId(newConv.id);
    setMessages([]);
    setFiles([]);
  };

  // Handle Project Update / Rename
  const handleUpdateProject = async (
    id: string,
    name: string,
    description?: string,
    category?: Project['category']
  ) => {
    const updated = await StorageService.updateProject(id, { name, description, category });
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    setActiveProject((prev) => (prev?.id === id ? updated : prev));
  };

  // Handle Project Deletion
  const handleDeleteProject = async (id: string) => {
    await StorageService.deleteProject(id);
    setProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (activeProject?.id === id) {
        const nextActive = remaining.length > 0 ? remaining[0] : null;
        setActiveProject(nextActive);
        if (!nextActive) {
          setConversations([]);
          setActiveConversationId(null);
          setFiles([]);
          setMessages([]);
        }
      }
      return remaining;
    });
  };

  // Handle Conversation Rename & Deletion
  const handleRenameConversation = async (convId: string, newTitle: string) => {
    await StorageService.renameConversation(convId, newTitle);
    setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c)));
  };

  const handleDeleteConversation = async (convId: string) => {
    await StorageService.deleteConversation(convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConversationId === convId) {
      const remaining = conversations.filter((c) => c.id !== convId);
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
        const msgs = await StorageService.getConversationMessages(remaining[0].id);
        setMessages(msgs);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    }
  };

  // Handle Shared Project File Uploads (NotebookLM Style)
  const handleFileUpload = async (uploadFiles: FileList | File[]) => {
    if (!activeProject) return;
    setIsUploading(true);

    try {
      const fileArray = Array.from(uploadFiles);
      const uploadedResults: ProjectFile[] = [];

      for (const f of fileArray) {
        const savedFile = await StorageService.uploadFile(activeProject.id, f);
        uploadedResults.push(savedFile);
      }

      setFiles((prev) => [...prev, ...uploadedResults]);
    } catch (err) {
      console.error('Error uploading files:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreviewFile = (file: ProjectFile) => {
    if (file.type === 'floorplan' && file.content_text) {
      try {
        const floorPlanData: FloorPlanData = JSON.parse(file.content_text);
        const tabId = `tab-fp-${file.id}`;
        const newTab: IDETab = {
          id: tabId,
          title: file.name.replace(/\.json$/i, ''),
          type: 'floorplan',
          fileId: file.id,
          floorPlanData,
        };
        setEditorTabs((prev) => [...prev.filter((t) => t.id !== tabId), newTab]);
        setActiveEditorTabId(tabId);
        return;
      } catch (err) {
        console.warn('Falha ao abrir planta no canvas:', err);
      }
    }
    setPreviewFile(file);
  };

  const handleDeleteFile = async (fileId: string) => {
    await StorageService.deleteFile(fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setEditorTabs((prev) => {
      const remaining = prev.filter((t) => t.fileId !== fileId);
      if (activeEditorTabId === `tab-fp-${fileId}`) {
        setActiveEditorTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
      return remaining;
    });
    if (previewFile?.id === fileId) {
      setPreviewFile(null);
    }
  };

  // Handle Chat Messaging (Zero-Friction + Shared Files)
  const handleSendMessage = async (
    userPrompt: string,
    actionType: QuickActionType | 'general' = 'general',
    forceSearch: boolean = false,
    forceThinking: boolean = false,
  ) => {
    if (isLoadingAi) return;

    let targetProject = activeProject;
    let targetConversationId = activeConversationId;

    // 1. Zero-Friction: Auto-create Project if none exists
    if (!targetProject) {
      targetProject = await StorageService.createProject('Novo Projeto');
      setProjects((prev) => [targetProject!, ...prev]);
      setActiveProject(targetProject);
      setFiles([]);
    }

    // 2. Zero-Friction: Auto-create Conversation if none active
    if (!targetConversationId) {
      const newConv = await StorageService.createConversation(targetProject.id, 'Layout Inicial');
      setConversations((prev) => [...prev, newConv]);
      targetConversationId = newConv.id;
      setActiveConversationId(newConv.id);
    }

    let displayPrompt = userPrompt;
    if (!userPrompt && actionType !== 'general') {
      if (actionType === 'summary') displayPrompt = 'Resumir projeto';
      if (actionType === 'memorial') displayPrompt = 'Gerar memorial descritivo';
      if (actionType === 'layout_analysis') displayPrompt = 'Analisar layout';
      if (actionType === 'generate_floorplan') displayPrompt = 'Gerar planta baixa';
    }

    // Auto-rename conversation based on user's first message if title is default
    if (targetConversationId && displayPrompt) {
      const currentConv = conversations.find((c) => c.id === targetConversationId);
      if (
        !currentConv ||
        currentConv.title === 'Nova Conversa' ||
        currentConv.title === 'Layout Inicial' ||
        /^Conversa \d+$/i.test(currentConv.title)
      ) {
        const generatedTitle =
          displayPrompt.trim().slice(0, 26) + (displayPrompt.trim().length > 26 ? '...' : '');
        if (generatedTitle) {
          handleRenameConversation(targetConversationId, generatedTitle);
        }
      }
    }

    const optimisticUserMsg: ChatMessage = {
      id: 'pending-' + Date.now(),
      conversation_id: targetConversationId,
      project_id: targetProject.id,
      role: 'user',
      content: displayPrompt,
      action_type: actionType,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    setIsLoadingAi(true);

    try {
      const { userMessage, assistantMessage } = await StorageService.sendChat(
        targetProject.id,
        targetConversationId,
        displayPrompt,
        actionType,
        files, // Pass shared project files as context (NotebookLM style)
        forceSearch,
        forceThinking,
      );
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUserMsg.id),
        userMessage,
        assistantMessage,
      ]);

      // Check if response contains a generated floor plan payload
      const fpMatch = assistantMessage.content.match(/```floorplan_data\s*([\s\S]*?)\s*```/);
      if (fpMatch) {
        try {
          const floorPlanData: FloorPlanData = JSON.parse(fpMatch[1]);
          const fileName = `${floorPlanData.title || 'Planta Baixa'}.json`;
          const savedFile = await StorageService.createFloorPlanFile(targetProject.id, fileName, floorPlanData);
          setFiles((prev) => [...prev, savedFile]);

          const tabId = `tab-fp-${savedFile.id}`;
          const newTab: IDETab = {
            id: tabId,
            title: floorPlanData.title || 'Planta Baixa',
            type: 'floorplan',
            fileId: savedFile.id,
            floorPlanData,
          };
          setEditorTabs((prev) => [...prev.filter((t) => t.id !== tabId), newTab]);
          setActiveEditorTabId(tabId);
        } catch (e) {
          console.warn('Erro ao abrir aba de planta baixa:', e);
        }
      }
    } catch (err) {
      console.error('Erro ao processar o chat:', err);
      const errorMsg: ChatMessage = {
        id: 'error-' + Date.now(),
        conversation_id: targetConversationId,
        project_id: targetProject.id,
        role: 'assistant',
        content:
          'Não foi possível gerar parecer técnico no momento. ' +
          (err instanceof Error ? err.message : ''),
        action_type: actionType,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Theme state ('light' | 'dark') with localStorage persistence
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('metope_theme') as 'light' | 'dark';
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('metope_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="h-screen max-h-screen w-screen max-w-full bg-white dark:bg-[#121214] text-[#09090b] dark:text-[#f4f4f5] flex font-sans overflow-hidden transition-colors">
      {/* Left Sidebar (Tree Explorer + Auth Control) */}
      <Sidebar
        projects={projects}
        activeProject={activeProject}
        conversations={conversations}
        activeConversationId={activeConversationId}
        files={files}
        onSelectProject={handleSelectProject}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onOpenProjectFiles={handleOpenProjectFiles}
        onOpenNewProjectModal={() => {
          setProjectToRename(null);
          setIsProjectModalOpen(true);
        }}
        onEditProject={(proj) => {
          setProjectToRename(proj);
          setIsProjectModalOpen(true);
        }}
        onDeleteProject={handleDeleteProject}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onUpload={handleFileUpload}
        onDeleteFile={handleDeleteFile}
        onPreviewFile={handlePreviewFile}
        isUploading={isUploading}
        user={user}
        isAuthLoading={isAuthLoading}
        onSignIn={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main IDE Content Workspace */}
      <div className="flex-1 flex min-w-0 h-full overflow-hidden relative">
        {migrationNotice && (
          <div className="absolute top-0 left-0 right-0 z-30 px-4 py-2 bg-[#fdf5f2] border-b border-[#BA4E20]/30 text-xs text-[#BA4E20] font-medium shrink-0">
            {migrationNotice}
          </div>
        )}

        {/* Side Panel: Project Files Manager OR Center Canvas */}
        {isProjectFilesViewOpen && activeProject ? (
          <div className="w-[380px] md:w-[420px] lg:w-[440px] shrink-0 flex flex-col h-full overflow-hidden border-r border-[#e4e4e7]">
            <ProjectFilesManager
              project={activeProject}
              files={files}
              onUpload={handleFileUpload}
              onDeleteFile={handleDeleteFile}
              onPreviewFile={handlePreviewFile}
              onClose={() => setIsProjectFilesViewOpen(false)}
              isUploading={isUploading}
            />
          </div>
        ) : hasOpenEditorTabs ? (
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden border-r border-[#e4e4e7]">
            <div className="flex-1 relative min-h-0 overflow-hidden">
              {activeEditorTab?.type === 'floorplan' && activeEditorTab.floorPlanData && (
                <FloorPlanCanvas
                  data={activeEditorTab.floorPlanData}
                  onCloseCanvas={() => {
                    setEditorTabs([]);
                    setActiveEditorTabId(null);
                  }}
                />
              )}
            </div>
          </div>
        ) : null}

        {/* Right / Main Area Column: Chat Panel */}
        <div
          className={
            hasOpenEditorTabs
              ? 'w-[420px] md:w-[460px] lg:w-[480px] shrink-0 flex flex-col h-full bg-white'
              : 'flex-1 flex flex-col min-w-0 h-full'
          }
        >
          <ChatPanel
            projects={projects}
            activeProject={activeProject}
            messages={messages}
            files={files}
            onSelectProject={handleSelectProject}
            onOpenNewProjectModal={() => {
              setProjectToRename(null);
              setIsProjectModalOpen(true);
            }}
            onEditProject={(proj) => {
              setProjectToRename(proj);
              setIsProjectModalOpen(true);
            }}
            onDeleteProject={handleDeleteProject}
            onSendMessage={handleSendMessage}
            isLoading={isLoadingAi}
          />
        </div>
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* Project Creation / Rename Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setProjectToRename(null);
        }}
        onCreateProject={handleCreateProject}
        editingProject={projectToRename}
        onUpdateProject={handleUpdateProject}
      />

      {/* Sign in / Sign up Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignedUp={handleSignedUp}
      />
    </div>
  );
}
