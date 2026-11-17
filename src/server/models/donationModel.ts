import { db } from '../db.ts';
import { invalidateCampaignCache } from './campaignModel.ts';

export type StatusPagamento = 'pendente' | 'aprovado' | 'expirado';

export interface Doacao {
  id_doacao: number;
  id_campanha: number;
  valor_doacao: number;
  nome_doador: string | null;
  codigo_pix_gerado: string;
  txid: string;
  external_payment_id: string | null;
  status_pagamento: StatusPagamento;
  created_at: string;
  updated_at: string;
}

export interface DoacaoComCampanha extends Doacao {
  campanha_titulo: string;
}

export const DonationModel = {
  create(input: {
    id_campanha: number;
    valor_doacao: number;
    nome_doador: string | null;
    codigo_pix_gerado: string;
    txid: string;
    external_payment_id: string | null;
  }): Doacao {
    const now = new Date().toISOString();
    const res = db
      .prepare(
        `INSERT INTO doacoes (id_campanha, valor_doacao, nome_doador, codigo_pix_gerado, txid, external_payment_id, status_pagamento, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`
      )
      .run(
        input.id_campanha,
        input.valor_doacao,
        input.nome_doador,
        input.codigo_pix_gerado,
        input.txid,
        input.external_payment_id,
        now,
        now
      );

    return this.getById(Number(res.lastInsertRowid))!;
  },

  getById(id: number): Doacao | undefined {
    return db
      .prepare(
        `SELECT id_doacao, id_campanha, valor_doacao, nome_doador, codigo_pix_gerado, txid, external_payment_id, status_pagamento, created_at, updated_at
         FROM doacoes
         WHERE id_doacao = ?`
      )
      .get(id) as Doacao | undefined;
  },

  getByTxid(txid: string): Doacao | undefined {
    return db
      .prepare(
        `SELECT id_doacao, id_campanha, valor_doacao, nome_doador, codigo_pix_gerado, txid, external_payment_id, status_pagamento, created_at, updated_at
         FROM doacoes
         WHERE txid = ?`
      )
      .get(txid) as Doacao | undefined;
  },

  getByExternalPaymentId(externalPaymentId: string): Doacao | undefined {
    return db
      .prepare(
        `SELECT id_doacao, id_campanha, valor_doacao, nome_doador, codigo_pix_gerado, txid, external_payment_id, status_pagamento, created_at, updated_at
         FROM doacoes
         WHERE external_payment_id = ?`
      )
      .get(externalPaymentId) as Doacao | undefined;
  },

  updateDonorName(id: number, nomeDoador: string | null): Doacao | undefined {
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE doacoes SET nome_doador = ?, updated_at = ? WHERE id_doacao = ?`
    ).run(nomeDoador, now, id);
    return this.getById(id);
  },

  listRecentApprovedByCampaign(idCampanha: number, limit = 8): Array<{
    id_doacao: number;
    nome_doador: string | null;
    valor_doacao: number;
    updated_at: string;
  }> {
    return db
      .prepare(
        `SELECT id_doacao, nome_doador, valor_doacao, updated_at
         FROM doacoes
         WHERE id_campanha = ? AND status_pagamento = 'aprovado'
         ORDER BY updated_at DESC, id_doacao DESC
         LIMIT ?`
      )
      .all(idCampanha, limit) as Array<{
      id_doacao: number;
      nome_doador: string | null;
      valor_doacao: number;
      updated_at: string;
    }>;
  },

  listAllWithCampaign(filters?: {
    status?: string;
    id_campanha?: number;
    search?: string;
  }): DoacaoComCampanha[] {
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (filters?.status && ['pendente', 'aprovado', 'expirado'].includes(filters.status)) {
      conditions.push('d.status_pagamento = ?');
      params.push(filters.status);
    }

    if (filters?.id_campanha) {
      conditions.push('d.id_campanha = ?');
      params.push(filters.id_campanha);
    }

    if (filters?.search && filters.search.trim().length > 0) {
      conditions.push('(COALESCE(d.nome_doador, "Anônimo") LIKE ? OR d.txid LIKE ?)');
      const pattern = `%${filters.search.trim()}%`;
      params.push(pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return db
      .prepare(
        `SELECT d.id_doacao, d.id_campanha, d.valor_doacao, d.nome_doador, d.codigo_pix_gerado,
                d.txid, d.external_payment_id, d.status_pagamento, d.created_at, d.updated_at,
                c.titulo AS campanha_titulo
         FROM doacoes d
         INNER JOIN campanhas c ON c.id_campanha = d.id_campanha
         ${whereClause}
         ORDER BY d.updated_at DESC, d.id_doacao DESC
         LIMIT 250`
      )
      .all(...params) as DoacaoComCampanha[];
  },

  /**
   * Atomically transitions a pending donation to 'aprovado' and increments
   * the parent campaign's valor_arrecadado (RF02 + RF03).
   */
  approveAtomic(idDoacao: number): { updated: boolean; donation: Doacao | undefined } {
    const tx = db.transaction((id: number) => {
      const donation = db
        .prepare(
          `SELECT id_doacao, id_campanha, valor_doacao, nome_doador, codigo_pix_gerado, txid, external_payment_id, status_pagamento, created_at, updated_at
           FROM doacoes WHERE id_doacao = ?`
        )
        .get(id) as Doacao | undefined;

      if (!donation) {
        return { updated: false, donation: undefined };
      }

      if (donation.status_pagamento === 'aprovado') {
        return { updated: false, donation };
      }

      const now = new Date().toISOString();
      db.prepare(
        `UPDATE doacoes SET status_pagamento = 'aprovado', updated_at = ? WHERE id_doacao = ?`
      ).run(now, id);

      // Recalculate exact sum of approved donations to guarantee zero drift (RF03)
      const sumRow = db
        .prepare(
          `SELECT COALESCE(SUM(valor_doacao), 0) AS total
           FROM doacoes
           WHERE id_campanha = ? AND status_pagamento = 'aprovado'`
        )
        .get(donation.id_campanha) as { total: number };

      db.prepare(
        `UPDATE campanhas SET valor_arrecadado = ? WHERE id_campanha = ?`
      ).run(sumRow.total, donation.id_campanha);

      const updatedDonation = db
        .prepare(
          `SELECT id_doacao, id_campanha, valor_doacao, nome_doador, codigo_pix_gerado, txid, external_payment_id, status_pagamento, created_at, updated_at
           FROM doacoes WHERE id_doacao = ?`
        )
        .get(id) as Doacao;

      return { updated: true, donation: updatedDonation };
    });

    const result = tx(idDoacao);
    if (result.updated) {
      invalidateCampaignCache();
    }
    return result;
  },

  markExpired(idDoacao: number): Doacao | undefined {
    const donation = this.getById(idDoacao);
    if (!donation || donation.status_pagamento === 'aprovado') {
      return donation;
    }
    const now = new Date().toISOString();
    db.prepare(
      `UPDATE doacoes SET status_pagamento = 'expirado', updated_at = ? WHERE id_doacao = ?`
    ).run(now, idDoacao);
    return this.getById(idDoacao);
  },

  getAdminMetrics(): {
    total_arrecadado: number;
    total_aprovadas: number;
    total_pendentes: number;
    total_expiradas: number;
    taxa_conversao: number;
  } {
    const stats = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN status_pagamento = 'aprovado' THEN valor_doacao ELSE 0 END), 0) AS total_arrecadado,
           COUNT(CASE WHEN status_pagamento = 'aprovado' THEN 1 END) AS total_aprovadas,
           COUNT(CASE WHEN status_pagamento = 'pendente' THEN 1 END) AS total_pendentes,
           COUNT(CASE WHEN status_pagamento = 'expirado' THEN 1 END) AS total_expiradas,
           COUNT(*) AS total_geral
         FROM doacoes`
      )
      .get() as {
      total_arrecadado: number;
      total_aprovadas: number;
      total_pendentes: number;
      total_expiradas: number;
      total_geral: number;
    };

    const taxaConversao =
      stats.total_geral > 0
        ? Math.round((stats.total_aprovadas / stats.total_geral) * 1000) / 10
        : 0;

    return {
      total_arrecadado: stats.total_arrecadado,
      total_aprovadas: stats.total_aprovadas,
      total_pendentes: stats.total_pendentes,
      total_expiradas: stats.total_expiradas,
      taxa_conversao: taxaConversao,
    };
  },
};
