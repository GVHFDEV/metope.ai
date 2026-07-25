'use client';

import React from 'react';
import { ProjectFile } from '@/types';
import { X, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface FilePreviewModalProps {
  file: ProjectFile | null;
  onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  if (!file) return null;

  const isImage = file.type === 'image';
  const isPdf = file.type === 'pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none font-sans text-[#09090b] dark:text-[#f4f4f5]">
      <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="h-12 px-4 bg-[#f8f9fa] dark:bg-[#121214] border-b border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {isImage ? (
              <ImageIcon className="w-4 h-4 text-[#BA4E20]" />
            ) : (
              <FileText className="w-4 h-4 text-[#BA4E20]" />
            )}
            <span className="font-semibold text-xs text-[#09090b] dark:text-[#f4f4f5] truncate">
              {file.name}
            </span>
            <span className="text-[10px] font-mono text-[#71717a] dark:text-[#a1a1aa] uppercase bg-[#e4e4e7] dark:bg-[#27272a] px-1.5 py-0.5 rounded">
              {file.type}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {file.url && (
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                download={file.name}
                className="px-2.5 py-1 bg-white dark:bg-[#27272a] hover:bg-[#f4f4f5] dark:hover:bg-[#3f3f46] border border-[#e4e4e7] dark:border-[#3f3f46] text-[#09090b] dark:text-[#f4f4f5] text-xs rounded-md transition-colors flex items-center gap-1.5 font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="font-mono text-[11px]">Abrir Original</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#e4e4e7] dark:hover:bg-[#27272a] text-[#71717a] hover:text-[#09090b] dark:hover:text-[#f4f4f5] rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 bg-[#f4f4f5] dark:bg-[#0e0e10] flex items-center justify-center min-h-[400px]">
          {isImage && file.url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-[70vh] object-contain border border-[#e4e4e7] dark:border-[#27272a] rounded-lg bg-white dark:bg-[#18181b] shadow-xs"
            />
          ) : isPdf && file.url ? (
            <iframe
              src={file.url}
              title={file.name}
              className="w-full h-[65vh] border border-[#e4e4e7] dark:border-[#27272a] rounded-lg bg-white dark:bg-[#18181b]"
            />
          ) : (
            <div className="w-full max-w-2xl bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] p-5 rounded-xl shadow-xs">
              <div className="text-[11px] font-mono text-[#71717a] dark:text-[#a1a1aa] mb-2 uppercase border-b border-[#e4e4e7] dark:border-[#27272a] pb-1">
                CONTEÚDO DO DOCUMENTO EXTRAÍDO
              </div>
              <pre className="font-mono text-xs text-[#09090b] dark:text-[#e4e4e7] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {file.content_text || 'Conteúdo do arquivo não pôde ser carregado.'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-10 px-4 bg-[#f8f9fa] dark:bg-[#121214] border-t border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between text-[11px] font-mono text-[#71717a] dark:text-[#a1a1aa]">
          <span>TAMANHO: {(file.size / 1024).toFixed(1)} KB</span>
          <span>DATA DE ADIÇÃO: {new Date(file.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
}
