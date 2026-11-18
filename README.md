# Plataforma de Doações e Engajamento Pix — Doações e Caridade

Este repositório contém o código-fonte do Minimum Viable Product (MVP) desenvolvido para o projeto **Doações e Caridade**, iniciativa social com foco no auxílio a crianças e famílias em situação de vulnerabilidade.

## O Problema

A iniciativa **Doações e Caridade** dependia de processos manuais para a gestão de arrecadações e venda de ingressos solidários (como o *Baile à Fantasia* e campanhas do *Dia das Crianças*). A equipe precisava conferir individualmente comprovantes Pix via WhatsApp/Instagram e gerenciar campanhas de forma descentralizada, gerando sobrecarga administrativa, risco de erros operacionais e ausência de transparência em tempo real para os doadores.

## A Solução (MVP)

Um Web App responsivo (*mobile-first*) com foco em simplicidade e automação do fluxo de doações via Pix direto, eliminando intermediários financeiros e taxas de transação.

### Funcionalidades Implementadas

#### Para o Doador (Visão Pública)
- **Página Pública da Campanha:** Exibição da meta financeira, barra de progresso gráfica atualizada em tempo real via *Server-Sent Events* (SSE) e seleção rápida de valores (`R$ 20`, `R$ 50` ou `Outro Valor`) com alvos de toque acessíveis (`>= 44×44px`).
- **Checkout Pix Dinâmico:** Geração instantânea de QR Code e código Pix "Copia e Cola" com valor exato, sem exigir cadastro ou senha do doador.
- **Privacidade e Transparência (LGPD):** Campo opcional para *Nome ou Apelido* (com doação anônima por padrão, sem coleta de CPF, e-mail ou telefone) e listagem dos **Últimos Apoiadores**.
- **FAQ Expansível sobre Pix:** Seção de perguntas frequentes para orientar doadores sobre pagamento no mesmo celular, ausência de taxas e confirmação automática.
- **Redes Sociais do Projeto:** Botões na página inicial com acesso direto ao Instagram (`@doacoesecaridade`), Facebook e compartilhamento via WhatsApp.
- **Modo Claro e Modo Escuro:** Alternância persistente no cabeçalho (`localStorage` + preferência do sistema), mantendo alto contraste e fundo branco dedicado no QR Code para leitura confiável em apps bancários.

#### Para a Administração (ONG)
- **Autenticação Segura:** Login administrativo protegido por hash `bcrypt` e cookies HTTP-only assinados via HMAC com expiração automática após 2 horas de inatividade.
- **Painel de Controle (`/admin/doacoes`):** Visão consolidada com KPIs, filtros de doações (`pendente`, `aprovado`, `expirado`), busca por doador/campanha e atualização automática em tempo real.
- **Conciliação Automática e Fallback:** Confirmação via *webhook* do Mercado Pago, suporte a simulação em homologação e ações manuais de verificação ou expiração no painel.
- **Gestão de Campanhas:** Criação, ativação/pausa e edição de metas financeiras diretamente pela interface administrativa.

---

## Arquitetura e Tecnologias

O sistema segue uma **Arquitetura em Camadas no padrão MVC (Model-View-Controller)**:

- **Frontend (View):** React 19, TypeScript, Vite 8, Tailwind CSS v4 e Lucide React.
- **Backend (Controller & Services):** Node.js, Express 4 (`server.ts`), `cookie-parser`, `compression` e SSE (`/api/events`).
- **Persistência (Model):** SQLite via `better-sqlite3` (`data/amigos_da_mara.db`) com consultas parametrizadas.
- **Pagamentos Pix:** Geração de payload Pix EMV e QR Code (`qrcode`), com suporte opcional à integração Mercado Pago (`MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET`).

### Estrutura do Projeto

```text
├── server.ts                      # Ponto de entrada Express + Vite middleware / build estático
├── src/
│   ├── App.tsx                    # Roteamento client-side, SSE e gerenciamento de tema
│   ├── index.css                  # Configuração Tailwind CSS v4 e variante dark
│   ├── types.ts                   # Tipagens TypeScript compartilhadas
│   ├── services/api.ts            # Cliente HTTP para comunicação com a API
│   ├── utils/format.ts            # Formatação monetária (BRL) e datas
│   ├── components/
│   │   ├── TopBar.tsx             # Cabeçalho responsivo com seletor de tema
│   │   ├── CampaignPublicView.tsx # Página inicial da campanha e seleção de valores
│   │   ├── CheckoutPixView.tsx    # Tela de QR Code, Copia e Cola e simulação
│   │   ├── PixFaqAccordion.tsx    # Acordeão de dúvidas frequentes sobre Pix
│   │   ├── SocialLinksSection.tsx # Links para redes sociais do projeto
│   │   ├── AdminLoginView.tsx     # Tela de login administrativo
│   │   └── AdminDashboardView.tsx # Painel de gestão de doações e campanhas
│   └── server/
│       ├── db.ts                  # Inicialização SQLite e seed inicial
│       ├── models/                # Modelos de Campanha, Doação e Admin
│       ├── controllers/           # Regras de negócio (Auth, Campaign, Donation, Admin)
│       ├── middleware/            # Verificação de sessão administrativa (OWASP A01)
│       └── utils/                 # Gerador de payload/QR Pix e transmissor SSE
```

---

## Segurança e Boas Práticas (OWASP & LGPD)

- **OWASP A01 (Broken Access Control):** Todas as rotas `/api/admin/*` exigem cookie de sessão administrativo válido.
- **OWASP A03 (Injection / XSS):** Consultas SQL parametrizadas no `better-sqlite3` e renderização segura automática no React sem `dangerouslySetInnerHTML`.
- **RNF01 (Autenticação Robusta):** Senhas armazenadas exclusivamente com hash `bcrypt` (nunca em texto limpo).
- **RNF02 (Proteção de Dados):** Minimização de dados pessoais e tratamento genérico de erros no servidor (sem exposição de *stack traces*).

---

## Como Executar Localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e ajuste os valores conforme necessário:

```env
SESSION_SECRET="troque-por-uma-chave-secreta-longa-e-aleatoria"
ADMIN_EMAIL="admin@doacoesecaridade.org.br"
ADMIN_PASSWORD="DoacoesCaridade2026"
PIX_CHAVE="contato@doacoesecaridade.org.br"
PIX_RECEBEDOR="DOACOES E CARIDADE"
PIX_CIDADE="SAO PAULO"
MERCADO_PAGO_ACCESS_TOKEN=""
MERCADO_PAGO_WEBHOOK_SECRET=""
```

### 3. Iniciar em desenvolvimento

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

### 4. Verificar tipos e gerar build de produção

```bash
npm run lint
npm run build
npm start
```

---

## Principais Endpoints da API

| Método | Rota | Descrição | Acesso |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/campanhas` | Lista campanhas ativas e últimos apoiadores | Público |
| `POST` | `/api/doacoes/pix` | Gera intenção de doação Pix (QR Code + Copia e Cola) | Público |
| `PATCH` | `/api/doacoes/:id/nome` | Atualiza nome/apelido opcional do doador | Público |
| `GET` | `/api/doacoes/:id/status` | Consulta status atual de uma doação | Público |
| `GET` | `/api/events` | Stream SSE para atualizações em tempo real | Público |
| `POST` | `/api/webhooks/mercadopago` | Recebe confirmação bancária / simulação Pix | Webhook |
| `POST` | `/api/auth/login` | Autentica administrador e cria sessão segura | Admin |
| `GET` | `/api/admin/dashboard` | Retorna métricas, doações e campanhas | Admin |
| `POST` | `/api/admin/campanhas` | Cria nova campanha de arrecadação | Admin |

---

## Alinhamento com os ODS (ONU)

Este projeto está diretamente conectado ao **ODS 1 — Erradicação da Pobreza**. Ao automatizar o fluxo de doações e eliminar a conferência manual de comprovantes, o software libera o tempo da equipe voluntária do projeto Doações e Caridade para atividades diretas de acolhimento e amplia a transparência e a captação de recursos para as crianças atendidas.

## Contribuição

Projeto desenvolvido no contexto da disciplina de **Projeto de Software (Experiência Prática I e II)**.
