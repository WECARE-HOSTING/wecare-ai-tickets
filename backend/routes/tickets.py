import logging
from json import JSONDecodeError, loads
from typing import Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from services import ai, email as email_service
from services import linear as linear_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tickets", tags=["tickets"])
MAX_FILES = 10
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


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
async def create_ticket(
    draft_payload: str = Form(..., alias="draft"),
    files: list[UploadFile] = File(default_factory=list),
):
    try:
        draft_data = loads(draft_payload)
    except JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"JSON inválido em draft: {e}") from e

    try:
        parsed_draft = TicketCreateRequest.model_validate(draft_data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Dados inválidos: {e}") from e

    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=422,
            detail=f"Máximo de {MAX_FILES} anexos por chamado.",
        )

    attachments: list[tuple[str, bytes, str]] = []
    for file in files:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=422,
                detail=f'O arquivo "{file.filename or "sem_nome"}" excede 10 MB.',
            )
        attachments.append(
            (
                file.filename or "anexo",
                content,
                file.content_type or "application/octet-stream",
            )
        )

    draft = parsed_draft
    anexos_markdown = ""
    if attachments:
        itens = "\n".join(f"- {name}" for name, _, _ in attachments)
        anexos_markdown = f"\n\n## Anexos enviados\n\n{itens}"

    descricao_issue = (
        f"**Módulo afetado:** {draft.modulo_afetado}\n\n"
        f"{draft.descricao_tecnica}\n\n"
        f"{anexos_markdown}\n\n"
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

    email_error: str | None = None
    try:
        email_service.send_ticket_notification(
            tipo=draft.tipo,
            titulo=draft.titulo,
            prioridade=draft.prioridade,
            modulo_afetado=draft.modulo_afetado,
            descricao_tecnica=draft.descricao_tecnica,
            cursor_prompt=draft.cursor_prompt,
            link=issue.get("url"),
            anexos=attachments,
        )
    except ValueError as e:
        email_error = str(e)
        logger.warning("Notificação por e-mail não enviada (config): %s", email_error)
    except Exception as e:
        email_error = str(e)
        logger.exception(
            "Issue criada no Linear (%s), mas falha ao enviar e-mail.",
            issue.get("url"),
        )

    return {
        "ok": True,
        "linear": issue,
        "email_sent": email_error is None,
        "email_error": email_error,
    }
