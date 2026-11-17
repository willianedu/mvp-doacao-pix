import { useCallback, useEffect, useState } from 'react';
import { AdminDashboardView } from './components/AdminDashboardView.tsx';
import { AdminLoginView } from './components/AdminLoginView.tsx';
import { CampaignPublicView } from './components/CampaignPublicView.tsx';
import { CheckoutPixView } from './components/CheckoutPixView.tsx';
import { ActiveRoute, TopBar } from './components/TopBar.tsx';
import { ApiService } from './services/api.ts';
import { AdminUser, CampanhaPublica, PixCheckoutResponse } from './types.ts';

function resolveRouteFromPath(pathname: string): ActiveRoute {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/checkout')) return 'checkout';
  return 'public';
}

export default function App() {
  const [route, setRoute] = useState<ActiveRoute>(() =>
    resolveRouteFromPath(window.location.pathname)
  );
  const [campanhas, setCampanhas] = useState<CampanhaPublica[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState<boolean>(true);
  const [isGeneratingPix, setIsGeneratingPix] = useState<boolean>(false);
  const [publicError, setPublicError] = useState<string | null>(null);

  const [checkoutData, setCheckoutData] = useState<PixCheckoutResponse | null>(null);

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [adminRefreshSignal, setAdminRefreshSignal] = useState<number>(0);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem('amigos_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    try {
      window.localStorage.setItem('amigos_theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => setIsDarkMode((prev) => !prev);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await ApiService.getPublicCampaigns();
      setCampanhas(res.campanhas);
      setSelectedCampaignId((prev) => {
        if (prev && res.campanhas.some((c) => c.id_campanha === prev)) {
          return prev;
        }
        return res.campanhas[0]?.id_campanha ?? null;
      });
    } catch (err) {
      setPublicError(
        err instanceof Error ? err.message : 'Não foi possível carregar as campanhas.'
      );
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, []);

  const checkAdminSession = useCallback(async () => {
    try {
      const res = await ApiService.getAuthMe();
      setAdminUser(res.authenticated ? res.admin : null);
    } catch {
      setAdminUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
    checkAdminSession();
  }, [loadCampaigns, checkAdminSession]);

  // Listen to browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const next = resolveRouteFromPath(window.location.pathname);
      if (next === 'checkout' && !checkoutData) {
        setRoute('public');
        return;
      }
      setRoute(next);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [checkoutData]);

  // Real-time Server-Sent Events (RF02 + RF03)
  useEffect(() => {
    const evtSource = new EventSource('/api/events');

    const handleRealtimeChange = () => {
      loadCampaigns();
      setAdminRefreshSignal((n) => n + 1);
    };

    evtSource.addEventListener('donation_approved', handleRealtimeChange);
    evtSource.addEventListener('donation_created', () => {
      setAdminRefreshSignal((n) => n + 1);
    });
    evtSource.addEventListener('donation_updated', handleRealtimeChange);
    evtSource.addEventListener('campaign_updated', handleRealtimeChange);

    return () => {
      evtSource.close();
    };
  }, [loadCampaigns]);

  const navigateTo = (path: string, nextRoute: ActiveRoute) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setRoute(nextRoute);
  };

  const handleNavigateHome = (sectionId?: string) => {
    navigateTo('/', 'public');
    if (sectionId) {
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavigateAdmin = async () => {
    await checkAdminSession();
    navigateTo('/admin/doacoes', 'admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToCheckout = async (campaign: CampanhaPublica, amount: number) => {
    setIsGeneratingPix(true);
    setPublicError(null);
    try {
      const pix = await ApiService.createPixDonation({
        id_campanha: campaign.id_campanha,
        valor_doacao: amount,
      });
      setCheckoutData(pix);
      navigateTo('/checkout', 'checkout');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setPublicError(
        err instanceof Error ? err.message : 'Não foi possível gerar o código Pix.'
      );
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const handleTopBarPrimaryAction = () => {
    if (route === 'public') {
      const campaignEl = document.getElementById('campanha');
      if (campaignEl) {
        campaignEl.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    handleNavigateHome('campanha');
  };

  const handleLogout = async () => {
    try {
      await ApiService.logoutAdmin();
    } finally {
      setAdminUser(null);
      navigateTo('/', 'public');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <TopBar
        activeRoute={route}
        isAdminAuthenticated={Boolean(adminUser)}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onNavigateHome={handleNavigateHome}
        onNavigateAdmin={handleNavigateAdmin}
        onPrimaryAction={handleTopBarPrimaryAction}
        onLogout={handleLogout}
      />

      <div className="flex-1">
        {route === 'public' && (
          <CampaignPublicView
            campanhas={campanhas}
            selectedCampaignId={selectedCampaignId}
            onSelectCampaign={setSelectedCampaignId}
            onProceedToCheckout={handleProceedToCheckout}
            isLoading={isLoadingCampaigns}
            isSubmitting={isGeneratingPix}
            serverError={publicError}
          />
        )}

        {route === 'checkout' && checkoutData && (
          <CheckoutPixView
            checkout={checkoutData}
            onBack={() => {
              loadCampaigns();
              handleNavigateHome();
            }}
            onStatusApproved={loadCampaigns}
          />
        )}

        {route === 'checkout' && !checkoutData && (
          <CampaignPublicView
            campanhas={campanhas}
            selectedCampaignId={selectedCampaignId}
            onSelectCampaign={setSelectedCampaignId}
            onProceedToCheckout={handleProceedToCheckout}
            isLoading={isLoadingCampaigns}
            isSubmitting={isGeneratingPix}
            serverError={publicError}
          />
        )}

        {route === 'admin' && (
          isCheckingAuth ? (
            <main className="max-w-md mx-auto px-4 py-16 text-center text-sm text-slate-600 dark:text-slate-400">
              Verificando sessão segura...
            </main>
          ) : adminUser ? (
            <AdminDashboardView
              refreshSignal={adminRefreshSignal}
              onAuthExpired={() => setAdminUser(null)}
              onCampaignChanged={loadCampaigns}
            />
          ) : (
            <AdminLoginView
              onLoginSuccess={(admin) => {
                setAdminUser(admin);
                navigateTo('/admin/doacoes', 'admin');
              }}
              onCancel={() => handleNavigateHome()}
            />
          )
        )}
      </div>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-4 sm:px-6 mt-12 transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <p>
            O.S.C Amigos da Mara · Plataforma de Doações e Engajamento Pix (ODS 1 — Erradicação da Pobreza)
          </p>
          <div className="flex items-center gap-4">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleNavigateHome();
              }}
              className="hover:text-slate-900 dark:hover:text-slate-100 underline-offset-4 hover:underline"
            >
              Portal Público
            </a>
            <a
              href="/admin/doacoes"
              onClick={(e) => {
                e.preventDefault();
                handleNavigateAdmin();
              }}
              className="hover:text-slate-900 dark:hover:text-slate-100 underline-offset-4 hover:underline"
            >
              Acesso Administrativo
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
