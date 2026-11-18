export type StatusPagamento = 'pendente' | 'aprovado' | 'expirado';

export interface ApoiadorRecente {
  id_doacao: number;
  nome_doador: string | null;
  valor_doacao: number;
  updated_at: string;
}

export interface CampanhaPublica {
  id_campanha: number;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  meta_financeira: number;
  valor_arrecadado: number;
  status_ativa: boolean;
  percentual_atingido: number;
  created_at: string;
  apoiadores_recentes: ApoiadorRecente[];
}

export interface PixCheckoutResponse {
  id_doacao: number;
  id_campanha: number;
  campanha_titulo: string;
  valor_doacao: number;
  nome_doador: string | null;
  codigo_pix_gerado: string;
  qr_code_data_url: string;
  txid: string;
  status_pagamento: StatusPagamento;
}

export interface AdminUser {
  id_admin: number;
  nome: string;
  email: string;
}

export interface DoacaoAdmin {
  id_doacao: number;
  id_campanha: number;
  campanha_titulo: string;
  valor_doacao: number;
  nome_doador: string | null;
  codigo_pix_gerado: string;
  txid: string;
  status_pagamento: StatusPagamento;
  created_at: string;
  updated_at: string;
}

export interface DailyClosingSummary {
  total_hoje: number;
  quantidade_hoje: number;
  data_referencia: string;
}

export interface AdminDashboardData {
  admin: AdminUser;
  metricas: {
    total_arrecadado: number;
    total_aprovadas: number;
    total_pendentes: number;
    total_expiradas: number;
    taxa_conversao: number;
  };
  fecho_caixa: DailyClosingSummary;
  campanhas: Array<Omit<CampanhaPublica, 'apoiadores_recentes'>>;
  doacoes: DoacaoAdmin[];
}
