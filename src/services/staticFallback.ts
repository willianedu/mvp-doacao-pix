import QRCode from 'qrcode';
import {
  AdminDashboardData,
  AdminUser,
  CampanhaPublica,
  DoacaoAdmin,
  PixCheckoutResponse,
  StatusPagamento,
} from '../types.ts';

interface StaticCampaignRecord {
  id_campanha: number;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  meta_financeira: number;
  valor_arrecadado: number;
  status_ativa: boolean;
  created_at: string;
}

interface StaticDonationRecord {
  id_doacao: number;
  id_campanha: number;
  valor_doacao: number;
  nome_doador: string | null;
  codigo_pix_gerado: string;
  txid: string;
  status_pagamento: StatusPagamento;
  created_at: string;
  updated_at: string;
}

interface StaticStore {
  campaigns: StaticCampaignRecord[];
  donations: StaticDonationRecord[];
  nextCampaignId: number;
  nextDonationId: number;
  adminAuthenticated: boolean;
}

const STORAGE_KEY = 'amigos_da_mara_static_store_v1';

const ADMIN_USER: AdminUser = {
  id_admin: 1,
  nome: 'Deusdália Guedes',
  email: 'admin@amigosdamara.org.br',
};

function createInitialStore(): StaticStore {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

  const campaigns: StaticCampaignRecord[] = [
    {
      id_campanha: 1,
      titulo: 'Dia das Crianças',
      descricao:
        'Arrecadação de brinquedos, kits escolares e cestas para as crianças atendidas pela O.S.C Amigos da Mara.',
      imagem_url: '/src/assets/images/campanha_dia_criancas_1794953497340.jpg',
      meta_financeira: 5000,
      valor_arrecadado: 3200,
      status_ativa: true,
      created_at: now.toISOString(),
    },
    {
      id_campanha: 2,
      titulo: 'Baile à Fantasia - Ingresso Solidário',
      descricao:
        'Ingressos solidários e apoio comunitário para o evento beneficente em prol das famílias da comunidade.',
      imagem_url: '/src/assets/images/campanha_baile_fantasia_1794953504665.jpg',
      meta_financeira: 4000,
      valor_arrecadado: 2500,
      status_ativa: true,
      created_at: now.toISOString(),
    },
  ];

  const donations: StaticDonationRecord[] = [
    {
      id_doacao: 1,
      id_campanha: 1,
      valor_doacao: 50,
      nome_doador: 'Maria Silva',
      codigo_pix_gerado: '00020126580014br.gov.bcb.pix0136amigosdamara@pix.org.br520400005303986540550.005802BR5919OSC AMIGOS DA MARA6009SAO PAULO62150511ADMDC202600016304ABCD',
      txid: 'ADMDC20260001',
      status_pagamento: 'aprovado',
      created_at: hoursAgo(0.5),
      updated_at: hoursAgo(0.5),
    },
    {
      id_doacao: 2,
      id_campanha: 1,
      valor_doacao: 150,
      nome_doador: 'Carlos Eduardo',
      codigo_pix_gerado: '00020126580014br.gov.bcb.pix0136amigosdamara@pix.org.br5204000053039865406150.005802BR5919OSC AMIGOS DA MARA6009SAO PAULO62150511ADMDC202600026304ABCD',
      txid: 'ADMDC20260002',
      status_pagamento: 'aprovado',
      created_at: hoursAgo(2),
      updated_at: hoursAgo(2),
    },
    {
      id_doacao: 3,
      id_campanha: 1,
      valor_doacao: 200,
      nome_doador: null,
      codigo_pix_gerado: '00020126580014br.gov.bcb.pix0136amigosdamara@pix.org.br5204000053039865406200.005802BR5919OSC AMIGOS DA MARA6009SAO PAULO62150511ADMDC202600036304ABCD',
      txid: 'ADMDC20260003',
      status_pagamento: 'aprovado',
      created_at: hoursAgo(5),
      updated_at: hoursAgo(5),
    },
    {
      id_doacao: 4,
      id_campanha: 1,
      valor_doacao: 2800,
      nome_doador: 'Apoiadores Comunitários',
      codigo_pix_gerado: '00020126580014br.gov.bcb.pix0136amigosdamara@pix.org.br52040000530398654072800.005802BR5919OSC AMIGOS DA MARA6009SAO PAULO62150511ADMDC202600046304ABCD',
      txid: 'ADMDC20260004',
      status_pagamento: 'aprovado',
      created_at: hoursAgo(16),
      updated_at: hoursAgo(16),
    },
    {
      id_doacao: 5,
      id_campanha: 2,
      valor_doacao: 2500,
      nome_doador: 'Participantes do Baile',
      codigo_pix_gerado: '00020126580014br.gov.bcb.pix0136amigosdamara@pix.org.br52040000530398654072500.005802BR5919OSC AMIGOS DA MARA6009SAO PAULO62150511ADMBF202600016304EF12',
      txid: 'ADMBF20260001',
      status_pagamento: 'aprovado',
      created_at: hoursAgo(8),
      updated_at: hoursAgo(8),
    },
  ];

  return {
    campaigns,
    donations,
    nextCampaignId: 3,
    nextDonationId: 6,
    adminAuthenticated: false,
  };
}

function loadStore(): StaticStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialStore();
      saveStore(initial);
      return initial;
    }
    return JSON.parse(raw) as StaticStore;
  } catch {
    return createInitialStore();
  }
}

function saveStore(store: StaticStore): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

function emvField(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

function computeCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildPixPayload(amount: number, txid: string): string {
  const merchantAccount = emvField(
    '26',
    emvField('00', 'br.gov.bcb.pix') + emvField('01', 'amigosdamara@pix.org.br')
  );
  const additionalData = emvField('62', emvField('05', txid));
  const raw =
    emvField('00', '01') +
    merchantAccount +
    emvField('52', '0000') +
    emvField('53', '986') +
    emvField('54', amount.toFixed(2)) +
    emvField('58', 'BR') +
    emvField('59', 'OSC AMIGOS DA MARA') +
    emvField('60', 'SAO PAULO') +
    additionalData +
    '6304';
  return raw + computeCrc16(raw);
}

export const StaticFallbackService = {
  getPublicCampaigns(): { campanhas: CampanhaPublica[] } {
    const store = loadStore();
    const campanhas = store.campaigns
      .filter((c) => c.status_ativa)
      .map((c) => {
        const recentes = store.donations
          .filter((d) => d.id_campanha === c.id_campanha && d.status_pagamento === 'aprovado')
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
          .slice(0, 8)
          .map((d) => ({
            id_doacao: d.id_doacao,
            nome_doador: d.nome_doador,
            valor_doacao: d.valor_doacao,
            updated_at: d.updated_at,
          }));

        return {
          ...c,
          percentual_atingido:
            c.meta_financeira > 0
              ? Math.min(100, Math.round((c.valor_arrecadado / c.meta_financeira) * 100))
              : 0,
          apoiadores_recentes: recentes,
        };
      });
    return { campanhas };
  },

  async createPixDonation(payload: {
    id_campanha: number;
    valor_doacao: number;
    nome_doador?: string;
  }): Promise<PixCheckoutResponse> {
    const store = loadStore();
    const campaign = store.campaigns.find(
      (c) => c.id_campanha === payload.id_campanha && c.status_ativa
    );
    if (!campaign) {
      throw new Error('Campanha não encontrada ou inativa.');
    }

    const valor = Math.round(payload.valor_doacao * 100) / 100;
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new Error('Informe um valor válido maior que zero.');
    }

    const id = store.nextDonationId;
    store.nextDonationId += 1;
    const txid = `TESTE${String(id).padStart(6, '0')}`;
    const codigoPix = buildPixPayload(valor, txid);
    const now = new Date().toISOString();

    const record: StaticDonationRecord = {
      id_doacao: id,
      id_campanha: campaign.id_campanha,
      valor_doacao: valor,
      nome_doador: payload.nome_doador?.trim() || null,
      codigo_pix_gerado: codigoPix,
      txid,
      status_pagamento: 'pendente',
      created_at: now,
      updated_at: now,
    };

    store.donations.unshift(record);
    saveStore(store);

    const qrDataUrl = await QRCode.toDataURL(codigoPix, { width: 280, margin: 2 });

    return {
      id_doacao: record.id_doacao,
      id_campanha: record.id_campanha,
      campanha_titulo: campaign.titulo,
      valor_doacao: record.valor_doacao,
      nome_doador: record.nome_doador,
      codigo_pix_gerado: record.codigo_pix_gerado,
      qr_code_data_url: qrDataUrl,
      txid: record.txid,
      status_pagamento: record.status_pagamento,
    };
  },

  updateDonationName(idDoacao: number, nomeDoador: string): {
    id_doacao: number;
    nome_doador: string | null;
  } {
    const store = loadStore();
    const donation = store.donations.find((d) => d.id_doacao === idDoacao);
    if (!donation) {
      throw new Error('Doação não encontrada.');
    }
    donation.nome_doador = nomeDoador.trim() || null;
    donation.updated_at = new Date().toISOString();
    saveStore(store);
    return { id_doacao: donation.id_doacao, nome_doador: donation.nome_doador };
  },

  async getDonationStatus(idDoacao: number): Promise<PixCheckoutResponse & { updated_at: string }> {
    const store = loadStore();
    const donation = store.donations.find((d) => d.id_doacao === idDoacao);
    if (!donation) {
      throw new Error('Doação não encontrada.');
    }
    const campaign = store.campaigns.find((c) => c.id_campanha === donation.id_campanha);
    const qrDataUrl = await QRCode.toDataURL(donation.codigo_pix_gerado, {
      width: 280,
      margin: 2,
    });
    return {
      id_doacao: donation.id_doacao,
      id_campanha: donation.id_campanha,
      campanha_titulo: campaign?.titulo || 'Campanha',
      valor_doacao: donation.valor_doacao,
      nome_doador: donation.nome_doador,
      codigo_pix_gerado: donation.codigo_pix_gerado,
      qr_code_data_url: qrDataUrl,
      txid: donation.txid,
      status_pagamento: donation.status_pagamento,
      updated_at: donation.updated_at,
    };
  },

  simulateWebhookApproval(payload: { id_doacao: number; txid: string }): {
    received: boolean;
    updated: boolean;
    status_pagamento: string;
    valor_arrecadado: number;
  } {
    const store = loadStore();
    const donation = store.donations.find(
      (d) => d.id_doacao === payload.id_doacao || d.txid === payload.txid
    );
    if (!donation) {
      throw new Error('Doação não encontrada.');
    }

    let updated = false;
    if (donation.status_pagamento !== 'aprovado') {
      donation.status_pagamento = 'aprovado';
      donation.updated_at = new Date().toISOString();
      updated = true;
    }

    const campaign = store.campaigns.find((c) => c.id_campanha === donation.id_campanha);
    if (campaign) {
      campaign.valor_arrecadado = store.donations
        .filter((d) => d.id_campanha === campaign.id_campanha && d.status_pagamento === 'aprovado')
        .reduce((sum, d) => sum + d.valor_doacao, 0);
    }

    saveStore(store);

    return {
      received: true,
      updated,
      status_pagamento: donation.status_pagamento,
      valor_arrecadado: campaign?.valor_arrecadado ?? 0,
    };
  },

  getAuthMe(): { authenticated: boolean; admin: AdminUser | null } {
    const store = loadStore();
    return {
      authenticated: store.adminAuthenticated,
      admin: store.adminAuthenticated ? ADMIN_USER : null,
    };
  },

  loginAdmin(email: string, senha: string): { authenticated: boolean; admin: AdminUser } {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== ADMIN_USER.email || senha !== 'AmigosDaMara2026') {
      const error = new Error('Credenciais inválidas.') as Error & { status?: number };
      error.status = 401;
      throw error;
    }
    const store = loadStore();
    store.adminAuthenticated = true;
    saveStore(store);
    return { authenticated: true, admin: ADMIN_USER };
  },

  logoutAdmin(): { authenticated: boolean } {
    const store = loadStore();
    store.adminAuthenticated = false;
    saveStore(store);
    return { authenticated: false };
  },

  getAdminDashboard(params?: { status?: string; search?: string }): AdminDashboardData {
    const store = loadStore();
    if (!store.adminAuthenticated) {
      const error = new Error('Acesso não autorizado.') as Error & { status?: number };
      error.status = 401;
      throw error;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const approvedDonations = store.donations.filter((d) => d.status_pagamento === 'aprovado');
    const approvedToday = approvedDonations.filter((d) => d.created_at.slice(0, 10) === todayStr);

    const totalAprovadas = approvedDonations.length;
    const totalPendentes = store.donations.filter((d) => d.status_pagamento === 'pendente').length;
    const totalExpiradas = store.donations.filter((d) => d.status_pagamento === 'expirado').length;
    const totalGeral = store.donations.length;

    const filteredDonations: DoacaoAdmin[] = store.donations
      .filter((d) => {
        if (params?.status && params.status !== 'todas' && d.status_pagamento !== params.status) {
          return false;
        }
        if (params?.search && params.search.trim()) {
          const term = params.search.trim().toLowerCase();
          const donor = (d.nome_doador || 'Apoiador anônimo').toLowerCase();
          return donor.includes(term) || d.txid.toLowerCase().includes(term);
        }
        return true;
      })
      .map((d) => ({
        ...d,
        campanha_titulo:
          store.campaigns.find((c) => c.id_campanha === d.id_campanha)?.titulo || 'Campanha',
      }));

    return {
      admin: ADMIN_USER,
      metricas: {
        total_arrecadado: approvedDonations.reduce((acc, d) => acc + d.valor_doacao, 0),
        total_aprovadas: totalAprovadas,
        total_pendentes: totalPendentes,
        total_expiradas: totalExpiradas,
        taxa_conversao: totalGeral > 0 ? Math.round((totalAprovadas / totalGeral) * 1000) / 10 : 0,
      },
      fecho_caixa: {
        total_hoje: approvedToday.reduce((acc, d) => acc + d.valor_doacao, 0),
        quantidade_hoje: approvedToday.length,
        data_referencia: todayStr,
      },
      campanhas: store.campaigns.map((c) => ({
        ...c,
        percentual_atingido:
          c.meta_financeira > 0
            ? Math.min(100, Math.round((c.valor_arrecadado / c.meta_financeira) * 100))
            : 0,
      })),
      doacoes: filteredDonations,
    };
  },

  verifyDonationFallback(idDoacao: number): { updated: boolean; message: string } {
    const res = this.simulateWebhookApproval({ id_doacao: idDoacao, txid: '' });
    return {
      updated: res.updated,
      message: res.updated
        ? 'Pagamento Pix confirmado e meta da campanha atualizada.'
        : 'Doação já aprovada.',
    };
  },

  expireDonation(idDoacao: number): { donation: StaticDonationRecord } {
    const store = loadStore();
    const donation = store.donations.find((d) => d.id_doacao === idDoacao);
    if (!donation) {
      throw new Error('Doação não encontrada.');
    }
    if (donation.status_pagamento !== 'aprovado') {
      donation.status_pagamento = 'expirado';
      donation.updated_at = new Date().toISOString();
      saveStore(store);
    }
    return { donation };
  },

  createCampaign(payload: {
    titulo: string;
    descricao: string;
    meta_financeira: number;
  }): { campanha: StaticCampaignRecord } {
    const store = loadStore();
    const record: StaticCampaignRecord = {
      id_campanha: store.nextCampaignId,
      titulo: payload.titulo.trim(),
      descricao: payload.descricao.trim() || null,
      imagem_url: null,
      meta_financeira: payload.meta_financeira,
      valor_arrecadado: 0,
      status_ativa: true,
      created_at: new Date().toISOString(),
    };
    store.nextCampaignId += 1;
    store.campaigns.unshift(record);
    saveStore(store);
    return { campanha: record };
  },

  updateCampaign(
    idCampanha: number,
    payload: {
      titulo?: string;
      descricao?: string;
      meta_financeira?: number;
      status_ativa?: boolean;
    }
  ): { campanha: StaticCampaignRecord } {
    const store = loadStore();
    const campaign = store.campaigns.find((c) => c.id_campanha === idCampanha);
    if (!campaign) {
      throw new Error('Campanha não encontrada.');
    }
    if (payload.titulo !== undefined) campaign.titulo = payload.titulo;
    if (payload.descricao !== undefined) campaign.descricao = payload.descricao;
    if (payload.meta_financeira !== undefined) campaign.meta_financeira = payload.meta_financeira;
    if (payload.status_ativa !== undefined) campaign.status_ativa = payload.status_ativa;
    saveStore(store);
    return { campanha: campaign };
  },

  deleteCampaign(idCampanha: number): { deleted: boolean } {
    const store = loadStore();
    store.campaigns = store.campaigns.filter((c) => c.id_campanha !== idCampanha);
    saveStore(store);
    return { deleted: true };
  },
};
