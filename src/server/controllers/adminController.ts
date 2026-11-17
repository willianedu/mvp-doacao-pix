import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { CampaignModel } from '../models/campaignModel.ts';
import { DonationModel } from '../models/donationModel.ts';
import { broadcastEvent } from '../utils/events.ts';

export const AdminController = {
  getDashboard(req: AuthenticatedRequest, res: Response): void {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const campaignFilter = req.query.id_campanha ? Number(req.query.id_campanha) : undefined;

      const campanhas = CampaignModel.listAll().map((c) => ({
        ...c,
        status_ativa: Boolean(c.status_ativa),
        percentual_atingido:
          c.meta_financeira > 0
            ? Math.min(100, Math.round((c.valor_arrecadado / c.meta_financeira) * 100))
            : 0,
      }));

      const doacoes = DonationModel.listAllWithCampaign({
        status,
        search,
        id_campanha:
          campaignFilter && Number.isInteger(campaignFilter) && campaignFilter > 0
            ? campaignFilter
            : undefined,
      });

      const metricas = DonationModel.getAdminMetrics();

      res.json({
        admin: req.admin,
        metricas,
        campanhas,
        doacoes,
      });
    } catch (error) {
      console.error('Erro ao carregar painel administrativo:', error);
      res.status(500).json({ error: 'Erro ao carregar dados do painel administrativo.' });
    }
  },

  /**
   * Manual status check fallback (PDF II p.12 & p.23) to ensure no donation is lost
   * if a bank webhook faces temporary network issues.
   */
  async verifyDonationFallback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const idDoacao = Number(req.params.id);
      if (!Number.isInteger(idDoacao) || idDoacao <= 0) {
        res.status(400).json({ error: 'Identificador de doação inválido.' });
        return;
      }

      const existing = DonationModel.getById(idDoacao);
      if (!existing) {
        res.status(404).json({ error: 'Doação não encontrada.' });
        return;
      }

      if (existing.status_pagamento === 'aprovado') {
        res.json({ updated: false, donation: existing, message: 'Doação já aprovada.' });
        return;
      }

      // If live Mercado Pago payment ID exists, query Mercado Pago API directly
      if (existing.external_payment_id && process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        const mpResp = await fetch(
          `https://api.mercadopago.com/v1/payments/${existing.external_payment_id}`,
          {
            headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
          }
        );
        if (mpResp.ok) {
          const mpData = (await mpResp.json()) as { status?: string };
          if (mpData.status !== 'approved') {
            res.json({
              updated: false,
              donation: existing,
              message: `Status atual no provedor: ${mpData.status || 'pendente'}`,
            });
            return;
          }
        }
      }

      const { updated, donation } = DonationModel.approveAtomic(idDoacao);
      const campaign = CampaignModel.getById(existing.id_campanha);

      if (updated && donation) {
        broadcastEvent('donation_approved', {
          id_doacao: donation.id_doacao,
          id_campanha: donation.id_campanha,
          valor_doacao: donation.valor_doacao,
          nome_doador: donation.nome_doador,
          valor_arrecadado: campaign?.valor_arrecadado ?? 0,
          meta_financeira: campaign?.meta_financeira ?? 0,
        });
      }

      res.json({
        updated,
        donation,
        message: 'Pagamento Pix confirmado e meta da campanha atualizada.',
      });
    } catch (error) {
      console.error('Erro na verificação manual de Pix:', error);
      res.status(500).json({ error: 'Erro ao verificar status do pagamento.' });
    }
  },

  expireDonation(req: AuthenticatedRequest, res: Response): void {
    try {
      const idDoacao = Number(req.params.id);
      if (!Number.isInteger(idDoacao) || idDoacao <= 0) {
        res.status(400).json({ error: 'Identificador inválido.' });
        return;
      }

      const updated = DonationModel.markExpired(idDoacao);
      if (!updated) {
        res.status(404).json({ error: 'Doação não encontrada.' });
        return;
      }

      broadcastEvent('donation_updated', {
        id_doacao: updated.id_doacao,
        status_pagamento: updated.status_pagamento,
      });

      res.json({ donation: updated });
    } catch (error) {
      console.error('Erro ao expirar doação:', error);
      res.status(500).json({ error: 'Erro ao atualizar status da doação.' });
    }
  },

  createCampaign(req: AuthenticatedRequest, res: Response): void {
    try {
      const { titulo, descricao, meta_financeira, imagem_url } = req.body ?? {};

      if (typeof titulo !== 'string' || titulo.trim().length < 3 || titulo.trim().length > 100) {
        res.status(400).json({
          error: 'O título da campanha deve ter entre 3 e 100 caracteres.',
        });
        return;
      }

      const meta = Number(meta_financeira);
      if (!Number.isFinite(meta) || meta <= 0 || meta > 10000000) {
        res.status(400).json({
          error: 'A meta financeira deve ser maior que zero.',
        });
        return;
      }

      if (CampaignModel.getByTitle(titulo)) {
        res.status(409).json({
          error: 'Já existe uma campanha com este título.',
        });
        return;
      }

      const safeDesc = typeof descricao === 'string' ? descricao.trim().slice(0, 320) : null;
      const safeImage =
        typeof imagem_url === 'string' && imagem_url.startsWith('/src/assets/images/')
          ? imagem_url
          : null;

      const created = CampaignModel.create({
        titulo,
        descricao: safeDesc,
        imagem_url: safeImage,
        meta_financeira: Math.round(meta * 100) / 100,
      });

      broadcastEvent('campaign_updated', { id_campanha: created.id_campanha });
      res.status(201).json({
        campanha: { ...created, status_ativa: Boolean(created.status_ativa) },
      });
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      res.status(500).json({ error: 'Erro ao criar campanha.' });
    }
  },

  updateCampaign(req: AuthenticatedRequest, res: Response): void {
    try {
      const idCampanha = Number(req.params.id);
      if (!Number.isInteger(idCampanha) || idCampanha <= 0) {
        res.status(400).json({ error: 'Identificador de campanha inválido.' });
        return;
      }

      const { titulo, descricao, meta_financeira, status_ativa } = req.body ?? {};

      if (meta_financeira !== undefined) {
        const meta = Number(meta_financeira);
        if (!Number.isFinite(meta) || meta <= 0) {
          res.status(400).json({ error: 'A meta financeira deve ser maior que zero.' });
          return;
        }
      }

      if (titulo !== undefined) {
        if (typeof titulo !== 'string' || titulo.trim().length < 3) {
          res.status(400).json({ error: 'Título inválido.' });
          return;
        }
        const conflict = CampaignModel.getByTitle(titulo);
        if (conflict && conflict.id_campanha !== idCampanha) {
          res.status(409).json({ error: 'Já existe outra campanha com este título.' });
          return;
        }
      }

      const updated = CampaignModel.update(idCampanha, {
        titulo: typeof titulo === 'string' ? titulo : undefined,
        descricao: typeof descricao === 'string' ? descricao : undefined,
        meta_financeira:
          meta_financeira !== undefined
            ? Math.round(Number(meta_financeira) * 100) / 100
            : undefined,
        status_ativa: typeof status_ativa === 'boolean' ? status_ativa : undefined,
      });

      if (!updated) {
        res.status(404).json({ error: 'Campanha não encontrada.' });
        return;
      }

      broadcastEvent('campaign_updated', { id_campanha: updated.id_campanha });
      res.json({ campanha: { ...updated, status_ativa: Boolean(updated.status_ativa) } });
    } catch (error) {
      console.error('Erro ao atualizar campanha:', error);
      res.status(500).json({ error: 'Erro ao atualizar campanha.' });
    }
  },

  deleteCampaign(req: AuthenticatedRequest, res: Response): void {
    try {
      const idCampanha = Number(req.params.id);
      if (!Number.isInteger(idCampanha) || idCampanha <= 0) {
        res.status(400).json({ error: 'Identificador de campanha inválido.' });
        return;
      }

      const deleted = CampaignModel.delete(idCampanha);
      if (!deleted) {
        res.status(404).json({ error: 'Campanha não encontrada.' });
        return;
      }

      broadcastEvent('campaign_updated', { id_campanha: idCampanha });
      res.json({ deleted: true });
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
      res.status(500).json({ error: 'Erro ao excluir campanha.' });
    }
  },
};
