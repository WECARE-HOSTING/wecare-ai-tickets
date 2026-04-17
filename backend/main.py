from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import get_settings
from routes.tickets import router as tickets_router

_repo_root = Path(__file__).resolve().parent.parent
load_dotenv(_repo_root / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")


@asynccontextmanager
async def lifespan(_app: FastAPI):
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


@app.get("/health")
def health():
    return {"status": "ok"}


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
