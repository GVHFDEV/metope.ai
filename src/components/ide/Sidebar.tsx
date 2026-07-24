'use client';

import React, { useRef, useState } from 'react';
import { ProjectFile } from '@/types';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileCode,
  Eye,
  Trash2,
  File,
  ChevronsLeft,
  Search,
} from 'lucide-react';

interface SidebarProps {
  files: ProjectFile[];
  onUpload: (files: FileList | File[]) => void;
  onDeleteFile: (fileId: string) => void;
  onPreviewFile: (file: ProjectFile) => void;
  isUploading?: boolean;
}

export function Sidebar({
  files,
  onUpload,
  onDeleteFile,
  onPreviewFile,
  isUploading = false,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file: ProjectFile) => {
    if (file.type === 'image') return <ImageIcon className="w-4 h-4 text-[#BA4E20]" />;
    if (file.type === 'pdf') return <FileText className="w-4 h-4 text-[#BA4E20]" />;
    if (file.type === 'doc' || file.type === 'txt')
      return <FileCode className="w-4 h-4 text-[#BA4E20]" />;
    return <File className="w-4 h-4 text-[#71717a]" />;
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-72 bg-[#f8f9fa] border-r border-[#e4e4e7] flex flex-col h-screen select-none font-sans text-[#09090b]">
      {/* Top Header: Single Small Logo + Collapse */}
      <div className="p-3 border-b border-[#e4e4e7] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Logo SVG (Original colors) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Metope AI"
            className="h-4.5 w-auto object-contain"
          />
        </div>

        <button
          title="Recolher painel"
          className="p-1 hover:bg-[#e4e4e7] rounded-md text-[#71717a] hover:text-[#09090b] transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.svg,.webp,.txt,.md,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files);
          }
        }}
      />

      {/* Main Section: Upload & Files */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Upload Box */}
        <div className="p-3 border-b border-[#e4e4e7]">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer p-4 border border-dashed rounded-lg text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
              isDragOver
                ? 'border-[#BA4E20] bg-[#fdf5f2]'
                : 'border-[#d4d4d8] hover:border-[#BA4E20] bg-white hover:bg-[#fdf5f2]/40'
            }`}
          >
            <UploadCloud className="w-5 h-5 text-[#BA4E20]" />
            <div className="text-xs font-semibold text-[#09090b]">
              {isUploading ? 'Enviando...' : 'Upload de Arquivos'}
            </div>
            <div className="text-[10px] font-mono text-[#71717a]">
              Arraste ou clique para anexar
            </div>
          </div>
        </div>

        {/* File Search */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-2 bg-white border border-[#e4e4e7] focus-within:border-[#BA4E20] rounded-md px-2.5 py-1 text-xs transition-colors">
            <Search className="w-3.5 h-3.5 text-[#a1a1aa]" />
            <input
              type="text"
              placeholder="Buscar arquivos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-[#09090b] placeholder-[#a1a1aa] focus:outline-none"
            />
          </div>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-1 py-1 text-[10px] font-mono font-semibold text-[#71717a] uppercase tracking-wider flex items-center justify-between">
            <span>ARQUIVOS DO PROJETO</span>
            <span className="text-[#BA4E20] font-bold">{filteredFiles.length}</span>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#71717a]">
              Nenhum arquivo adicionado neste projeto.
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div
                key={file.id}
                className="group relative p-2 bg-white hover:bg-[#fdf5f2]/50 border border-[#e4e4e7] hover:border-[#BA4E20]/30 rounded-md transition-colors flex items-center justify-between gap-2"
              >
                <div
                  onClick={() => onPreviewFile(file)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="w-7 h-7 bg-[#f4f4f5] border border-[#e4e4e7] rounded flex items-center justify-center flex-shrink-0">
                    {getFileIcon(file)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-[#09090b] truncate">
                      {file.name}
                    </div>
                    <div className="text-[10px] font-mono text-[#71717a]">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>

                {/* File Action Buttons */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  <button
                    onClick={() => onPreviewFile(file)}
                    title="Visualizar"
                    className="p-1 hover:bg-[#e4e4e7] rounded text-[#71717a] hover:text-[#BA4E20] transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteFile(file.id)}
                    title="Excluir"
                    className="p-1 hover:bg-[#e4e4e7] rounded text-[#71717a] hover:text-[#BA4E20] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
