import {
  AdminDashboardData,
  AdminUser,
  CampanhaPublica,
  PixCheckoutResponse,
} from '../types.ts';
import { StaticFallbackService } from './staticFallback.ts';

let staticModeDetected = false;

export function isStaticBackendMode(): boolean {
  return staticModeDetected;
}

class StaticHostUnavailableError extends Error {
  constructor() {
    super('STATIC_HOST_MODE');
  }
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  if (staticModeDetected) {
    throw new StaticHostUnavailableError();
  }

  let response: Response;
  try {
    response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      ...options,
    });
  } catch {
    // Only fall back to static mode if hosted on static hosting (e.g. GitHub Pages)
    if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
      staticModeDetected = true;
      throw new StaticHostUnavailableError();
    }
    throw new Error('Erro de conexão com o servidor.');
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  // Static hosts like GitHub Pages respond 404/405 with text/html for /api/* routes
  if (!isJson && (response.status === 404 || response.status === 405)) {
    staticModeDetected = true;
    throw new StaticHostUnavailableError();
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data?.error === 'string'
        ? data.error
        : 'Não foi possível concluir a solicitação.';
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return data as T;
}

async function withStaticFallback<T>(
  apiCall: () => Promise<T>,
  fallbackCall: () => Promise<T> | T
): Promise<T> {
  try {
    return await apiCall();
  } catch (err) {
    if (err instanceof StaticHostUnavailableError) {
      return await fallbackCall();
    }
    throw err;
  }
}

export const ApiService = {
  getPublicCampaigns(): Promise<{ campanhas: CampanhaPublica[] }> {
    return withStaticFallback(
      () => requestJson('/api/campanhas'),
      () => StaticFallbackService.getPublicCampaigns()
    );
  },

  createPixDonation(payload: {
    id_campanha: number;
    valor_doacao: number;
    nome_doador?: string;
  }): Promise<PixCheckoutResponse> {
    return withStaticFallback(
      () =>
        requestJson('/api/doacoes/pix', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      () => StaticFallbackService.createPixDonation(payload)
    );
  },

  updateDonationName(idDoacao: number, nomeDoador: string): Promise<{
    id_doacao: number;
    nome_doador: string | null;
  }> {
    return withStaticFallback(
      () =>
        requestJson(`/api/doacoes/${idDoacao}/nome`, {
          method: 'PATCH',
          body: JSON.stringify({ nome_doador: nomeDoador }),
        }),
      () => StaticFallbackService.updateDonationName(idDoacao, nomeDoador)
    );
  },

  getDonationStatus(idDoacao: number): Promise<PixCheckoutResponse & { updated_at: string }> {
    return withStaticFallback(
      () => requestJson(`/api/doacoes/${idDoacao}/status`),
      () => StaticFallbackService.getDonationStatus(idDoacao)
    );
  },

  simulateWebhookApproval(payload: { id_doacao: number; txid: string }): Promise<{
    received: boolean;
    updated: boolean;
    status_pagamento: string;
    valor_arrecadado: number;
  }> {
    return withStaticFallback(
      () =>
        requestJson('/api/webhooks/mercadopago', {
          method: 'POST',
          body: JSON.stringify({
            id_doacao: payload.id_doacao,
            txid: payload.txid,
            status: 'approved',
          }),
        }),
      () => StaticFallbackService.simulateWebhookApproval(payload)
    );
  },

  getAuthMe(): Promise<{ authenticated: boolean; admin: AdminUser | null }> {
    return withStaticFallback(
      () => requestJson('/api/auth/me'),
      () => StaticFallbackService.getAuthMe()
    );
  },

  loginAdmin(email: string, senha: string): Promise<{
    authenticated: boolean;
    admin: AdminUser;
  }> {
    return withStaticFallback(
      () =>
        requestJson('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, senha }),
        }),
      () => StaticFallbackService.loginAdmin(email, senha)
    );
  },

  logoutAdmin(): Promise<{ authenticated: boolean }> {
    return withStaticFallback(
      () =>
        requestJson('/api/auth/logout', {
          method: 'POST',
        }),
      () => StaticFallbackService.logoutAdmin()
    );
  },

  getAdminDashboard(params?: {
    status?: string;
    search?: string;
  }): Promise<AdminDashboardData> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'todas') {
      query.set('status', params.status);
    }
    if (params?.search && params.search.trim()) {
      query.set('search', params.search.trim());
    }
    const qs = query.toString();
    return withStaticFallback(
      () => requestJson(`/api/admin/dashboard${qs ? `?${qs}` : ''}`),
      () => StaticFallbackService.getAdminDashboard(params)
    );
  },

  getAdminDailyClosing(): Promise<{
    fecho_caixa: AdminDashboardData['fecho_caixa'];
  }> {
    return withStaticFallback(
      () => requestJson('/api/admin/fecho-caixa'),
      () => ({ fecho_caixa: StaticFallbackService.getAdminDashboard().fecho_caixa })
    );
  },

  verifyDonationFallback(idDoacao: number): Promise<{
    updated: boolean;
    message: string;
  }> {
    return withStaticFallback(
      () =>
        requestJson(`/api/admin/doacoes/${idDoacao}/verificar`, {
          method: 'POST',
        }),
      () => StaticFallbackService.verifyDonationFallback(idDoacao)
    );
  },

  expireDonation(idDoacao: number): Promise<{ donation: unknown }> {
    return withStaticFallback(
      () =>
        requestJson(`/api/admin/doacoes/${idDoacao}/expirar`, {
          method: 'POST',
        }),
      () => StaticFallbackService.expireDonation(idDoacao)
    );
  },

  createCampaign(payload: {
    titulo: string;
    descricao: string;
    meta_financeira: number;
    imagem_url?: string;
  }): Promise<{ campanha: unknown }> {
    return withStaticFallback(
      () =>
        requestJson('/api/admin/campanhas', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      () => StaticFallbackService.createCampaign(payload)
    );
  },

  updateCampaign(
    idCampanha: number,
    payload: {
      titulo?: string;
      descricao?: string;
      meta_financeira?: number;
      status_ativa?: boolean;
    }
  ): Promise<{ campanha: unknown }> {
    return withStaticFallback(
      () =>
        requestJson(`/api/admin/campanhas/${idCampanha}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }),
      () => StaticFallbackService.updateCampaign(idCampanha, payload)
    );
  },

  deleteCampaign(idCampanha: number): Promise<{ deleted: boolean }> {
    return withStaticFallback(
      () =>
        requestJson(`/api/admin/campanhas/${idCampanha}`, {
          method: 'DELETE',
        }),
      () => StaticFallbackService.deleteCampaign(idCampanha)
    );
  },
};
