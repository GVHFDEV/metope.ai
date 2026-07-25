'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '@supabase/supabase-js';
import { updateUserOnboardingData } from '@/lib/auth';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Briefcase,
  Target,
  Sparkles,
  Loader2,
} from 'lucide-react';

const FUNCAO_OPTIONS = [
  'Arquiteto(a)',
  'Engenheiro(a) Civil',
  'Estudante de Arquitetura/Engenharia',
  'Designer de Interiores',
  'Outro',
];

const OBJETIVO_OPTIONS = [
  'Organizar e consultar documentos de projeto',
  'Gerar memoriais e documentos',
  'Estudos de layout/plantas',
  'Renders e apresentação visual',
  'Ainda não sei, só explorando',
];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated?: (updatedUser: User) => void;
  onShowToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export function OnboardingModal({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  onShowToast,
}: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [funcao, setFuncao] = useState<string>('');
  const [funcaoOutro, setFuncaoOutro] = useState<string>('');
  const [objetivos, setObjetivos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync existing onboarding metadata if available
  useEffect(() => {
    if (user && isOpen) {
      const meta = user.user_metadata || {};
      setFuncao(meta.funcao || '');
      setFuncaoOutro(meta.funcao_outro || '');
      setObjetivos(Array.isArray(meta.objetivo_principal) ? meta.objetivo_principal : []);
      setStep(1);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      const { user: updatedUser } = await updateUserOnboardingData({
        onboarding_pulado: true,
        onboarding_completo: false,
      });
      if (updatedUser) {
        onUserUpdated?.(updatedUser);
      }
      onShowToast?.('Salvo', undefined, 'info');
    } catch (_err) {
      // Ignore background error
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      const { user: updatedUser, error } = await updateUserOnboardingData({
        funcao,
        funcao_outro: funcao === 'Outro' ? funcaoOutro : '',
        objetivos,
        onboarding_completo: true,
        onboarding_pulado: false,
      });

      if (error) {
        onShowToast?.('Algo deu errado. Tente novamente.', undefined, 'error');
      } else {
        if (updatedUser) onUserUpdated?.(updatedUser);
        onShowToast?.('Salvo', undefined, 'success');
        onClose();
      }
    } catch (_err) {
      onShowToast?.('Algo deu errado. Tente novamente.', undefined, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleObjetivo = (option: string) => {
    setObjetivos((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
    );
  };

  const canAdvanceStep1 =
    Boolean(funcao) && (funcao !== 'Outro' || Boolean(funcaoOutro.trim()));
  const canAdvanceStep2 = objetivos.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans select-none text-[#09090b] dark:text-[#f4f4f5]">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={handleSkip} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative z-10 font-sans"
      >
        {/* Top Header & Progress */}
        <div className="px-6 pt-5 pb-4 border-b border-[#e4e4e7] dark:border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#BA4E20]" />
            <span className="text-xs font-mono font-semibold uppercase text-[#71717a] dark:text-[#a1a1aa]">
              PASSO {step} DE 3
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-[#71717a] dark:text-[#a1a1aa] hover:text-[#09090b] dark:hover:text-[#f4f4f5] transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]"
          >
            Pular
          </button>
        </div>

        {/* Depleting / Filling Progress Bar */}
        <div className="w-full bg-[#f4f4f5] dark:bg-[#27272a] h-1 overflow-hidden">
          <motion.div
            initial={{ width: '33.3%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full bg-[#BA4E20]"
          />
        </div>

        {/* Content Body */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-[#BA4E20] mb-1">
                    <Briefcase className="w-4 h-4" />
                    <span className="text-xs font-mono font-semibold uppercase">Função Profissional</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#09090b] dark:text-[#f4f4f5]">
                    Qual sua função?
                  </h3>
                  <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-0.5">
                    Selecione a opção que melhor descreve sua atuação atual.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  {FUNCAO_OPTIONS.map((option) => {
                    const isSelected = funcao === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFuncao(option)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium border transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-[#fdf5f2] dark:bg-[#27272a] border-[#BA4E20] text-[#BA4E20] font-semibold shadow-2xs'
                            : 'bg-[#fafafa] dark:bg-[#121214] border-[#e4e4e7] dark:border-[#27272a] text-[#09090b] dark:text-[#f4f4f5] hover:border-[#a1a1aa] dark:hover:border-[#3f3f46]'
                        }`}
                      >
                        <span>{option}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-[#BA4E20] bg-[#BA4E20] text-white'
                              : 'border-[#a1a1aa] dark:border-[#3f3f46]'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {funcao === 'Outro' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-1"
                  >
                    <label className="block text-[11px] font-mono text-[#71717a] dark:text-[#a1a1aa] uppercase font-semibold mb-1">
                      ESPECIFIQUE SUA FUNÇÃO (MÁX. 50 CARACTERES)
                    </label>
                    <input
                      type="text"
                      maxLength={50}
                      value={funcaoOutro}
                      onChange={(e) => setFuncaoOutro(e.target.value)}
                      placeholder="Ex: Consultor Predial, Perito..."
                      className="w-full bg-[#fafafa] dark:bg-[#121214] border border-[#e4e4e7] dark:border-[#3f3f46] focus:border-[#BA4E20] text-xs text-[#09090b] dark:text-[#f4f4f5] px-3.5 py-2 rounded-xl focus:outline-none placeholder-[#a1a1aa]"
                    />
                  </motion.div>
                )}

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={!canAdvanceStep1}
                    onClick={() => setStep(2)}
                    className={`px-4 py-2 bg-[#BA4E20] hover:bg-[#9c3f19] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs ${
                      !canAdvanceStep1 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <span>Avançar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-[#BA4E20] mb-1">
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-mono font-semibold uppercase">Objetivos de Uso</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#09090b] dark:text-[#f4f4f5]">
                    O que você mais quer usar o Metope para?
                  </h3>
                  <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-0.5">
                    Selecione uma ou mais opções que correspondem aos seus interesses.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  {OBJETIVO_OPTIONS.map((option) => {
                    const isChecked = objetivos.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleObjetivo(option)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium border transition-all text-left cursor-pointer ${
                          isChecked
                            ? 'bg-[#fdf5f2] dark:bg-[#27272a] border-[#BA4E20] text-[#BA4E20] font-semibold shadow-2xs'
                            : 'bg-[#fafafa] dark:bg-[#121214] border-[#e4e4e7] dark:border-[#27272a] text-[#09090b] dark:text-[#f4f4f5] hover:border-[#a1a1aa] dark:hover:border-[#3f3f46]'
                        }`}
                      >
                        <span>{option}</span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isChecked
                              ? 'border-[#BA4E20] bg-[#BA4E20] text-white'
                              : 'border-[#a1a1aa] dark:border-[#3f3f46]'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-3 py-2 text-xs font-medium text-[#71717a] dark:text-[#a1a1aa] hover:text-[#09090b] dark:hover:text-[#f4f4f5] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Voltar</span>
                  </button>

                  <button
                    type="button"
                    disabled={!canAdvanceStep2}
                    onClick={() => setStep(3)}
                    className={`px-4 py-2 bg-[#BA4E20] hover:bg-[#9c3f19] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs ${
                      !canAdvanceStep2 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <span>Avançar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
                className="space-y-5 text-center py-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#fdf5f2] dark:bg-[#27272a] border border-[#BA4E20]/30 text-[#BA4E20] flex items-center justify-center mx-auto shadow-sm">
                  <Sparkles className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#09090b] dark:text-[#f4f4f5]">
                    Pronto, vamos começar!
                  </h3>
                  <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1 max-w-sm mx-auto leading-relaxed">
                    Seu perfil foi configurado. O Metope AI está pronto para auxiliar em seus estudos técnicos, leiaute e documentação.
                  </p>
                </div>

                <div className="p-3 bg-[#fafafa] dark:bg-[#121214] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-left text-xs space-y-1.5 max-w-sm mx-auto">
                  <div className="flex items-center justify-between text-[#71717a] dark:text-[#a1a1aa] text-[11px] font-mono">
                    <span>FUNÇÃO</span>
                    <span className="font-semibold text-[#09090b] dark:text-[#f4f4f5]">
                      {funcao === 'Outro' ? funcaoOutro : funcao}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#71717a] dark:text-[#a1a1aa] text-[11px] font-mono">
                    <span>OBJETIVOS</span>
                    <span className="font-semibold text-[#09090b] dark:text-[#f4f4f5]">
                      {objetivos.length} selecionados
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleComplete}
                    className={`w-full max-w-sm py-2.5 bg-[#BA4E20] hover:bg-[#9c3f19] text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${
                      isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Começar a usar</span>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
