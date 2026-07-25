'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, ProjectFile, QuickActionType, Project } from '@/types';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  Send,
  Loader2,
  Paperclip,
  FileText,
  FileCode,
  Layers,
  Copy,
  Check,
  ChevronDown,
  Folder,
  Plus,
  Pencil,
  Trash2,
  X,
  Hash,
  RotateCcw,
  Globe,
} from 'lucide-react';

interface ChatPanelProps {
  projects: Project[];
  activeProject: Project | null;
  messages: ChatMessage[];
  files: ProjectFile[];
  onSelectProject: (project: Project) => void;
  onOpenNewProjectModal: () => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
  onSendMessage: (content: string, actionType?: QuickActionType | 'general', forceSearch?: boolean) => void;
  isLoading: boolean;
}

function renderUserMessageContent(content: string) {
  const match = content.match(/^\[FOCO DE ANÁLISE PRIORITÁRIO NOS ARQUIVOS INDEXADOS:\s*(.*?)\]\n\n?([\s\S]*)$/);

  if (!match) {
    return (
      <div className="text-xs md:text-[13px] leading-relaxed text-[#09090b] whitespace-pre-wrap">
        {content}
      </div>
    );
  }

  const fileNames = match[1].split(',').map((s) => s.trim()).filter(Boolean);
  const remainingText = match[2];

  return (
    <div className="space-y-2">
      {/* Render colored pills/tags for sent indexed files */}
      <div className="flex flex-wrap gap-1.5 pb-1.5 border-b border-[#e4e4e7]">
        {fileNames.map((fileName, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#fdf5f2] border border-[#BA4E20]/30 text-[#BA4E20] rounded-md text-[11px] font-mono font-medium"
          >
            <Paperclip className="w-3 h-3" />
            <span className="max-w-[180px] truncate">{fileName}</span>
          </span>
        ))}
      </div>
      <div className="text-xs md:text-[13px] leading-relaxed text-[#09090b] whitespace-pre-wrap">
        {remainingText}
      </div>
    </div>
  );
}

export function ChatPanel({
  projects,
  activeProject,
  messages,
  files,
  onSelectProject,
  onOpenNewProjectModal,
  onEditProject,
  onDeleteProject,
  onSendMessage,
  isLoading,
}: ChatPanelProps) {
  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isMentionMenuOpen, setIsMentionMenuOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionedFiles, setMentionedFiles] = useState<ProjectFile[]>([]);
  
  // Mandatory Web Search toggle state
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleExecuteAction = (actionId: QuickActionType) => {
    let defaultPrompt = '';
    if (actionId === 'summary') defaultPrompt = 'Resumir projeto';
    if (actionId === 'memorial') defaultPrompt = 'Gerar memorial descritivo';
    if (actionId === 'layout_analysis') defaultPrompt = 'Analisar layout';
    onSendMessage(defaultPrompt, actionId, isWebSearchEnabled);
  };

  const handleTextareaChange = (value: string) => {
    setInputPrompt(value);

    // Detect '#' for file indexing mention trigger
    const lastHashIndex = value.lastIndexOf('#');
    if (lastHashIndex !== -1) {
      const query = value.slice(lastHashIndex + 1);
      if (!query.includes(' ') && !query.includes('\n')) {
        setMentionFilter(query.toLowerCase());
        setIsMentionMenuOpen(true);
        setIsPlusMenuOpen(false);
        return;
      }
    }
    setIsMentionMenuOpen(false);
  };

  const handleSelectMentionFile = (file: ProjectFile) => {
    if (!mentionedFiles.some((f) => f.id === file.id)) {
      setMentionedFiles((prev) => [...prev, file]);
    }

    // Strip raw trailing '#' if present
    const lastHashIndex = inputPrompt.lastIndexOf('#');
    if (lastHashIndex !== -1) {
      const beforeHash = inputPrompt.slice(0, lastHashIndex);
      setInputPrompt(beforeHash.trim());
    }
    setIsMentionMenuOpen(false);
    setMentionFilter('');
  };

  const removeMentionedFile = (fileId: string) => {
    setMentionedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleSend = () => {
    if ((!inputPrompt.trim() && mentionedFiles.length === 0) || isLoading) return;

    let finalPrompt = inputPrompt.trim();
    if (mentionedFiles.length > 0) {
      const focusHeader = `[FOCO DE ANÁLISE PRIORITÁRIO NOS ARQUIVOS INDEXADOS: ${mentionedFiles
        .map((f) => f.name)
        .join(', ')}]\n\n`;
      finalPrompt = focusHeader + (finalPrompt || 'Analisar arquivo(s) indexado(s).');
    }

    onSendMessage(finalPrompt, 'general', isWebSearchEnabled);
    setInputPrompt('');
    setMentionedFiles([]);
    setIsMentionMenuOpen(false);
    setIsPlusMenuOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // 3 Quick Action Shortcuts
  const quickActions: {
    id: QuickActionType;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'summary',
      label: 'Resumir projeto',
      description: 'Sintetiza ficha técnica e plantas',
      icon: <FileText className="w-4 h-4 text-[#BA4E20]" />,
    },
    {
      id: 'memorial',
      label: 'Gerar memorial descritivo',
      description: 'Minuta técnica formal da edificação',
      icon: <FileCode className="w-4 h-4 text-[#BA4E20]" />,
    },
    {
      id: 'layout_analysis',
      label: 'Analisar layout',
      description: 'Avalia fluxos, insolação e setorização',
      icon: <Layers className="w-4 h-4 text-[#BA4E20]" />,
    },
  ];

  const hasUserMessages = messages.some((m) => m.role === 'user');

  const filteredMentionFiles = files.filter(
    (f) =>
      !mentionedFiles.some((m) => m.id === f.id) &&
      f.name.toLowerCase().includes(mentionFilter)
  );

  const renderPlusMenu = () => (
    <AnimatePresence>
      <div
        key="plus-backdrop"
        className="fixed inset-0 z-40"
        onClick={() => setIsPlusMenuOpen(false)}
      />
      <motion.div
        key="plus-popover"
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.96 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="absolute left-0 bottom-full mb-2 w-56 bg-white border border-[#e4e4e7] rounded-xl shadow-xl z-50 py-1 overflow-hidden"
      >
        <div className="px-3 py-1.5 text-[10px] font-mono text-[#71717a] border-b border-[#e4e4e7] uppercase font-semibold">
          OPÇÕES DE ANEXO
        </div>
        <button
          type="button"
          onClick={() => {
            setIsPlusMenuOpen(false);
            setIsMentionMenuOpen(true);
          }}
          className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-[#fdf5f2] text-[#09090b] transition-colors cursor-pointer"
        >
          <Paperclip className="w-4 h-4 text-[#BA4E20]" />
          <span>Indexar Arquivo</span>
        </button>
      </motion.div>
    </AnimatePresence>
  );

  const renderMentionDropdown = () => (
    <AnimatePresence>
      <div
        key="mention-backdrop"
        className="fixed inset-0 z-40"
        onClick={() => setIsMentionMenuOpen(false)}
      />
      <motion.div
        key="mention-popover"
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.96 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="absolute left-0 bottom-full mb-2 w-72 bg-white border border-[#e4e4e7] rounded-xl shadow-xl z-50 py-1 overflow-hidden"
      >
        <div className="px-3 py-1.5 text-[10px] font-mono text-[#71717a] border-b border-[#e4e4e7] uppercase font-semibold flex items-center gap-1">
          <Hash className="w-3 h-3 text-[#BA4E20]" />
          <span>INDEXAR ARQUIVO DO PROJETO</span>
        </div>
        <div className="max-h-48 overflow-y-auto py-1">
          {filteredMentionFiles.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[#a1a1aa] italic">
              {files.length === 0
                ? 'Nenhum arquivo no projeto'
                : 'Todos os arquivos já foram indexados'}
            </div>
          ) : (
            filteredMentionFiles.map((file, idx) => (
              <button
                key={file.id || `mention-${idx}`}
                type="button"
                onClick={() => handleSelectMentionFile(file)}
                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[#fdf5f2] text-[#09090b] transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#BA4E20] shrink-0" />
                <div className="truncate flex-1">
                  <div className="truncate font-medium">{file.name}</div>
                  <div className="text-[9px] font-mono text-[#71717a]">{file.type}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <main className="flex-1 flex flex-col h-screen max-h-screen overflow-hidden bg-[#fafafa] text-[#09090b] font-sans">
      {/* Main Content View */}
      {!hasUserMessages ? (
        /* EMPTY STATE CANVAS (LIGHT MODE) */
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-5xl mx-auto w-full select-none overflow-y-auto no-scrollbar">
          {/* Centered Heading */}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#09090b] mb-8 text-center">
            Em que posso ajudar com seu projeto?
          </h1>

          {/* Centered Elevated Input Box */}
          <div className="w-full bg-white border border-[#e4e4e7] focus-within:border-[#BA4E20] rounded-xl p-4 shadow-sm focus-within:shadow-md transition-all mb-6 relative">
            {isPlusMenuOpen && renderPlusMenu()}
            {isMentionMenuOpen && renderMentionDropdown()}

            {/* Input bar layout with + button, web search toggle, inline pills, textarea, and send button */}
            <div className="flex flex-col gap-2">
              {/* Inline Mention Pills inside input container */}
              {mentionedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-2 border-b border-[#f4f4f5]">
                  {mentionedFiles.map((file, idx) => (
                    <span
                      key={file.id || `empty-pill-${idx}`}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#fdf5f2] border border-[#BA4E20]/30 text-[#BA4E20] rounded-md text-xs font-mono font-medium shrink-0"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span className="max-w-[180px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeMentionedFile(file.id)}
                        className="hover:text-[#9c3f19] cursor-pointer ml-0.5"
                        title="Remover indexação"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-2">
                {/* + Button with Framer Motion spring rotation & scale */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                  title="Opções de anexo (+)"
                  className="p-2 bg-[#f8f9fa] hover:bg-[#fdf5f2] border border-[#e4e4e7] hover:border-[#BA4E20]/50 rounded-lg text-[#BA4E20] transition-colors cursor-pointer shrink-0 mt-0.5"
                >
                  <motion.div
                    animate={{ rotate: isPlusMenuOpen ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  >
                    <Plus className="w-4 h-4" />
                  </motion.div>
                </motion.button>

                {/* Web Search Toggle Button (Icon only with hover label) */}
                <button
                  type="button"
                  onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                  title="Busca na web"
                  className={`p-2 rounded-lg border transition-all cursor-pointer shrink-0 mt-0.5 ${
                    isWebSearchEnabled
                      ? 'bg-[#fdf5f2] border-[#BA4E20] text-[#BA4E20] shadow-2xs'
                      : 'bg-[#f8f9fa] border-[#e4e4e7] text-[#71717a] hover:text-[#09090b] hover:border-[#BA4E20]/40'
                  }`}
                >
                  <Globe className={`w-4 h-4 ${isWebSearchEnabled ? 'text-[#BA4E20]' : 'text-[#71717a]'}`} />
                </button>

                <textarea
                  rows={3}
                  value={inputPrompt}
                  onChange={(e) => handleTextareaChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enviar mensagem para Metope AI..."
                  className="flex-1 bg-transparent text-sm md:text-base text-[#09090b] placeholder-[#a1a1aa] focus:outline-none resize-none leading-relaxed"
                />

                {/* Fixed Square Send Button */}
                <button
                  disabled={(!inputPrompt.trim() && mentionedFiles.length === 0) || isLoading}
                  onClick={handleSend}
                  className={`w-9 h-9 bg-[#BA4E20] hover:bg-[#9c3f19] text-white rounded-lg transition-colors flex items-center justify-center shrink-0 mt-0.5 ${
                    (!inputPrompt.trim() && mentionedFiles.length === 0) || isLoading
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Action Cards Below Input */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full">
            {quickActions.map((action, idx) => (
              <button
                key={action.id || `qa-${idx}`}
                disabled={isLoading}
                onClick={() => handleExecuteAction(action.id)}
                className="p-3.5 bg-white hover:bg-[#fdf5f2]/40 border border-[#e4e4e7] hover:border-[#BA4E20]/50 rounded-xl transition-all text-left flex items-start gap-3 shadow-2xs group cursor-pointer"
              >
                <div className="p-2 bg-[#fdf5f2] group-hover:bg-white border border-[#BA4E20]/20 rounded-lg flex-shrink-0 transition-colors">
                  {action.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-[#09090b] group-hover:text-[#BA4E20] transition-colors truncate">
                    {action.label}
                  </div>
                  <div className="text-[11px] text-[#71717a] truncate mt-0.5">
                    {action.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Safety Disclaimer Legend */}
          <p className="text-[10px] font-mono text-[#a1a1aa] text-center mt-4 leading-tight max-w-xl">
            O Metope AI pode cometer erros. Verifique a veracidade das informações e o cumprimento das normas técnicas com um profissional habilitado.
          </p>
        </div>
      ) : (
        /* ACTIVE CONVERSATION THREAD */
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5 max-w-6xl mx-auto w-full no-scrollbar"
          >
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const isErrorMessage =
                !isUser &&
                (msg.content.includes('indisponível') ||
                  msg.content.includes('sobrecarregado') ||
                  msg.content.includes('Erro') ||
                  msg.content.includes('503'));

              const handleRetry = () => {
                const lastUserMsg = [...messages].slice(0, idx).reverse().find((m) => m.role === 'user') ||
                  [...messages].reverse().find((m) => m.role === 'user');
                if (lastUserMsg && lastUserMsg.content) {
                  onSendMessage(lastUserMsg.content, 'general', isWebSearchEnabled);
                }
              };

              return (
                <div
                  key={msg.id || `msg-${idx}`}
                  className={`flex flex-col ${
                    isUser ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-[#71717a]">
                    <span className="font-semibold text-[#09090b]">
                      {isUser ? 'VOCÊ' : 'METOPE AI'}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Message Bubble Card */}
                  <div
                    className={`group relative max-w-4xl p-3.5 px-4 border rounded-xl shadow-2xs ${
                      isUser
                        ? 'bg-[#f4f4f5] border-[#e4e4e7] text-[#09090b]'
                        : isErrorMessage
                        ? 'bg-red-50/50 border-red-200 text-[#09090b]'
                        : 'bg-white border-[#e4e4e7] text-[#09090b]'
                    }`}
                  >
                    {isUser ? (
                      renderUserMessageContent(msg.content)
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}

                    {/* Retry Button for Error Messages */}
                    {isErrorMessage && (
                      <div className="mt-3 pt-2 border-t border-red-200 flex items-center justify-between gap-4">
                        <span className="text-[11px] text-red-600 font-medium">
                          A IA não pôde concluir a requisição devido a instabilidade temporária.
                        </span>
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="px-3 py-1.5 bg-[#BA4E20] hover:bg-[#9c3f19] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Tentar novamente</span>
                        </button>
                      </div>
                    )}

                    {/* Copy Action Button */}
                    {!isUser && !isErrorMessage && (
                      <button
                        onClick={() => handleCopyText(msg.id, msg.content)}
                        className="absolute top-2 right-2 p-1.5 bg-white border border-[#e4e4e7] hover:border-[#BA4E20] rounded-md text-[#71717a] hover:text-[#BA4E20] opacity-0 group-hover:opacity-100 transition-all"
                        title="Copiar texto"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-[#BA4E20]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 3 Pulsing Dots Loading Indicator */}
            {isLoading && (
              <div className="flex flex-col items-start space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#71717a]">
                  <span className="font-semibold text-[#09090b]">METOPE AI</span>
                </div>
                <div className="px-4 py-3 bg-white border border-[#e4e4e7] rounded-xl flex items-center gap-2 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#BA4E20] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-[#BA4E20] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-[#BA4E20] animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Fixed Input Bar for Active Chat */}
          <div className="p-4 md:px-6 bg-[#fafafa] border-t border-[#e4e4e7] max-w-6xl mx-auto w-full flex-shrink-0 relative">
            {isPlusMenuOpen && renderPlusMenu()}
            {isMentionMenuOpen && renderMentionDropdown()}

            <div className="flex items-center gap-2 bg-white border border-[#e4e4e7] focus-within:border-[#BA4E20] rounded-xl p-2 transition-colors shadow-2xs">
              {/* + Button with Framer Motion spring rotation & scale */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                title="Opções de anexo (+)"
                className="p-1.5 bg-[#f8f9fa] hover:bg-[#fdf5f2] border border-[#e4e4e7] hover:border-[#BA4E20]/50 rounded-lg text-[#BA4E20] transition-colors cursor-pointer shrink-0"
              >
                <motion.div
                  animate={{ rotate: isPlusMenuOpen ? 45 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                >
                  <Plus className="w-4 h-4" />
                </motion.div>
              </motion.button>

              {/* Web Search Toggle Button (Icon only with hover label) */}
              <button
                type="button"
                onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                title="Busca na web"
                className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                  isWebSearchEnabled
                    ? 'bg-[#fdf5f2] border-[#BA4E20] text-[#BA4E20] shadow-2xs'
                    : 'bg-[#f8f9fa] border-[#e4e4e7] text-[#71717a] hover:text-[#09090b] hover:border-[#BA4E20]/40'
                }`}
              >
                <Globe className={`w-4 h-4 ${isWebSearchEnabled ? 'text-[#BA4E20]' : 'text-[#71717a]'}`} />
              </button>

              {/* Inline Mention Pills */}
              {mentionedFiles.map((file, idx) => (
                <span
                  key={file.id || `chat-pill-${idx}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#fdf5f2] border border-[#BA4E20]/30 text-[#BA4E20] rounded-md text-[11px] font-mono font-medium shrink-0"
                >
                  <Paperclip className="w-3 h-3" />
                  <span className="max-w-[130px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeMentionedFile(file.id)}
                    className="hover:text-[#9c3f19] cursor-pointer ml-0.5"
                    title="Remover indexação"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <textarea
                rows={1}
                value={inputPrompt}
                onChange={(e) => handleTextareaChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enviar mensagem para Metope AI..."
                className="flex-1 bg-transparent text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none resize-none py-1"
              />

              <button
                disabled={(!inputPrompt.trim() && mentionedFiles.length === 0) || isLoading}
                onClick={handleSend}
                className={`p-2 bg-[#BA4E20] hover:bg-[#9c3f19] text-white rounded-lg transition-colors flex items-center justify-center shrink-0 ${
                  (!inputPrompt.trim() && mentionedFiles.length === 0) || isLoading
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
