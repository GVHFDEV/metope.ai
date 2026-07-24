'use client';

import { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { signOut as authSignOut } from '@/lib/auth';
import { Project, ProjectFile, ChatMessage, QuickActionType } from '@/types';
import { StorageService } from '@/lib/storage';
import { Sidebar } from '@/components/ide/Sidebar';
import { ChatPanel } from '@/components/ide/ChatPanel';
import { FilePreviewModal } from '@/components/ide/FilePreviewModal';
import { ProjectModal } from '@/components/ide/ProjectModal';
import { AuthModal } from '@/components/ide/AuthModal';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Track auth state via Supabase's own listener -- covers initial load,
  // sign-in, sign-out and token refresh in one place.
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

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  // Project being renamed in the modal (set when auto-created from a message
  // sent with no active project). Null means the modal is in "create" mode.
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [migrationNotice, setMigrationNotice] = useState<string | null>(null);
  // Set right after a successful sign-up so the migration effect (below)
  // knows to run exactly once for this session.
  const pendingMigrationRef = useRef(false);
  // Set right before setActiveProject() when we already know the new
  // project's files/messages are empty (just created it) -- prevents the
  // project-change effect below from re-fetching and wiping out the
  // optimistic message + AI reply that handleSendMessage is about to set.
  const skipNextProjectLoadRef = useRef(false);

  // (Re)load projects whenever auth state settles -- covers first mount and
  // every sign-in/sign-out transition. RLS on the `projects` table means this
  // naturally returns either the anonymous session's rows or the logged-in
  // user's rows, whichever applies.
  useEffect(() => {
    async function loadProjects() {
      const projs = await StorageService.getProjects();
      setProjects(projs);
      setActiveProject(projs.length > 0 ? projs[0] : null);
      if (projs.length === 0) {
        setFiles([]);
        setMessages([]);
      }
    }
    loadProjects();
  }, [isAuthenticated]);

  // Runs the local -> account migration once right after a sign-up.
  useEffect(() => {
    if (!isAuthenticated || !pendingMigrationRef.current) return;
    pendingMigrationRef.current = false;

    async function migrate() {
      const migratedCount = await StorageService.migrateSessionProjectsToAccount();
      const projs = await StorageService.getProjects();
      setProjects(projs);
      setActiveProject(projs.length > 0 ? projs[0] : null);
      if (migratedCount > 0) {
        setMigrationNotice(
          `${migratedCount} projeto${migratedCount > 1 ? 's' : ''} importado${migratedCount > 1 ? 's' : ''} para sua conta.`,
        );
        setTimeout(() => setMigrationNotice(null), 5000);
      }
    }
    migrate();
  }, [isAuthenticated]);

  // Called by AuthModal right after a successful sign-up (not sign-in).
  const handleSignedUp = () => {
    pendingMigrationRef.current = true;
  };

  const handleSignOut = async () => {
    await authSignOut();
  };

  // Load Files and Messages whenever Active Project Changes
  useEffect(() => {
    if (!activeProject) return;
    if (skipNextProjectLoadRef.current) {
      skipNextProjectLoadRef.current = false;
      return;
    }

    async function loadProjectData() {
      if (!activeProject) return;
      const projectFiles = await StorageService.getProjectFiles(activeProject.id);
      const projectMessages = await StorageService.getProjectMessages(activeProject.id);
      setFiles(projectFiles);
      setMessages(projectMessages);
    }
    loadProjectData();
  }, [activeProject]);

  // Handle Project Selection
  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
  };

  // Handle Project Creation
  const handleCreateProject = async (
    name: string,
    description?: string,
    category?: Project['category']
  ) => {
    const newProj = await StorageService.createProject(name, description, category);
    setProjects((prev) => [newProj, ...prev]);
    setActiveProject(newProj);
  };

  // Handle Project Rename/Update (used for the auto-created project modal)
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
          setFiles([]);
          setMessages([]);
        }
      }
      return remaining;
    });
  };

  // Handle File Uploads
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

  // Handle File Deletion
  const handleDeleteFile = async (fileId: string) => {
    await StorageService.deleteFile(fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (previewFile?.id === fileId) {
      setPreviewFile(null);
    }
  };

  // Handle Chat Messaging & Quick Action Execution
  const handleSendMessage = async (
    userPrompt: string,
    actionType: QuickActionType | 'general' = 'general'
  ) => {
    if (isLoadingAi) return;

    // No project yet: auto-create one so the message has somewhere to live,
    // and pop the rename modal (non-blocking) so the user can name it while
    // the message is already sending.
    let targetProject = activeProject;
    if (!targetProject) {
      targetProject = await StorageService.createProject('Novo Projeto');
      setProjects((prev) => [targetProject!, ...prev]);
      skipNextProjectLoadRef.current = true;
      setActiveProject(targetProject);
      setMessages([]);
      setFiles([]);
      setProjectToRename(targetProject);
      setIsProjectModalOpen(true);
    }

    let displayPrompt = userPrompt;
    if (!userPrompt && actionType !== 'general') {
      if (actionType === 'summary') displayPrompt = 'Resumir projeto';
      if (actionType === 'memorial') displayPrompt = 'Gerar memorial descritivo';
      if (actionType === 'layout_analysis') displayPrompt = 'Analisar layout';
    }

    // Optimistically show the user's message while the backend processes it.
    const optimisticUserMsg: ChatMessage = {
      id: 'pending-' + Date.now(),
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
        displayPrompt,
        actionType,
        files,
      );
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUserMsg.id),
        userMessage,
        assistantMessage,
      ]);
    } catch (err) {
      console.error('Erro ao processar o chat:', err);
      const errorMsg: ChatMessage = {
        id: 'error-' + Date.now(),
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

  return (
    <div className="h-screen max-h-screen w-screen max-w-full bg-white text-[#09090b] flex font-sans overflow-hidden">
      {/* Left Sidebar (file list + auth control fixed at the bottom) */}
      <Sidebar
        files={files}
        onUpload={handleFileUpload}
        onDeleteFile={handleDeleteFile}
        onPreviewFile={(f) => setPreviewFile(f)}
        isUploading={isUploading}
        user={user}
        isAuthLoading={isAuthLoading}
        onSignIn={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
        {migrationNotice && (
          <div className="px-4 py-2 bg-[#fdf5f2] border-b border-[#BA4E20]/30 text-xs text-[#BA4E20] font-medium shrink-0">
            {migrationNotice}
          </div>
        )}

        {/* Main Chat Panel */}
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
