import bcrypt from 'bcryptjs';
import { db } from '../db.ts';

export interface Administrador {
  id_admin: number;
  nome: string;
  email: string;
  senha_hash: string;
  created_at: string;
}

export const AdminModel = {
  findByEmail(email: string): Administrador | undefined {
    return db
      .prepare(
        `SELECT id_admin, nome, email, senha_hash, created_at
         FROM administradores
         WHERE LOWER(email) = LOWER(?)`
      )
      .get(email.trim()) as Administrador | undefined;
  },

  findById(id: number): Omit<Administrador, 'senha_hash'> | undefined {
    return db
      .prepare(
        `SELECT id_admin, nome, email, created_at
         FROM administradores
         WHERE id_admin = ?`
      )
      .get(id) as Omit<Administrador, 'senha_hash'> | undefined;
  },

  verifyCredentials(email: string, password: string): Omit<Administrador, 'senha_hash'> | null {
    const admin = this.findByEmail(email);
    if (!admin) {
      return null;
    }
    const matches = bcrypt.compareSync(password, admin.senha_hash);
    if (!matches) {
      return null;
    }
    return {
      id_admin: admin.id_admin,
      nome: admin.nome,
      email: admin.email,
      created_at: admin.created_at,
    };
  },
};
