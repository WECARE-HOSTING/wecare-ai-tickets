from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.tickets import router as tickets_router

_repo_root = Path(__file__).resolve().parent.parent
load_dotenv(_repo_root / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield


app = FastAPI(
    title="WeCare AI Tickets",
    description="Demo de tickets de TI com Gemini (Vertex AI), Linear e e-mail.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets_router)


@app.get("/health")
def health():
    return {"status": "ok"}
