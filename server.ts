import 'dotenv/config';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { AdminController } from './src/server/controllers/adminController.ts';
import { AuthController } from './src/server/controllers/authController.ts';
import { CampaignController } from './src/server/controllers/campaignController.ts';
import { DonationController } from './src/server/controllers/donationController.ts';
import { initializeDatabase } from './src/server/db.ts';
import { requireAdminAuth } from './src/server/middleware/authMiddleware.ts';
import { registerSseClient } from './src/server/utils/events.ts';

async function startServer() {
  initializeDatabase();

  const app = express();
  const PORT = 3000;

  // Performance & security middlewares (RNF02 & RNF03)
  app.disable('x-powered-by');
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Public Campaign & Pix Routes (RF01, RF02, RF03)
  app.get('/api/campanhas', CampaignController.listPublic);
  app.post('/api/doacoes/pix', DonationController.createPixDonation);
  app.patch('/api/doacoes/:id/nome', DonationController.updateDonorName);
  app.get('/api/doacoes/:id/status', DonationController.getStatus);
  app.post('/api/webhooks/mercadopago', DonationController.handleMercadoPagoWebhook);

  // Real-time Server-Sent Events stream for live progress bar & admin updates
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const unregister = registerSseClient(res);
    const keepAlive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      unregister();
    });
  });

  // Authentication Routes (RNF01)
  app.post('/api/auth/login', AuthController.login);
  app.post('/api/auth/logout', AuthController.logout);
  app.get('/api/auth/me', AuthController.me);

  // Protected Admin Routes (OWASP A01:2021 - Broken Access Control defense)
  app.get('/api/admin/dashboard', requireAdminAuth, AdminController.getDashboard);
  app.get('/api/admin/fecho-caixa', requireAdminAuth, AdminController.getDailyClosing);
  app.post('/api/admin/doacoes/:id/verificar', requireAdminAuth, AdminController.verifyDonationFallback);
  app.post('/api/admin/doacoes/:id/expirar', requireAdminAuth, AdminController.expireDonation);
  app.post('/api/admin/campanhas', requireAdminAuth, AdminController.createCampaign);
  app.patch('/api/admin/campanhas/:id', requireAdminAuth, AdminController.updateCampaign);
  app.delete('/api/admin/campanhas/:id', requireAdminAuth, AdminController.deleteCampaign);

  // Explicit OWASP A01 protection on direct unauthenticated REST-style admin paths
  app.all('/api/admin/*', (_req: Request, res: Response) => {
    res.status(401).json({ error: 'Acesso não autorizado.' });
  });

  // Serve Vite dev middleware in development or static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use('/admin', express.static(distPath));
    app.use('/checkout', express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Generic error handler preventing Information Disclosure / stack traces (RNF02)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled application error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ocorreu um erro inesperado. Tente novamente.' });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`O.S.C Amigos da Mara server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
