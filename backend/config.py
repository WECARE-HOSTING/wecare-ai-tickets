import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent

_GCP_SA_TMP = Path("/tmp/gcp-sa-wecare.json")


def _materialize_gcp_credentials_json() -> None:
    raw = os.getenv("GCP_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        return
    _GCP_SA_TMP.write_text(raw, encoding="utf-8")
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(_GCP_SA_TMP)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(_BACKEND_DIR / ".env"),
            str(_REPO_ROOT / ".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    anthropic_api_key: str = ""
    gcp_project_id: str = "prj-juma-farol360-poc"
    vertex_location: str = "us-central1"
    google_application_credentials: str = ""
    linear_api_key: str = ""
    linear_team_id: str = ""
    linear_project_id: str = ""

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_timeout_seconds: int = 20
    email_to: str = "felipe@wecarehosting.com.br"

    cors_origins: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    _materialize_gcp_credentials_json()
    return Settings()
