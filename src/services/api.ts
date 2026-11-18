import {
  AdminDashboardData,
  AdminUser,
  CampanhaPublica,
  PixCheckoutResponse,
} from '../types.ts';

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

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

export const ApiService = {
  getPublicCampaigns(): Promise<{ campanhas: CampanhaPublica[] }> {
    return requestJson('/api/campanhas');
  },

  createPixDonation(payload: {
    id_campanha: number;
    valor_doacao: number;
    nome_doador?: string;
  }): Promise<PixCheckoutResponse> {
    return requestJson('/api/doacoes/pix', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateDonationName(idDoacao: number, nomeDoador: string): Promise<{
    id_doacao: number;
    nome_doador: string | null;
  }> {
    return requestJson(`/api/doacoes/${idDoacao}/nome`, {
      method: 'PATCH',
      body: JSON.stringify({ nome_doador: nomeDoador }),
    });
  },

  getDonationStatus(idDoacao: number): Promise<PixCheckoutResponse & { updated_at: string }> {
    return requestJson(`/api/doacoes/${idDoacao}/status`);
  },

  simulateWebhookApproval(payload: { id_doacao: number; txid: string }): Promise<{
    received: boolean;
    updated: boolean;
    status_pagamento: string;
    valor_arrecadado: number;
  }> {
    return requestJson('/api/webhooks/mercadopago', {
      method: 'POST',
      body: JSON.stringify({
        id_doacao: payload.id_doacao,
        txid: payload.txid,
        status: 'approved',
      }),
    });
  },

  getAuthMe(): Promise<{ authenticated: boolean; admin: AdminUser | null }> {
    return requestJson('/api/auth/me');
  },

  loginAdmin(email: string, senha: string): Promise<{
    authenticated: boolean;
    admin: AdminUser;
  }> {
    return requestJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });
  },

  logoutAdmin(): Promise<{ authenticated: boolean }> {
    return requestJson('/api/auth/logout', {
      method: 'POST',
    });
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
    return requestJson(`/api/admin/dashboard${qs ? `?${qs}` : ''}`);
  },

  getAdminDailyClosing(): Promise<{
    fecho_caixa: AdminDashboardData['fecho_caixa'];
  }> {
    return requestJson('/api/admin/fecho-caixa');
  },

  verifyDonationFallback(idDoacao: number): Promise<{
    updated: boolean;
    message: string;
  }> {
    return requestJson(`/api/admin/doacoes/${idDoacao}/verificar`, {
      method: 'POST',
    });
  },

  expireDonation(idDoacao: number): Promise<{ donation: unknown }> {
    return requestJson(`/api/admin/doacoes/${idDoacao}/expirar`, {
      method: 'POST',
    });
  },

  createCampaign(payload: {
    titulo: string;
    descricao: string;
    meta_financeira: number;
    imagem_url?: string;
  }): Promise<{ campanha: unknown }> {
    return requestJson('/api/admin/campanhas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
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
    return requestJson(`/api/admin/campanhas/${idCampanha}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteCampaign(idCampanha: number): Promise<{ deleted: boolean }> {
    return requestJson(`/api/admin/campanhas/${idCampanha}`, {
      method: 'DELETE',
    });
  },
};
