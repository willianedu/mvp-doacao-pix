import React from 'react';
import { Moon, Sun } from 'lucide-react';

export type ActiveRoute = 'public' | 'checkout' | 'admin';

interface TopBarProps {
  activeRoute: ActiveRoute;
  isAdminAuthenticated: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onNavigateHome: (sectionId?: string) => void;
  onNavigateAdmin: () => void;
  onPrimaryAction: () => void;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeRoute,
  isAdminAuthenticated,
  isDarkMode,
  onToggleTheme,
  onNavigateHome,
  onNavigateAdmin,
  onPrimaryAction,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700 rounded"
        >
          Amigos da Mara
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <a
            href="/#campanha"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome('campanha');
            }}
            className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-2 ${
              activeRoute === 'public' ? 'text-slate-900 dark:text-white font-semibold' : ''
            }`}
          >
            Campanhas
          </a>
          <a
            href="/#como-funciona"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome('como-funciona');
            }}
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-2"
          >
            Como Funciona
          </a>
          <a
            href="/#apoiadores"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome('apoiadores');
            }}
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-2"
          >
            Transparência
          </a>
          <a
            href="/admin/doacoes"
            onClick={(e) => {
              e.preventDefault();
              onNavigateAdmin();
            }}
            className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-2 ${
              activeRoute === 'admin' ? 'text-sky-700 dark:text-sky-400 font-semibold' : ''
            }`}
          >
            Painel Admin
          </a>
        </nav>

        {/* Zone 3: Theme Toggle + Single Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
            aria-pressed={isDarkMode}
            title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" aria-hidden="true" />
            )}
          </button>

          {activeRoute !== 'admin' ? (
            <>
              <button
                type="button"
                onClick={onNavigateAdmin}
                className="md:hidden min-h-[44px] px-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-700 rounded-lg"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={onPrimaryAction}
                className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500 active:scale-[0.99] rounded-xl transition-all whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 cursor-pointer"
              >
                Apoiar Agora
              </button>
            </>
          ) : isAdminAuthenticated ? (
            <button
              type="button"
              onClick={onLogout}
              className="min-h-[44px] px-5 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer"
            >
              Sair
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateHome()}
              className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500 rounded-xl transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 cursor-pointer"
            >
              Ver Campanha
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
