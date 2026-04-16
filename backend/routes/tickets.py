from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services import ai, email as email_service
from services import linear as linear_service

router = APIRouter(prefix="/tickets", tags=["tickets"])


class TicketPreviewRequest(BaseModel):
    descricao: str = Field(..., min_length=3, description="Texto livre do problema")


class TicketDraft(BaseModel):
    tipo: Literal["Bug", "Melhoria", "Implantação", "Dúvida"]
    titulo: str
    descricao_tecnica: str
    prioridade: Literal["urgent", "high", "medium", "low"]
    modulo_afetado: str
    cursor_prompt: str


class TicketCreateRequest(TicketDraft):
    """Mesmo payload retornado pelo preview, após revisão do usuário."""


def _validate_draft(data: dict) -> TicketDraft:
    try:
        return TicketDraft.model_validate(data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Dados inválidos: {e}") from e


@router.post("/preview")
def preview_ticket(body: TicketPreviewRequest):
    try:
        raw = ai.enrich_ticket_description(body.descricao)
        draft = _validate_draft(raw)
        return draft.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Falha ao processar com IA: {e}") from e


@router.post("/create")
def create_ticket(body: TicketCreateRequest):
    draft = body
    descricao_issue = (
        f"**Módulo afetado:** {draft.modulo_afetado}\n\n"
        f"{draft.descricao_tecnica}\n\n"
        "---\n\n"
        "## Prompt para Cursor (IA)\n\n"
        f"{draft.cursor_prompt}"
    )
    try:
        issue = linear_service.create_issue(
            titulo=draft.titulo,
            descricao_markdown=descricao_issue,
            prioridade=draft.prioridade,
            tipo_label=draft.tipo,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Falha ao criar issue no Linear: {e}") from e

    try:
        email_service.send_ticket_notification(
            tipo=draft.tipo,
            titulo=draft.titulo,
            prioridade=draft.prioridade,
            modulo_afetado=draft.modulo_afetado,
            descricao_tecnica=draft.descricao_tecnica,
            link=issue.get("url"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Issue criada ({issue.get('url')}), mas falha ao enviar e-mail: {e}",
        ) from e

    return {
        "ok": True,
        "linear": issue,
        "cursor_prompt": draft.cursor_prompt,
    }
