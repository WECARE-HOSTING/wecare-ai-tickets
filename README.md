## wecare-ai-tickets

Aplicação demo de abertura de tickets de TI usando **Gemini 2.5 Flash (Vertex AI)** para estruturar o pedido, criação de issue no **Linear** (GraphQL oficial via HTTPS) e notificação por **e-mail via SMTP**.  
Não há banco de dados: o fluxo é **stateless** e pensado para ser simples de entender e adaptar.

---

## Visão geral

- **Frontend**: React + Vite + Tailwind.
- **Backend**: FastAPI (Python 3.11+, gerenciado com [UV](https://docs.astral.sh/uv/)).
- **IA**: Vertex AI / Gemini 2.5 Flash.
- **Tickets**: Linear (API GraphQL pública).
- **Notificações**: envio de e-mail via SMTP.

Fluxo de uso:

1. Usuário descreve o problema de TI em texto livre.
2. Backend chama o Gemini para gerar um ticket estruturado (tipo, título, descrição técnica, prioridade, módulo afetado, `cursor_prompt`).
3. Usuário revisa e confirma os dados no frontend.
4. Backend cria a issue no Linear e envia um e-mail com o resumo e o link da issue.
5. A tela final exibe um prompt pronto para uso em um Cursor Agent, com botão de copiar.

---

## Pré-requisitos

- [UV](https://docs.astral.sh/uv/) para Python 3.11+.
- Node.js 20+ (para o frontend com Vite).
- Projeto GCP com **Vertex AI API** habilitada e conta de serviço com permissão para usar o modelo (por exemplo, papel **Vertex AI User**).
- Conta no **Linear** com acesso à API.
- Servidor SMTP para envio dos e-mails.

---

## Configuração de ambiente

1. Copie o exemplo de variáveis para a raiz do repositório:

   ```bash
   cp .env.example .env
   ```

2. Coloque o JSON da conta de serviço na raiz como `service_account.json`  
   (ou aponte `GOOGLE_APPLICATION_CREDENTIALS` para outro caminho).

3. Preencha o `.env` com:

   - **GCP_PROJECT_ID**: ID do projeto no GCP (padrão de exemplo no código: `prj-juma-farol360-poc`).
   - **VERTEX_LOCATION**: região Vertex (ex.: `us-central1`; o modelo precisa existir nessa região).
   - **GOOGLE_APPLICATION_CREDENTIALS**: caminho para o JSON (relativo à raiz do repo ou absoluto).  
     Se vazio, o backend assume `service_account.json` na raiz.
   - **LINEAR_API_KEY**: [Personal API Key](https://linear.app/settings/api) do Linear.
   - **LINEAR_TEAM_ID**: UUID do time (pode ser obtido via API/GraphQL).
   - **LINEAR_PROJECT_ID**: UUID do projeto **Atendimentos TI** (opcional, porém recomendado).
   - **SMTP_*** / **EMAIL_TO**: dados do servidor SMTP (ex.: porta 587 com STARTTLS) e e-mail destinatário.

O backend carrega `.env` da **raiz do projeto** ou de `backend/.env`.

---

## Backend (FastAPI + UV)

Na pasta `backend`:

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API: `http://localhost:8000`
- Documentação interativa (Swagger): `http://localhost:8000/docs`
- **CORS** liberado para `http://localhost:5173`.

### Endpoints principais

| Método | Caminho           | Descrição                                                                                     |
|--------|-------------------|-----------------------------------------------------------------------------------------------|
| POST   | `/tickets/preview`| Corpo: `{ "descricao": "..." }` — chama Gemini e devolve um JSON de ticket para revisão.     |
| POST   | `/tickets/create` | Usa o corpo confirmado pelo usuário — cria issue no Linear e envia e-mail de notificação.    |
| GET    | `/health`         | Health check simples.                                                                        |

---

## Frontend (React + Vite + Tailwind)

Na pasta `frontend`:

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173` no navegador.  
Se a API não estiver em `http://localhost:8000`, defina `VITE_API_URL` no `.env` da raiz apontando para a URL correta do backend.

---

## Observações sobre o Linear

A API pública do Linear é **GraphQL** em `https://api.linear.app/graphql` (requisição `POST` com JSON).  
O módulo `backend/services/linear.py` encapsula a criação de issues usando essa API.

---

## Licença

Uso interno / demo WeCare.
