import json
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from config import get_settings
from routes.tickets import router as tickets_router
from routes.webhooks_linear import router as linear_webhook_router
from services.db import init_db

_repo_root = Path(__file__).resolve().parent.parent
load_dotenv(_repo_root / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="WeCare AI Tickets",
    description="Demo de tickets de TI com Gemini (Vertex AI) e Linear.",
    version="0.1.0",
    lifespan=lifespan,
)

_settings = get_settings()
_cors = [o.strip() for o in _settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets_router)
app.include_router(linear_webhook_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/clerk-frontend-config.js")
def clerk_frontend_config():
    """Expõe a chave publicável Clerk para o bundle estático (Railway: use CLERK_PUBLISHABLE_KEY)."""
    pk = get_settings().clerk_publishable_key.strip()
    body = "window.__CLERK_PUBLISHABLE_KEY__=" + (json.dumps(pk) if pk else "''") + ";"
    return Response(
        body,
        media_type="application/javascript; charset=utf-8",
    )


_frontend_dist = _repo_root / "frontend" / "dist"
_assets_dir = _frontend_dist / "assets"
if _assets_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def _spa_or_static(full_path: str):
        candidate = (_frontend_dist / full_path).resolve()
        dist_resolved = _frontend_dist.resolve()
        try:
            candidate.relative_to(dist_resolved)
        except ValueError:
            return FileResponse(_frontend_dist / "index.html")
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_frontend_dist / "index.html")
