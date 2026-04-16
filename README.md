# wecare-ai-tickets

Demo standalone de abertura de tickets de TI com **Anthropic Claude**, criação de issue no **Linear** (GraphQL oficial via HTTPS) e notificação por **e-mail (SMTP)**. Sem banco de dados: fluxo stateless.

## Pré-requisitos

- [UV](https://docs.astral.sh/uv/) (Astral) para Python 3.11+
- Node.js 20+ (para o frontend com Vite)

## Configuração

1. Copie o exemplo de variáveis para a raiz do repositório:

   ```bash
   cp .env.example .env
   ```

2. Preencha o `.env`:

   - **ANTHROPIC_API_KEY**: chave da API Anthropic.
   - **LINEAR_API_KEY**: [Personal API Key](https://linear.app/settings/api) do Linear.
   - **LINEAR_TEAM_ID**: UUID do time (workspace → team → usar API ou query `teams` no GraphQL).
   - **LINEAR_PROJECT_ID**: UUID do projeto **Atendimentos TI** (opcional, mas recomendado para vincular a issue ao projeto).
   - **SMTP_*** / **EMAIL_TO**: servidor SMTP (ex.: 587 com STARTTLS) e destinatário do resumo.

   O backend carrega `.env` da **raiz do projeto** ou de `backend/.env`.

## Backend (FastAPI + UV)

Na pasta `backend`:

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API: `http://localhost:8000`
- Documentação interativa: `http://localhost:8000/docs`
- **CORS** liberado para `http://localhost:5173`.

### Endpoints principais

| Método | Caminho | Descrição |
|--------|---------|-------------|
| POST | `/tickets/preview` | Corpo: `{ "descricao": "..." }` — chama Claude e devolve JSON revisável. |
| POST | `/tickets/create` | Corpo: mesmo formato do preview (campos confirmados) — cria issue no Linear e envia e-mail. |
| GET | `/health` | Health check. |

## Frontend (React + Vite + Tailwind)

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. Opcional: defina `VITE_API_URL` no `.env` da raiz se a API não estiver em `http://localhost:8000`.

## Fluxo

1. Usuário descreve o problema em texto livre.
2. **POST `/tickets/preview`** — Claude (`claude-sonnet-4-20250514`) retorna `tipo`, `titulo`, `descricao_tecnica`, `prioridade`, `modulo_afetado`, `cursor_prompt`.
3. Usuário revisa no app e confirma.
4. **POST `/tickets/create`** — issue no Linear + e-mail para `EMAIL_TO` com resumo e link da issue.
5. Tela de sucesso exibe o **prompt para o Cursor Agent** com botão de copiar.

## Nota sobre o Linear

A API pública do Linear é **GraphQL** em `https://api.linear.app/graphql` (requisição `POST` com JSON). O serviço `backend/services/linear.py` encapsula a criação de issues dessa forma.

## Licença

Uso interno / demo WeCare.
