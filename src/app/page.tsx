'use client';

import React, { useState, useEffect } from 'react';
import { Project, ProjectFile, ChatMessage, QuickActionType } from '@/types';
import { StorageService } from '@/lib/storage';
import { Sidebar } from '@/components/ide/Sidebar';
import { ChatPanel } from '@/components/ide/ChatPanel';
import { FilePreviewModal } from '@/components/ide/FilePreviewModal';
import { ProjectModal } from '@/components/ide/ProjectModal';

export default function HomePage() {
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

  // Load Projects on Initial Mount
  useEffect(() => {
    async function loadInitialProjects() {
      const projs = await StorageService.getProjects();
      setProjects(projs);
      if (projs.length > 0) {
        setActiveProject(projs[0]);
      }
    }
    loadInitialProjects();
  }, []);

  // Load Files and Messages whenever Active Project Changes
  useEffect(() => {
    if (!activeProject) return;

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
      // The Convex action persists both messages and runs the AI call server-side.
      const { userMessage, assistantMessage } = await StorageService.sendChat(
        targetProject.id,
        displayPrompt,
        actionType
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
    <div className="min-h-screen bg-white text-[#09090b] flex font-sans overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        files={files}
        onUpload={handleFileUpload}
        onDeleteFile={handleDeleteFile}
        onPreviewFile={(f) => setPreviewFile(f)}
        isUploading={isUploading}
      />

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
        onSendMessage={handleSendMessage}
        isLoading={isLoadingAi}
      />

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
    </div>
  );
}
