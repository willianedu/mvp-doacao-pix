import { db } from '../db.ts';

export interface Campanha {
  id_campanha: number;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  meta_financeira: number;
  valor_arrecadado: number;
  status_ativa: number;
  created_at: string;
}

// In-memory cache for active campaign totals (RNF03 Optimization)
let activeCampaignsCache: Campanha[] | null = null;

export function invalidateCampaignCache(): void {
  activeCampaignsCache = null;
}

export const CampaignModel = {
  listActive(): Campanha[] {
    if (activeCampaignsCache !== null) {
      return activeCampaignsCache;
    }
    const rows = db
      .prepare(
        `SELECT id_campanha, titulo, descricao, imagem_url, meta_financeira, valor_arrecadado, status_ativa, created_at
         FROM campanhas
         WHERE status_ativa = 1
         ORDER BY id_campanha ASC`
      )
      .all() as Campanha[];
    activeCampaignsCache = rows;
    return rows;
  },

  listAll(): Campanha[] {
    return db
      .prepare(
        `SELECT id_campanha, titulo, descricao, imagem_url, meta_financeira, valor_arrecadado, status_ativa, created_at
         FROM campanhas
         ORDER BY status_ativa DESC, id_campanha DESC`
      )
      .all() as Campanha[];
  },

  getById(id: number): Campanha | undefined {
    return db
      .prepare(
        `SELECT id_campanha, titulo, descricao, imagem_url, meta_financeira, valor_arrecadado, status_ativa, created_at
         FROM campanhas
         WHERE id_campanha = ?`
      )
      .get(id) as Campanha | undefined;
  },

  getByTitle(titulo: string): Campanha | undefined {
    return db
      .prepare(
        `SELECT id_campanha, titulo, descricao, imagem_url, meta_financeira, valor_arrecadado, status_ativa, created_at
         FROM campanhas
         WHERE LOWER(titulo) = LOWER(?)`
      )
      .get(titulo.trim()) as Campanha | undefined;
  },

  create(input: {
    titulo: string;
    descricao: string | null;
    imagem_url: string | null;
    meta_financeira: number;
  }): Campanha {
    const now = new Date().toISOString();
    const res = db
      .prepare(
        `INSERT INTO campanhas (titulo, descricao, imagem_url, meta_financeira, valor_arrecadado, status_ativa, created_at)
         VALUES (?, ?, ?, ?, 0, 1, ?)`
      )
      .run(
        input.titulo.trim(),
        input.descricao ? input.descricao.trim() : null,
        input.imagem_url || '/src/assets/images/campanha_dia_criancas_1794953497340.jpg',
        input.meta_financeira,
        now
      );

    invalidateCampaignCache();
    return this.getById(Number(res.lastInsertRowid))!;
  },

  update(
    id: number,
    input: {
      titulo?: string;
      descricao?: string | null;
      meta_financeira?: number;
      status_ativa?: boolean;
    }
  ): Campanha | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;

    const nextTitle = input.titulo !== undefined ? input.titulo.trim() : existing.titulo;
    const nextDesc =
      input.descricao !== undefined
        ? input.descricao
          ? input.descricao.trim()
          : null
        : existing.descricao;
    const nextGoal =
      input.meta_financeira !== undefined ? input.meta_financeira : existing.meta_financeira;
    const nextActive =
      input.status_ativa !== undefined ? (input.status_ativa ? 1 : 0) : existing.status_ativa;

    db.prepare(
      `UPDATE campanhas
       SET titulo = ?, descricao = ?, meta_financeira = ?, status_ativa = ?
       WHERE id_campanha = ?`
    ).run(nextTitle, nextDesc, nextGoal, nextActive, id);

    invalidateCampaignCache();
    return this.getById(id);
  },

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM campanhas WHERE id_campanha = ?').run(id);
    invalidateCampaignCache();
    return result.changes > 0;
  },
};
