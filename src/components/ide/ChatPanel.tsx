'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ProjectFile, QuickActionType, Project } from '@/types';
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
} from 'lucide-react';

interface ChatPanelProps {
  projects: Project[];
  activeProject: Project | null;
  messages: ChatMessage[];
  files: ProjectFile[];
  onSelectProject: (project: Project) => void;
  onOpenNewProjectModal: () => void;
  onSendMessage: (content: string, actionType?: QuickActionType | 'general') => void;
  isLoading: boolean;
}

export function ChatPanel({
  projects,
  activeProject,
  messages,
  files,
  onSelectProject,
  onOpenNewProjectModal,
  onSendMessage,
  isLoading,
}: ChatPanelProps) {
  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isHeaderDropdownOpen, setIsHeaderDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!inputPrompt.trim() || isLoading) return;
    onSendMessage(inputPrompt.trim(), 'general');
    setInputPrompt('');
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

  // Helper to render structured Markdown text cleanly
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-2 text-xs leading-relaxed text-[#09090b]">
        {lines.map((line, idx) => {
          if (line.startsWith('## ')) {
            return (
              <h2
                key={idx}
                className="text-sm font-bold font-mono text-[#09090b] pt-2 pb-1 border-b border-[#e4e4e7] uppercase tracking-wide"
              >
                {line.replace('## ', '')}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3
                key={idx}
                className="text-xs font-semibold text-[#BA4E20] pt-1.5 pb-0.5"
              >
                {line.replace('### ', '')}
              </h3>
            );
          }
          if (line.startsWith('* ') || line.startsWith('- ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-[#27272a]">
                {formatBoldText(line.substring(2))}
              </li>
            );
          }
          if (line.trim() === '---') {
            return <hr key={idx} className="border-[#e4e4e7] my-2" />;
          }
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }
          return (
            <p key={idx} className="text-[#27272a]">
              {formatBoldText(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const formatBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-[#09090b]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const hasUserMessages = messages.some((m) => m.role === 'user');

  return (
    <main className="flex-1 flex flex-col h-screen bg-[#fafafa] text-[#09090b] font-sans">
      {/* Top Header Bar with Project Selector Dropdown */}
      <header className="h-13 px-6 border-b border-[#e4e4e7] bg-white flex items-center justify-between select-none relative z-30">
        <div className="relative">
          {/* Active Project Dropdown Trigger Button */}
          <button
            onClick={() => setIsHeaderDropdownOpen(!isHeaderDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#f8f9fa] hover:bg-[#fdf5f2] border border-[#e4e4e7] hover:border-[#BA4E20]/50 rounded-lg transition-all text-left"
          >
            <Folder className="w-4 h-4 text-[#BA4E20]" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#09090b]">
                {activeProject ? activeProject.name : 'Selecionar Projeto'}
              </span>
              {activeProject?.category && (
                <span className="text-[10px] font-mono bg-white border border-[#e4e4e7] text-[#71717a] px-2 py-0.5 rounded-full">
                  {activeProject.category}
                </span>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-[#71717a] ml-1" />
          </button>

          {/* Header Project Selector Dropdown Menu */}
          {isHeaderDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsHeaderDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-[#e4e4e7] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                {/* Simplified Dropdown Header without TROCAR / CRIAR */}
                <div className="px-3.5 py-2 text-[10px] font-mono text-[#71717a] border-b border-[#e4e4e7] uppercase font-semibold">
                  PROJETOS ({projects.length})
                </div>

                <div className="max-h-64 overflow-y-auto py-1">
                  {projects.map((proj) => {
                    const isSelected = activeProject?.id === proj.id;
                    return (
                      <button
                        key={proj.id}
                        onClick={() => {
                          onSelectProject(proj);
                          setIsHeaderDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-[#fdf5f2] text-[#09090b] font-semibold'
                            : 'hover:bg-[#f8f9fa] text-[#71717a] hover:text-[#09090b]'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate">{proj.name}</div>
                          <div className="text-[10px] font-mono text-[#71717a]">
                            {proj.category || 'Residencial'}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#BA4E20]" />}
                      </button>
                    );
                  })}
                </div>

                {/* Create New Project Button without double ++ */}
                <div className="p-2 border-t border-[#e4e4e7]">
                  <button
                    onClick={() => {
                      setIsHeaderDropdownOpen(false);
                      onOpenNewProjectModal();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#BA4E20] hover:bg-[#9c3f19] text-white text-xs font-medium rounded-lg transition-colors shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Criar Novo Projeto</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content View */}
      {!hasUserMessages ? (
        /* BIELIK-INSPIRED EMPTY STATE CANVAS (LIGHT MODE) */
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full select-none">
          {/* Centered Heading */}
          <h1 className="text-3xl font-bold tracking-tight text-[#09090b] mb-8 text-center">
            Em que posso ajudar com seu projeto?
          </h1>

          {/* Centered Elevated Input Box */}
          <div className="w-full bg-white border border-[#e4e4e7] focus-within:border-[#BA4E20] rounded-xl p-4 shadow-sm focus-within:shadow-md transition-all mb-6">
            <textarea
              rows={3}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta sobre as plantas, memorial, setorização ou acabamentos..."
              className="w-full bg-transparent text-sm text-[#09090b] placeholder-[#a1a1aa] focus:outline-none resize-none"
            />

            {/* Input Toolbar */}
            <div className="flex items-center justify-between pt-2 border-t border-[#f4f4f5]">
              <div className="flex items-center gap-1.5 text-xs text-[#71717a]">
                <button
                  title="Contexto de arquivos ativo"
                  className="p-1.5 hover:bg-[#fdf5f2] rounded-md text-[#71717a] hover:text-[#BA4E20] flex items-center gap-1.5 text-xs transition-colors font-mono"
                >
                  <Paperclip className="w-3.5 h-3.5 text-[#BA4E20]" />
                  <span>{files.length} arquivos ativos</span>
                </button>
              </div>

              <button
                disabled={!inputPrompt.trim() || isLoading}
                onClick={handleSend}
                className={`px-4 py-2 bg-[#BA4E20] hover:bg-[#9c3f19] text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
                  !inputPrompt.trim() || isLoading
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
              >
                <span>Enviar</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Action Cards Below Input */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            {quickActions.map((action) => (
              <button
                key={action.id}
                disabled={isLoading}
                onClick={() => onExecuteAction(action.id)}
                className="p-3.5 bg-white hover:bg-[#fdf5f2]/40 border border-[#e4e4e7] hover:border-[#BA4E20]/50 rounded-xl transition-all text-left flex items-start gap-3 shadow-2xs group cursor-pointer"
              >
                <div className="p-2 bg-[#fdf5f2] group-hover:bg-white border border-[#BA4E20]/20 rounded-lg flex-shrink-0 transition-colors">
                  {action.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-[#09090b] group-hover:text-[#BA4E20] transition-colors truncate">
                    {action.label}
                  </div>
                  <div className="text-[11px] text-[#71717a] mt-0.5 leading-snug">
                    {action.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ACTIVE CONVERSATION THREAD */
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isUser ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center gap-2 mb-1.5 text-[11px] font-mono text-[#71717a]">
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
                    className={`group relative max-w-3xl p-4 border rounded-xl shadow-2xs ${
                      isUser
                        ? 'bg-[#f4f4f5] border-[#e4e4e7] text-[#09090b]'
                        : 'bg-white border-[#e4e4e7] text-[#09090b]'
                    }`}
                  >
                    {renderMessageContent(msg.content)}

                    {/* Copy Action Button */}
                    {!isUser && (
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

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2 mb-1.5 text-[11px] font-mono text-[#71717a]">
                  <span className="font-semibold text-[#09090b]">METOPE AI</span>
                  <span>•</span>
                  <span>ANALISANDO PROJETO</span>
                </div>
                <div className="p-4 bg-white border border-[#e4e4e7] rounded-xl flex items-center gap-3 text-xs text-[#71717a] shadow-2xs">
                  <Loader2 className="w-4 h-4 text-[#BA4E20] animate-spin" />
                  <span className="font-mono text-[#09090b]">
                    Gerando parecer técnico detalhado via Gemini...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Fixed Input Bar for Active Chat */}
          <div className="p-4 bg-[#fafafa] border-t border-[#e4e4e7] max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#71717a] mb-2">
              <span className="text-[#BA4E20] font-semibold">{files.length} ARQUIVO(S) NO CONTEXTO</span>
            </div>

            <div className="flex items-stretch gap-2 bg-white border border-[#e4e4e7] focus-within:border-[#BA4E20] rounded-xl p-2 transition-colors shadow-2xs">
              <textarea
                rows={1}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enviar mensagem para o Metope AI..."
                className="flex-1 bg-transparent text-xs text-[#09090b] placeholder-[#a1a1aa] focus:outline-none px-2 py-1.5 resize-none"
              />

              <button
                disabled={!inputPrompt.trim() || isLoading}
                onClick={handleSend}
                className={`px-3 bg-[#BA4E20] hover:bg-[#9c3f19] text-white rounded-lg transition-colors flex items-center justify-center ${
                  !inputPrompt.trim() || isLoading
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );

  function onExecuteAction(actionType: QuickActionType) {
    onSendMessage('', actionType);
  }
}
