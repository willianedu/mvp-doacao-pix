import { Request, Response } from 'express';
import { AdminModel } from '../models/adminModel.ts';
import {
  clearAdminSessionCookie,
  getAdminFromRequest,
  setAdminSessionCookie,
} from '../middleware/authMiddleware.ts';

export const AuthController = {
  login(req: Request, res: Response): void {
    try {
      const { email, senha } = req.body ?? {};

      if (
        typeof email !== 'string' ||
        typeof senha !== 'string' ||
        email.trim().length === 0 ||
        senha.length === 0
      ) {
        // Generic error without revealing which field failed (RNF01)
        res.status(401).json({ error: 'Credenciais inválidas. Verifique e-mail e senha.' });
        return;
      }

      const admin = AdminModel.verifyCredentials(email.trim(), senha);
      if (!admin) {
        res.status(401).json({ error: 'Credenciais inválidas. Verifique e-mail e senha.' });
        return;
      }

      setAdminSessionCookie(res, admin);
      res.json({
        authenticated: true,
        admin: {
          id_admin: admin.id_admin,
          nome: admin.nome,
          email: admin.email,
        },
      });
    } catch (error) {
      console.error('Erro no login administrativo:', error);
      res.status(500).json({ error: 'Não foi possível processar o login no momento.' });
    }
  },

  logout(_req: Request, res: Response): void {
    clearAdminSessionCookie(res);
    res.json({ authenticated: false });
  },

  me(req: Request, res: Response): void {
    const admin = getAdminFromRequest(req);
    if (!admin) {
      res.json({ authenticated: false, admin: null });
      return;
    }
    setAdminSessionCookie(res, admin);
    res.json({ authenticated: true, admin });
  },
};
