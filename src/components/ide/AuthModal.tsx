'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { signInWithPassword, signInWithGoogle, signUpWithPassword } from '@/lib/auth';
import { X, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called right after a successful sign-up (not sign-in) so the caller can
   * trigger the local-project migration exactly once. */
  onSignedUp?: () => void;
}

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export function AuthModal({ isOpen, onClose, onSignedUp }: AuthModalProps) {
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Rate Limiting Protection (cooldown of 2 seconds between attempts)
    const now = Date.now();
    if (now - lastSubmitTime < 2000) {
      setError('Por favor, aguarde um instante antes de tentar novamente.');
      return;
    }
    setLastSubmitTime(now);

    // Field Validations
    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (flow === 'signUp') {
      if (!username.trim()) {
        setError('O nome de usuário é obrigatório.');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }
      if (password.length < 6) {
        setError('A senha deve conter no mínimo 6 caracteres.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (flow === 'signIn') {
        const { error: err } = await signInWithPassword(email, password);
        if (err) throw err;
      } else {
        const { error: err } = await signUpWithPassword(email.trim(), password, username);
        if (err) throw err;
        onSignedUp?.();
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha na autenticação.';
      // Error sanitization
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('E-mail ou senha incorretos.');
      } else if (msg.toLowerCase().includes('user already registered')) {
        setError('Este e-mail já está cadastrado.');
      } else {
        setError('Ocorreu um erro ao processar sua solicitação. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    setError(null);
    try {
      const { error: err } = await signInWithGoogle();
      if (err) throw err;
    } catch {
      setError('Não foi possível conectar com o Google no momento.');
    }
  };

  const switchFlow = (newFlow: 'signIn' | 'signUp') => {
    setError(null);
    setFlow(newFlow);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 font-sans text-[#09090b] dark:text-[#f4f4f5]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl w-full max-w-[380px] shadow-2xl overflow-hidden"
      >
        
        {/* Header Section */}
        <div className="p-6 pb-2 relative text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] text-[#71717a] hover:text-[#09090b] dark:hover:text-[#f4f4f5] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          
          <h2 className="text-xl font-bold tracking-tight text-[#09090b] dark:text-[#f4f4f5]">
            {flow === 'signIn' ? 'Entrar na sua conta' : 'Criar uma conta'}
          </h2>
          <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1">
            {flow === 'signIn'
              ? 'Insira seus dados de acesso para continuar.'
              : 'Preencha suas informações para se cadastrar.'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 pt-3 space-y-4">
          
          {/* Top Google Social Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleClick}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white dark:bg-[#27272a] hover:bg-[#f8f9fa] dark:hover:bg-[#3f3f46] border border-[#e4e4e7] dark:border-[#3f3f46] hover:border-[#d4d4d8] text-xs font-semibold text-[#09090b] dark:text-[#f4f4f5] rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <GoogleIcon />
            <span>Continuar com Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-[#e4e4e7] dark:border-[#27272a] w-full" />
            <span className="bg-white dark:bg-[#18181b] px-3 text-[11px] font-mono uppercase text-[#a1a1aa] absolute">
              ou
            </span>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Username field (Only on SignUp) */}
            {flow === 'signUp' && (
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nome de usuário"
                  className="w-full bg-white dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] focus:border-[#BA4E20] focus:ring-1 focus:ring-[#BA4E20] text-xs text-[#09090b] dark:text-[#f4f4f5] px-3.5 py-2.5 rounded-xl focus:outline-none placeholder-[#a1a1aa] transition-colors"
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail"
                className="w-full bg-white dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] focus:border-[#BA4E20] focus:ring-1 focus:ring-[#BA4E20] text-xs text-[#09090b] dark:text-[#f4f4f5] px-3.5 py-2.5 rounded-xl focus:outline-none placeholder-[#a1a1aa] transition-colors"
              />
            </div>

            {/* Password Field */}
            <div>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={flow === 'signUp' ? 'Criar senha (mín. 8 caracteres)' : 'Sua senha'}
                className="w-full bg-white dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] focus:border-[#BA4E20] focus:ring-1 focus:ring-[#BA4E20] text-xs text-[#09090b] dark:text-[#f4f4f5] px-3.5 py-2.5 rounded-xl focus:outline-none placeholder-[#a1a1aa] transition-colors"
              />
            </div>

            {/* Confirm Password Field (Only on SignUp) */}
            {flow === 'signUp' && (
              <div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar senha"
                  className="w-full bg-white dark:bg-[#27272a] border border-[#e4e4e7] dark:border-[#3f3f46] focus:border-[#BA4E20] focus:ring-1 focus:ring-[#BA4E20] text-xs text-[#09090b] dark:text-[#f4f4f5] px-3.5 py-2.5 rounded-xl focus:outline-none placeholder-[#a1a1aa] transition-colors"
                />
              </div>
            )}

            {/* Error Feedback Banner */}
            {error && (
              <div className="text-[11px] text-[#BA4E20] bg-[#fdf5f2] dark:bg-[#BA4E20]/10 border border-[#BA4E20]/30 rounded-lg p-2.5 text-center font-medium">
                {error}
              </div>
            )}

            {/* Primary Action CTA Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 mt-2 bg-[#BA4E20] hover:bg-[#9c3f19] text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-2xs ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{flow === 'signIn' ? 'Entrar' : 'Criar conta'}</span>
            </button>
          </form>

          {/* Toggle Flow Switch Link at Bottom */}
          <div className="text-center pt-2 text-xs text-[#71717a] dark:text-[#a1a1aa]">
            {flow === 'signIn' ? (
              <span>
                Não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => switchFlow('signUp')}
                  className="text-[#BA4E20] font-semibold hover:underline cursor-pointer"
                >
                  Registrar agora
                </button>
              </span>
            ) : (
              <span>
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => switchFlow('signIn')}
                  className="text-[#BA4E20] font-semibold hover:underline cursor-pointer"
                >
                  Entrar
                </button>
              </span>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}
