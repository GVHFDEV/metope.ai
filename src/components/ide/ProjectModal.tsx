'use client';

import React, { useState } from 'react';
import { Project } from '@/types';
import { X, Plus, FolderPlus } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (name: string, description?: string, category?: Project['category']) => void;
  /** When set, the modal edits this project (e.g. renaming an auto-created
   * project) instead of creating a new one. */
  editingProject?: Project | null;
  onUpdateProject?: (
    id: string,
    name: string,
    description?: string,
    category?: Project['category']
  ) => void;
}

export function ProjectModal({ isOpen, onClose, onCreateProject, editingProject = null, onUpdateProject }: ProjectModalProps) {
  if (!isOpen) return null;

  // Remount the form whenever which project (or "new project") is being
  // edited changes, so its initial state is derived once from props instead
  // of being synced via an effect.
  return (
    <ProjectModalForm
      key={editingProject?.id ?? 'new'}
      onClose={onClose}
      onCreateProject={onCreateProject}
      editingProject={editingProject}
      onUpdateProject={onUpdateProject}
    />
  );
}

function ProjectModalForm({
  onClose,
  onCreateProject,
  editingProject,
  onUpdateProject,
}: Omit<ProjectModalProps, 'isOpen'>) {
  const [name, setName] = useState(editingProject?.name ?? '');
  const [description, setDescription] = useState(editingProject?.description ?? '');
  const [category, setCategory] = useState<Project['category']>(
    editingProject?.category ?? 'Residencial',
  );

  const isEditing = Boolean(editingProject);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditing && editingProject && onUpdateProject) {
      onUpdateProject(editingProject.id, name.trim(), description.trim(), category);
    } else {
      onCreateProject(name.trim(), description.trim(), category);
    }

    setName('');
    setDescription('');
    setCategory('Residencial');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none font-sans text-[#09090b] dark:text-[#f4f4f5]">
      <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="h-12 px-4 bg-[#f8f9fa] dark:bg-[#121214] border-b border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-[#BA4E20]" />
            <span className="font-semibold text-xs text-[#09090b] dark:text-[#f4f4f5]">
              {isEditing ? 'Nomear Projeto' : 'Novo Projeto Arquitetônico'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#e4e4e7] dark:hover:bg-[#27272a] text-[#71717a] hover:text-[#09090b] dark:hover:text-[#f4f4f5] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-[#71717a] dark:text-[#a1a1aa] mb-1 uppercase font-semibold">
              NOME DO PROJETO *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Edifício Horizonte, Residência Spazio, Loft Jardins"
              className="w-full bg-[#f8f9fa] dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] focus:border-[#BA4E20] text-xs text-[#09090b] dark:text-[#f4f4f5] px-3 py-2 rounded-lg focus:outline-none placeholder-[#a1a1aa]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#71717a] dark:text-[#a1a1aa] mb-1 uppercase font-semibold">
              CATEGORIA
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Project['category'])}
              className="w-full bg-[#f8f9fa] dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] focus:border-[#BA4E20] text-xs text-[#09090b] dark:text-[#f4f4f5] px-3 py-2 rounded-lg focus:outline-none"
            >
              <option value="Residencial">Residencial</option>
              <option value="Comercial">Comercial</option>
              <option value="Corporativo">Corporativo</option>
              <option value="Interiores">Interiores</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#71717a] dark:text-[#a1a1aa] mb-1 uppercase font-semibold">
              DESCRIÇÃO / OBSERVAÇÕES TÉCNICAS (OPCIONAL)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes sobre a metragem, terreno, programa de necessidades..."
              className="w-full bg-[#f8f9fa] dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] focus:border-[#BA4E20] text-xs text-[#09090b] dark:text-[#f4f4f5] px-3 py-2 rounded-lg focus:outline-none resize-none placeholder-[#a1a1aa]"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-2 border-t border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white dark:bg-[#27272a] hover:bg-[#f4f4f5] dark:hover:bg-[#3f3f46] border border-[#e4e4e7] dark:border-[#3f3f46] text-[#71717a] dark:text-[#a1a1aa] text-xs rounded-lg transition-colors font-mono"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className={`px-4 py-1.5 bg-[#BA4E20] hover:bg-[#9c3f19] text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 ${
                !name.trim() ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Salvar' : 'Criar Projeto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
