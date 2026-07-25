'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  durationMs?: number;
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const duration = toast.durationMs || 2000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-3.5 h-3.5 text-[#BA4E20] shrink-0" />,
    error: <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />,
    info: <Info className="w-3.5 h-3.5 text-[#BA4E20] shrink-0" />,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.1 } }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="relative pointer-events-auto min-w-[180px] max-w-xs bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl shadow-lg overflow-hidden font-sans text-xs select-none"
    >
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {icons[toast.type]}
          <span className="font-semibold text-[#09090b] dark:text-[#f4f4f5] text-xs truncate">
            {toast.title}
          </span>
          {toast.message && (
            <span className="text-[11px] text-[#71717a] dark:text-[#a1a1aa] truncate">
              • {toast.message}
            </span>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="p-0.5 text-[#a1a1aa] hover:text-[#09090b] dark:hover:text-white rounded-md transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Depleting Brown Timing Bar (Always #BA4E20 in both light and dark mode) */}
      <div className="w-full bg-[#e4e4e7]/50 dark:bg-[#27272a] h-0.5 overflow-hidden">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className="h-full bg-[#BA4E20]"
        />
      </div>
    </motion.div>
  );
}

export function ToastNotification({ toasts, onDismiss }: ToastNotificationProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
