# 🤖 WeCare AI Tickets

> Demo funcional de abertura inteligente de tickets de TI — o usuário descreve o problema em linguagem natural e a IA estrutura, classifica e cria a issue no Linear.

---

## ✨ O que este projeto demonstra

| Poder da IA | Como aparece na prática |
|---|---|
| Classificação automática | "o botão não salva" → IA identifica como **Bug** |
| Enriquecimento do ticket | Texto raso vira descrição técnica estruturada em Markdown |
| Prioridade sugerida | IA infere urgência pelo contexto do relato |
| Módulo afetado | Detecta automaticamente a área do sistema |
| Cursor Prompt gerado | Prompt pronto para o dev colar no Cursor Agent e implantar a solução |

---

## 🏗️ Stack

- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: FastAPI · Python 3.11+ · gerenciado com [UV (Astral)](https://docs.astral.sh/uv/)
- **IA principal**: Claude (Anthropic API) `claude-sonnet-4-20250514`
- **IA fallback**: Gemini 2.5 Flash via Vertex AI *(ativado automaticamente se Claude falhar)*
- **Tickets**: Linear API (GraphQL)
- **Stateless**: sem banco de dados

---

## 🔄 Fluxo completo

```
Usuário digita texto livre
        ↓
POST /tickets/preview
        ↓
IA (Claude → fallback Gemini) retorna:
  • tipo        Bug | Melhoria | Implantação | Dúvida
  • titulo
  • descricao_tecnica  (Markdown)
  • prioridade  urgent | high | medium | low
  • modulo_afetado
  • cursor_prompt  ← prompt pronto para o Cursor Agent
        ↓
Usuário revisa no frontend
        ↓
POST /tickets/create
        ↓
  Issue no Linear
        ↓
Frontend exibe cursor_prompt com botão de copiar
```

---

## ⚙️ Pré-requisitos

- [UV](https://docs.astral.sh/uv/) instalado
- Node.js 20+
- Conta no [Linear](https://linear.app) com Personal API Key
- Anthropic API Key **e/ou** GCP com Vertex AI habilitado

---

## 🚀 Setup

### 1. Variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env`:

```env
# ── IA Principal (Claude) ──────────────────────────────
# Deixe vazio para pular direto para o fallback Gemini
ANTHROPIC_API_KEY=sk-ant-...

# ── IA Fallback (Gemini / Vertex AI) ──────────────────
GCP_PROJECT_ID=seu-projeto-gcp
VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=service_account.json

# ── Linear ────────────────────────────────────────────
LINEAR_API_KEY=lin_api_...
LINEAR_TEAM_ID=uuid-do-time
LINEAR_PROJECT_ID=uuid-do-projeto-atendimentos-ti
```

> ⚠️ Se usar Gemini, coloque o `service_account.json` na raiz do projeto (não versionar).

---

### 2. Backend

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API: [http://localhost:8000](http://localhost:8000)
- Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173)

---

## 📡 Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/tickets/preview` | Recebe `{ "descricao": "..." }` → retorna ticket estruturado pela IA |
| `POST` | `/tickets/create` | Confirma o ticket → cria no Linear + envia e-mail |
| `GET` | `/health` | Health check |

---

## 🔑 Obtendo os IDs do Linear

Com o `.env` preenchido com `LINEAR_API_KEY`, rode na raiz:

```bash
uv run python get_linear_ids.py
```

O script lista todos os **Teams** e **Projetos** com seus UUIDs.

---

## 🤖 Cursor Prompt — o diferencial

Após a criação do ticket, o sistema exibe um **prompt técnico gerado pela IA** pronto para ser colado no Cursor Agent. Ele contém:

- Contexto do problema
- Comportamento esperado
- Sugestão de onde no código atuar
- Critérios de aceite

Isso fecha o ciclo: **do relato do problema até a implementação da solução**, tudo guiado por IA.

---

## 📁 Estrutura do projeto

```
wecare-ai-tickets/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── routes/tickets.py
│   └── services/
│       ├── ai.py        # Claude + fallback Gemini
│       └── linear.py    # Criação de issues via GraphQL
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── TicketForm.jsx
│       │   ├── AiPreview.jsx
│       │   └── CursorPrompt.jsx
│       └── api/tickets.js
├── get_linear_ids.py
├── .env.example
└── README.md
```

---

## 🔒 Segurança

- Nunca versione `.env` ou `service_account.json`
- Ambos já estão no `.gitignore`

---

*Projeto demo interno — WeCare © 2026*
