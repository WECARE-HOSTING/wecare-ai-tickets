import json
import logging
import os
import re
from pathlib import Path
from typing import Any

from anthropic import Anthropic
import vertexai
from vertexai.generative_models import GenerationConfig, GenerativeModel

from config import Settings, get_settings

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
CLAUDE_MODEL = "claude-sonnet-4-6"
GEMINI_MODEL = "gemini-2.5-flash"
logger = logging.getLogger(__name__)

_vertex_initialized = False

SYSTEM_PROMPT = """Você é um analista sênior de TI que classifica pedidos de suporte e produz artefatos para desenvolvimento.
Responda APENAS com um JSON válido (sem markdown, sem texto antes ou depois), com exatamente estas chaves em português:
- tipo: um de "Bug", "Melhoria", "Implantação", "Dúvida"
- titulo: string curta e objetiva para a issue
- descricao_tecnica: markdown com seções ## Contexto, ## Impacto, e se for Bug ## Passos para reproduzir (ou ## Detalhes para outros tipos)
- prioridade: um de "urgent", "high", "medium", "low"
- modulo_afetado: módulo ou área do sistema (string)
- cursor_prompt: prompt longo em português para colar no Cursor Agent. Deve incluir: contexto do problema, comportamento esperado, sugestão de arquivos/módulos ou camadas onde mexer, e critérios de aceite numerados.

Seja específico e técnico no cursor_prompt."""


def _resolve_credentials_path(settings: Settings) -> Path:
    raw = (settings.google_application_credentials or "").strip()
    if raw:
        p = Path(raw)
        if not p.is_absolute():
            p = _REPO_ROOT / p
    else:
        p = _REPO_ROOT / "service_account.json"
    return p.resolve()


def _ensure_vertex() -> None:
    global _vertex_initialized
    if _vertex_initialized:
        return
    settings = get_settings()
    if not settings.gcp_project_id.strip():
        raise ValueError("GCP_PROJECT_ID não configurado.")
    cred_path = _resolve_credentials_path(settings)
    if not cred_path.is_file():
        raise ValueError(
            f"Credenciais Google não encontradas em {cred_path}. "
            "Defina GOOGLE_APPLICATION_CREDENTIALS no .env ou coloque service_account.json na raiz do repositório."
        )
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(cred_path)
    vertexai.init(project=settings.gcp_project_id, location=settings.vertex_location)
    _vertex_initialized = True


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise ValueError("Resposta da IA não contém JSON.")
    return json.loads(m.group())


def _validate_payload(data: dict[str, Any]) -> dict[str, Any]:
    required = (
        "tipo",
        "titulo",
        "descricao_tecnica",
        "prioridade",
        "modulo_afetado",
        "cursor_prompt",
    )
    missing = [k for k in required if k not in data or data[k] is None]
    if missing:
        raise ValueError(f"JSON da IA incompleto. Faltando: {', '.join(missing)}")
    return data


def _parse_model_response(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = _extract_json(raw)
    return _validate_payload(data)


def _generate_with_claude(user_content: str, settings: Settings) -> dict[str, Any]:
    client = Anthropic(api_key=(settings.anthropic_api_key or "").strip())
    response = client.messages.create(
        model=CLAUDE_MODEL,
        system=SYSTEM_PROMPT,
        max_tokens=8192,
        temperature=0.2,
        messages=[{"role": "user", "content": user_content}],
    )
    text_blocks: list[str] = []
    for block in response.content:
        if getattr(block, "type", None) == "text" and getattr(block, "text", None):
            text_blocks.append(block.text)
    raw = "\n".join(text_blocks).strip()
    if not raw:
        raise ValueError("Resposta do Claude veio vazia.")
    return _parse_model_response(raw)


def _generate_with_gemini(user_content: str) -> dict[str, Any]:
    _ensure_vertex()
    model = GenerativeModel(
        GEMINI_MODEL,
        system_instruction=SYSTEM_PROMPT,
    )
    response = model.generate_content(
        user_content,
        generation_config=GenerationConfig(
            max_output_tokens=8192,
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )
    if not response.candidates:
        raise ValueError("Resposta do Gemini vazia ou bloqueada por políticas de segurança.")
    raw = (response.text or "").strip()
    return _parse_model_response(raw)


def enrich_ticket_description(descricao_usuario: str) -> dict[str, Any]:
    settings = get_settings()
    user_content = (
        "Texto livre do solicitante (pode estar informal ou incompleto):\n\n"
        f"{descricao_usuario.strip()}"
    )

    try:
        return _generate_with_claude(user_content, settings)
    except Exception:
        logger.exception("Falha ao gerar resposta com Claude; tentando fallback para Gemini.")

    try:
        return _generate_with_gemini(user_content)
    except Exception as gemini_exc:
        logger.exception("Falha ao gerar resposta com Gemini após erro no Claude.")
        raise RuntimeError(
            "Falha ao gerar resposta com IA: Claude e Gemini indisponíveis ou retornaram erro."
        ) from gemini_exc
