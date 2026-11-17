import React, { useState } from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import { ApiService } from '../services/api.ts';
import { AdminUser } from '../types.ts';

interface AdminLoginViewProps {
  onLoginSuccess: (admin: AdminUser) => void;
  onCancel: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  onCancel,
}) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await ApiService.loginAdmin(email, senha);
      if (res.authenticated && res.admin) {
        onLoginSuccess(res.admin);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Credenciais inválidas. Verifique e-mail e senha.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-800 dark:text-sky-300 shrink-0">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
              Painel Administrativo
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Acesso restrito à equipe da O.S.C Amigos da Mara
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="admin-email"
              className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
            >
              E-mail do administrador
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@amigosdamara.org.br"
              className="w-full min-h-[48px] px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-sky-700 dark:focus:border-sky-500 rounded-xl text-base text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
            >
              Senha
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full min-h-[48px] px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-sky-700 dark:focus:border-sky-500 rounded-xl text-base text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-sm font-medium"
            >
              <AlertCircle className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[50px] px-6 py-3 rounded-xl bg-sky-700 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500 disabled:bg-sky-400 dark:disabled:bg-sky-800 text-white font-display text-base font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar no Painel'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Voltar para a página pública
          </button>
        </form>

        <p className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Sessão protegida com hash bcrypt e expiração automática após 2 horas de inatividade.
        </p>
      </div>
    </main>
  );
};
