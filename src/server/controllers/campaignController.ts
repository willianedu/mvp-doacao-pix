import { Request, Response } from 'express';
import { CampaignModel } from '../models/campaignModel.ts';
import { DonationModel } from '../models/donationModel.ts';

export const CampaignController = {
  listPublic(_req: Request, res: Response): void {
    try {
      const campanhas = CampaignModel.listActive().map((c) => {
        const percentual =
          c.meta_financeira > 0
            ? Math.min(100, Math.round((c.valor_arrecadado / c.meta_financeira) * 100))
            : 0;
        const apoiadoresRecentes = DonationModel.listRecentApprovedByCampaign(c.id_campanha, 6);
        return {
          ...c,
          status_ativa: Boolean(c.status_ativa),
          percentual_atingido: percentual,
          apoiadores_recentes: apoiadoresRecentes,
        };
      });

      res.json({ campanhas });
    } catch (error) {
      console.error('Erro ao listar campanhas públicas:', error);
      res.status(500).json({ error: 'Erro ao carregar campanhas.' });
    }
  },
};
