import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'amigos_da_mara.db');
export const db = new Database(dbPath);

// Enforce relational integrity and concurrent read performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS campanhas (
      id_campanha INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL UNIQUE,
      descricao TEXT,
      imagem_url TEXT,
      meta_financeira REAL NOT NULL CHECK (meta_financeira > 0),
      valor_arrecadado REAL NOT NULL DEFAULT 0 CHECK (valor_arrecadado >= 0),
      status_ativa INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS doacoes (
      id_doacao INTEGER PRIMARY KEY AUTOINCREMENT,
      id_campanha INTEGER NOT NULL,
      valor_doacao REAL NOT NULL CHECK (valor_doacao > 0),
      nome_doador TEXT,
      codigo_pix_gerado TEXT NOT NULL,
      txid TEXT NOT NULL UNIQUE,
      external_payment_id TEXT,
      status_pagamento TEXT NOT NULL DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'aprovado', 'expirado')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (id_campanha) REFERENCES campanhas(id_campanha) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_doacoes_campanha ON doacoes(id_campanha);
    CREATE INDEX IF NOT EXISTS idx_doacoes_status ON doacoes(status_pagamento);

    CREATE TABLE IF NOT EXISTS administradores (
      id_admin INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  seedInitialData();
  migrateBrandReferences();
}

function migrateBrandReferences(): void {
  db.prepare(
    `UPDATE campanhas
     SET descricao = REPLACE(descricao, 'pela O.S.C Amigos da Mara', 'pelo projeto Doações e Caridade')
     WHERE descricao LIKE '%O.S.C Amigos da Mara%'`
  ).run();

  db.prepare(
    `UPDATE administradores
     SET email = 'admin@doacoesecaridade.org.br'
     WHERE email = 'admin@amigosdamara.org.br'
       AND NOT EXISTS (SELECT 1 FROM administradores WHERE email = 'admin@doacoesecaridade.org.br')`
  ).run();

  db.prepare(
    `UPDATE doacoes
     SET codigo_pix_gerado = REPLACE(REPLACE(codigo_pix_gerado, 'amigosdamara@pix.org.br', 'contato@doacoesecaridade.org.br'), 'OSC AMIGOS DA MARA', 'DOACOES E CARIDADE')
     WHERE codigo_pix_gerado LIKE '%OSC AMIGOS DA MARA%' OR codigo_pix_gerado LIKE '%amigosdamara@pix.org.br%'`
  ).run();
}

function seedInitialData(): void {
  const now = new Date().toISOString();

  // Seed admin user with bcrypt hash (RNF01)
  const adminCount = db
    .prepare('SELECT COUNT(*) as total FROM administradores')
    .get() as { total: number };

  if (adminCount.total === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@doacoesecaridade.org.br';
    const adminPass = process.env.ADMIN_PASSWORD || 'DoacoesCaridade2026';
    const senhaHash = bcrypt.hashSync(adminPass, 10);

    db.prepare(
      `INSERT INTO administradores (nome, email, senha_hash, created_at)
       VALUES (?, ?, ?, ?)`
    ).run('Deusdália Guedes', adminEmail, senhaHash, now);
  }

  // Seed initial campaigns matching Experiência Prática I & II
  const campaignCount = db
    .prepare('SELECT COUNT(*) as total FROM campanhas')
    .get() as { total: number };

  if (campaignCount.total === 0) {
    const insertCampaign = db.prepare(
      `INSERT INTO campanhas (titulo, descricao, imagem_url, meta_financeira, valor_arrecadado, status_ativa, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const c1 = insertCampaign.run(
      'Dia das Crianças',
      'Arrecadação de brinquedos, kits escolares e cestas para as crianças atendidas pelo projeto Doações e Caridade.',
      '/src/assets/images/campanha_dia_criancas_1794953497340.jpg',
      5000.0,
      3200.0,
      1,
      now
    );

    const c2 = insertCampaign.run(
      'Baile à Fantasia - Ingresso Solidário',
      'Ingressos solidários e apoio comunitário para o evento beneficente em prol das famílias da comunidade.',
      '/src/assets/images/campanha_baile_fantasia_1794953504665.jpg',
      4000.0,
      2500.0,
      1,
      now
    );

    const insertDonation = db.prepare(
      `INSERT INTO doacoes (id_campanha, valor_doacao, nome_doador, codigo_pix_gerado, txid, status_pagamento, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const camp1Id = Number(c1.lastInsertRowid);
    const camp2Id = Number(c2.lastInsertRowid);

    const hoursAgo = (h: number) =>
      new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

    // Seed Dia das Crianças approved donations summing exactly R$ 3.200,00 (64%)
    const seedCamp1: Array<[number, string | null, string, number]> = [
      [50, 'Maria Silva', 'aprovado', 0.5],
      [150, 'Carlos Eduardo', 'aprovado', 2],
      [200, null, 'aprovado', 5],
      [500, 'Padaria São José', 'aprovado', 10],
      [300, 'Fernanda Lima', 'aprovado', 16],
      [1000, 'Grupo Solidário Bairro', 'aprovado', 24],
      [400, 'Ana Paula Souza', 'aprovado', 36],
      [600, null, 'aprovado', 48],
      [50, 'João Pedro', 'pendente', 0.25],
    ];

    seedCamp1.forEach(([valor, nome, status, offsetHours], idx) => {
      const ts = hoursAgo(offsetHours);
      const txid = `ADMDC2026${String(idx + 1).padStart(4, '0')}`;
      insertDonation.run(
        camp1Id,
        valor,
        nome,
        `00020126580014br.gov.bcb.pix0136contato@doacoesecaridade.org.br5204000053039865405${valor.toFixed(2)}5802BR5918DOACOES E CARIDADE6009SAO PAULO62150511${txid}6304ABCD`,
        txid,
        status,
        ts,
        ts
      );
    });

    // Seed Baile à Fantasia approved donations summing exactly R$ 2.500,00
    const seedCamp2: Array<[number, string | null, string, number]> = [
      [120, 'Juliana Costa', 'aprovado', 3],
      [380, 'Família Oliveira', 'aprovado', 8],
      [500, null, 'aprovado', 18],
      [1500, 'Apoiadores do Baile', 'aprovado', 30],
      [60, 'Marcos Vinicius', 'pendente', 1],
    ];

    seedCamp2.forEach(([valor, nome, status, offsetHours], idx) => {
      const ts = hoursAgo(offsetHours);
      const txid = `ADMBF2026${String(idx + 1).padStart(4, '0')}`;
      insertDonation.run(
        camp2Id,
        valor,
        nome,
        `00020126580014br.gov.bcb.pix0136contato@doacoesecaridade.org.br5204000053039865406${valor.toFixed(2)}5802BR5918DOACOES E CARIDADE6009SAO PAULO62150511${txid}6304EF12`,
        txid,
        status,
        ts,
        ts
      );
    });
  }
}
