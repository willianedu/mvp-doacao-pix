import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { AdminModel } from '../models/adminModel.ts';

const COOKIE_NAME = 'amigos_admin_session';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours inactivity expiration (RNF01)

const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || EPHEMERAL_FALLBACK_SECRET;
}

export interface SessionPayload {
  id_admin: number;
  email: string;
  nome: string;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  admin?: {
    id_admin: number;
    email: string;
    nome: string;
  };
}

function signToken(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, signature] = parts;

    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(encoded)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionPayload;

    if (!decoded || typeof decoded.id_admin !== 'number' || typeof decoded.exp !== 'number') {
      return null;
    }

    if (Date.now() > decoded.exp) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export function setAdminSessionCookie(
  res: Response,
  admin: { id_admin: number; email: string; nome: string }
): void {
  const payload: SessionPayload = {
    id_admin: admin.id_admin,
    email: admin.email,
    nome: admin.nome,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const token = signToken(payload);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearAdminSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export function requireAdminAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const rawToken = req.cookies?.[COOKIE_NAME];
  if (!rawToken || typeof rawToken !== 'string') {
    res.status(401).json({ error: 'Acesso não autorizado. Autenticação necessária.' });
    return;
  }

  const payload = verifySessionToken(rawToken);
  if (!payload) {
    clearAdminSessionCookie(res);
    res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
    return;
  }

  const adminRecord = AdminModel.findById(payload.id_admin);
  if (!adminRecord) {
    clearAdminSessionCookie(res);
    res.status(401).json({ error: 'Acesso não autorizado.' });
    return;
  }

  req.admin = {
    id_admin: adminRecord.id_admin,
    email: adminRecord.email,
    nome: adminRecord.nome,
  };

  // Refresh 2-hour sliding inactivity window (RNF01)
  setAdminSessionCookie(res, req.admin);
  next();
}

export function getAdminFromRequest(req: Request): {
  id_admin: number;
  email: string;
  nome: string;
} | null {
  const rawToken = req.cookies?.[COOKIE_NAME];
  if (!rawToken || typeof rawToken !== 'string') return null;
  const payload = verifySessionToken(rawToken);
  if (!payload) return null;
  const adminRecord = AdminModel.findById(payload.id_admin);
  if (!adminRecord) return null;
  return {
    id_admin: adminRecord.id_admin,
    email: adminRecord.email,
    nome: adminRecord.nome,
  };
}
