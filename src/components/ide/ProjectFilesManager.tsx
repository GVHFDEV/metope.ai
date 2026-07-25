'use client';

import React, { useRef, useState } from 'react';
import { Project, ProjectFile } from '@/types';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileCode,
  Eye,
  Trash2,
  File,
  Layers,
  Folder,
  X,
  Search,
  MoreVertical,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface ProjectFilesManagerProps {
  project: Project;
  files: ProjectFile[];
  onUpload: (files: FileList | File[]) => void;
  onDeleteFile: (fileId: string) => void;
  onPreviewFile: (file: ProjectFile) => void;
  onClose: () => void;
  isUploading?: boolean;
}

export function ProjectFilesManager({
  project,
  files,
  onUpload,
  onDeleteFile,
  onPreviewFile,
  onClose,
  isUploading = false,
}: ProjectFilesManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFileMenuId, setActiveFileMenuId] = useState<string | null>(null);

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
    if (file.type === 'floorplan') return <Layers className="w-4 h-4 text-[#BA4E20]" />;
    if (file.type === 'doc' || file.type === 'txt')
      return <FileCode className="w-4 h-4 text-[#BA4E20]" />;
    return <File className="w-4 h-4 text-[#71717a]" />;
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col h-full bg-[#fafafa] dark:bg-[#121214] overflow-hidden font-sans">
      {/* Header Bar */}
      <div className="h-13 px-4 bg-white dark:bg-[#18181b] border-b border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between z-20 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-[#BA4E20]" />
          <h2 className="text-xs font-semibold text-[#09090b] dark:text-[#f4f4f5]">Arquivos do projeto</h2>
        </div>

        <button
          onClick={onClose}
          className="p-1 hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] rounded-lg text-[#71717a] hover:text-[#09090b] dark:hover:text-[#f4f4f5] transition-colors cursor-pointer"
          title="Fechar Gerenciador"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 w-full">
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

        {/* Compressed Upload Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer p-5 border-2 border-dashed rounded-xl text-center transition-all flex flex-col items-center justify-center gap-2 bg-white dark:bg-[#18181b] shadow-2xs ${
            isDragOver
              ? 'border-[#BA4E20] bg-[#fdf5f2] dark:bg-[#BA4E20]/10'
              : 'border-[#e4e4e7] dark:border-[#3f3f46] hover:border-[#BA4E20]/60 hover:bg-[#fdf5f2]/30 dark:hover:bg-[#BA4E20]/5'
          }`}
        >
          <div className="p-2.5 bg-[#fdf5f2] dark:bg-[#BA4E20]/15 border border-[#BA4E20]/20 rounded-lg text-[#BA4E20]">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-medium text-[#09090b] dark:text-[#f4f4f5]">
              {isUploading ? 'Enviando arquivos...' : 'Arraste arquivos ou clique para fazer upload'}
            </h3>
          </div>
        </div>

        {/* Search Bar */}
        {files.length > 0 && (
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar arquivo no projeto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] rounded-lg text-xs text-[#09090b] dark:text-[#f4f4f5] placeholder-[#a1a1aa] focus:outline-none focus:border-[#BA4E20] shadow-2xs"
            />
          </div>
        )}

        {/* Files Cards List */}
        {filteredFiles.length > 0 && (
          <div className="space-y-2">
            {filteredFiles.map((file) => {
              const isMenuOpen = activeFileMenuId === file.id;

              return (
                <div
                  key={file.id}
                  className="group bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] hover:border-[#BA4E20]/40 rounded-xl p-3 transition-all shadow-2xs flex items-center justify-between gap-3 relative"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-2 bg-[#f4f4f5] dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] rounded-lg shrink-0">
                      {getFileIcon(file)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-medium text-[#09090b] dark:text-[#f4f4f5] truncate" title={file.name}>
                        {file.name}
                      </h4>
                      <p className="text-[10px] font-mono text-[#71717a] dark:text-[#a1a1aa] mt-0.5">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  {/* 3-Dots Dropdown Trigger (Visible on Hover or when open) */}
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFileMenuId(isMenuOpen ? null : file.id);
                      }}
                      className={`p-1.5 rounded-lg text-[#71717a] hover:text-[#09090b] dark:hover:text-[#f4f4f5] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] transition-colors cursor-pointer ${
                        isMenuOpen ? 'bg-[#f4f4f5] dark:bg-[#27272a] text-[#09090b] dark:text-[#f4f4f5]' : 'hidden group-hover:block'
                      }`}
                      title="Opções do arquivo"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* File 3-Dots Dropdown Menu */}
                    <AnimatePresence>
                      {isMenuOpen && (
                        <>
                          <div
                            key="file-menu-backdrop"
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFileMenuId(null);
                            }}
                          />
                          <motion.div
                            key="file-menu-popover"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] rounded-lg shadow-lg z-50 py-1 font-normal text-xs"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveFileMenuId(null);
                                onPreviewFile(file);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[#fdf5f2] dark:hover:bg-[#BA4E20]/10 hover:text-[#BA4E20] flex items-center gap-2 text-[#09090b] dark:text-[#f4f4f5]"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#BA4E20]" />
                              <span>Visualizar</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveFileMenuId(null);
                                onDeleteFile(file.id);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[#fdf5f2] dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span>Apagar</span>
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
