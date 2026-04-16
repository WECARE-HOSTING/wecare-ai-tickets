import json
import re
from typing import Any

from anthropic import Anthropic

from config import get_settings

CLAUDE_MODEL = "claude-sonnet-4-20250514"

SYSTEM_PROMPT = """Você é um analista sênior de TI que classifica pedidos de suporte e produz artefatos para desenvolvimento.
Responda APENAS com um JSON válido (sem markdown, sem texto antes ou depois), com exatamente estas chaves em português:
- tipo: um de "Bug", "Melhoria", "Implantação", "Dúvida"
- titulo: string curta e objetiva para a issue
- descricao_tecnica: markdown com seções ## Contexto, ## Impacto, e se for Bug ## Passos para reproduzir (ou ## Detalhes para outros tipos)
- prioridade: um de "urgent", "high", "medium", "low"
- modulo_afetado: módulo ou área do sistema (string)
- cursor_prompt: prompt longo em português para colar no Cursor Agent. Deve incluir: contexto do problema, comportamento esperado, sugestão de arquivos/módulos ou camadas onde mexer, e critérios de aceite numerados.

Seja específico e técnico no cursor_prompt."""


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise ValueError("Resposta da IA não contém JSON.")
    return json.loads(m.group())


def enrich_ticket_description(descricao_usuario: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise ValueError("ANTHROPIC_API_KEY não configurada.")

    client = Anthropic(api_key=settings.anthropic_api_key)
    user_content = (
        "Texto livre do solicitante (pode estar informal ou incompleto):\n\n"
        f"{descricao_usuario.strip()}"
    )

    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    text_parts: list[str] = []
    for block in message.content:
        if block.type == "text":
            text_parts.append(block.text)
    raw = "\n".join(text_parts).strip()
    data = _extract_json(raw)

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
