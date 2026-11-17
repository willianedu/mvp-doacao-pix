import crypto from 'crypto';
import { Request, Response } from 'express';
import { CampaignModel } from '../models/campaignModel.ts';
import { DonationModel } from '../models/donationModel.ts';
import { broadcastEvent } from '../utils/events.ts';
import { generatePixCharge, renderQrCodeDataUrl } from '../utils/pix.ts';

export const DonationController = {
  async createPixDonation(req: Request, res: Response): Promise<void> {
    try {
      const { id_campanha, valor_doacao, nome_doador } = req.body ?? {};

      const campaignId = Number(id_campanha);
      if (!Number.isInteger(campaignId) || campaignId <= 0) {
        res.status(400).json({ error: 'Campanha selecionada é inválida.' });
        return;
      }

      const amount = Number(valor_doacao);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
        res.status(400).json({
          error: 'O valor da doação deve ser um número positivo entre R$ 1,00 e R$ 100.000,00.',
        });
        return;
      }

      const campaign = CampaignModel.getById(campaignId);
      if (!campaign || !campaign.status_ativa) {
        res.status(404).json({
          error: 'Campanha não encontrada ou encerrada para novas doações.',
        });
        return;
      }

      let safeName: string | null = null;
      if (typeof nome_doador === 'string') {
        const trimmed = nome_doador.trim().slice(0, 80);
        if (trimmed.length > 0) {
          safeName = trimmed;
        }
      }

      const roundedAmount = Math.round(amount * 100) / 100;
      const pixData = await generatePixCharge({
        amount: roundedAmount,
        campaignTitle: campaign.titulo,
        donorName: safeName,
      });

      const donation = DonationModel.create({
        id_campanha: campaign.id_campanha,
        valor_doacao: roundedAmount,
        nome_doador: safeName,
        codigo_pix_gerado: pixData.codigoPix,
        txid: pixData.txid,
        external_payment_id: pixData.externalPaymentId,
      });

      broadcastEvent('donation_created', {
        id_doacao: donation.id_doacao,
        id_campanha: donation.id_campanha,
        status_pagamento: donation.status_pagamento,
      });

      res.status(201).json({
        id_doacao: donation.id_doacao,
        id_campanha: donation.id_campanha,
        campanha_titulo: campaign.titulo,
        valor_doacao: donation.valor_doacao,
        nome_doador: donation.nome_doador,
        codigo_pix_gerado: donation.codigo_pix_gerado,
        qr_code_data_url: pixData.qrCodeDataUrl,
        txid: donation.txid,
        status_pagamento: donation.status_pagamento,
      });
    } catch (error) {
      console.error('Erro ao gerar Pix:', error);
      res.status(500).json({
        error: 'Não foi possível gerar o código Pix no momento. Tente novamente.',
      });
    }
  },

  updateDonorName(req: Request, res: Response): void {
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

      const { nome_doador } = req.body ?? {};
      let safeName: string | null = null;
      if (typeof nome_doador === 'string') {
        const trimmed = nome_doador.trim().slice(0, 80);
        if (trimmed.length > 0) {
          safeName = trimmed;
        }
      }

      const updated = DonationModel.updateDonorName(idDoacao, safeName);
      broadcastEvent('donation_updated', {
        id_doacao: idDoacao,
        nome_doador: safeName,
      });

      res.json({
        id_doacao: updated?.id_doacao,
        nome_doador: updated?.nome_doador ?? null,
      });
    } catch (error) {
      console.error('Erro ao atualizar nome do doador:', error);
      res.status(500).json({ error: 'Não foi possível atualizar a identificação.' });
    }
  },

  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const idDoacao = Number(req.params.id);
      if (!Number.isInteger(idDoacao) || idDoacao <= 0) {
        res.status(400).json({ error: 'Identificador inválido.' });
        return;
      }

      const donation = DonationModel.getById(idDoacao);
      if (!donation) {
        res.status(404).json({ error: 'Doação não encontrada.' });
        return;
      }

      const campaign = CampaignModel.getById(donation.id_campanha);
      const qrCodeDataUrl = await renderQrCodeDataUrl(donation.codigo_pix_gerado);

      res.json({
        id_doacao: donation.id_doacao,
        id_campanha: donation.id_campanha,
        campanha_titulo: campaign?.titulo || 'Campanha',
        valor_doacao: donation.valor_doacao,
        nome_doador: donation.nome_doador,
        codigo_pix_gerado: donation.codigo_pix_gerado,
        qr_code_data_url: qrCodeDataUrl,
        txid: donation.txid,
        status_pagamento: donation.status_pagamento,
        updated_at: donation.updated_at,
      });
    } catch (error) {
      console.error('Erro ao consultar status da doação:', error);
      res.status(500).json({ error: 'Erro ao consultar status do pagamento.' });
    }
  },

  /**
   * Mercado Pago Webhook & Payment Confirmation Endpoint (RF02 + RF03).
   */
  async handleMercadoPagoWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      const xSignature = req.headers['x-signature'];

      // Verify webhook authenticity if secret is configured
      if (webhookSecret && typeof xSignature === 'string') {
        const expected = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(req.body ?? {}))
          .digest('hex');
        if (!xSignature.includes(expected) && xSignature !== webhookSecret) {
          res.status(401).json({ error: 'Assinatura de webhook inválida.' });
          return;
        }
      }

      const body = req.body ?? {};
      let targetDonation = undefined;

      // Support Mercado Pago official payment.updated payload
      if (body?.data?.id && process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        const paymentId = String(body.data.id);
        const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
        });
        if (mpResp.ok) {
          const mpData = (await mpResp.json()) as {
            status?: string;
            external_reference?: string;
          };
          if (mpData.status === 'approved') {
            targetDonation =
              DonationModel.getByExternalPaymentId(paymentId) ||
              (mpData.external_reference
                ? DonationModel.getByTxid(mpData.external_reference)
                : undefined);
          }
        }
      } else {
        // Direct txid or id_doacao webhook notification
        const idDoacao = Number(body.id_doacao);
        if (Number.isInteger(idDoacao) && idDoacao > 0) {
          targetDonation = DonationModel.getById(idDoacao);
        } else if (typeof body.txid === 'string' && body.txid.trim().length > 0) {
          targetDonation = DonationModel.getByTxid(body.txid.trim());
        }
      }

      if (!targetDonation) {
        res.status(404).json({ error: 'Transação não localizada para conciliação.' });
        return;
      }

      const { updated, donation } = DonationModel.approveAtomic(targetDonation.id_doacao);
      const campaign = CampaignModel.getById(targetDonation.id_campanha);

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
        received: true,
        updated,
        status_pagamento: donation?.status_pagamento || 'pendente',
        valor_arrecadado: campaign?.valor_arrecadado ?? 0,
      });
    } catch (error) {
      console.error('Erro ao processar webhook de pagamento:', error);
      res.status(500).json({ error: 'Falha ao processar notificação de pagamento.' });
    }
  },
};
