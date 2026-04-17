from json import JSONDecodeError, loads
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from services import ai
from services import db as db_service
from services import linear as linear_service
from services.clerk_auth import ClerkAuthUser, get_clerk_user

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
def preview_ticket(body: TicketPreviewRequest, _user: ClerkAuthUser = Depends(get_clerk_user)):
    try:
        raw = ai.enrich_ticket_description(body.descricao)
        draft = _validate_draft(raw)
        return draft.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Falha ao processar com IA: {e}") from e


@router.get("/mine")
def list_my_tickets(user: ClerkAuthUser = Depends(get_clerk_user)):
    rows = db_service.list_tickets_for_requester(user.user_id)
    unread = db_service.count_unread_completed(user.user_id)
    return {
        "tickets": [r.to_api_dict() for r in rows],
        "unread_completed": unread,
    }


@router.post("/mine/mark-viewed")
def mark_my_tickets_viewed(user: ClerkAuthUser = Depends(get_clerk_user)):
    updated = db_service.mark_all_viewed_for_requester(user.user_id)
    return {"ok": True, "updated": updated}


@router.post("/create")
async def create_ticket(
    draft_payload: str = Form(..., alias="draft"),
    files: list[UploadFile] = File(default_factory=list),
    user: ClerkAuthUser = Depends(get_clerk_user),
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

    solicitante_md = (
        "\n\n---\n\n## Solicitante (Clerk / Google)\n\n"
        f"- **Nome:** {user.full_name}\n"
        f"- **E-mail:** {user.email}\n"
        f"- **Clerk user id:** `{user.user_id}`\n"
    )
    if user.image_url:
        solicitante_md += f"- **Avatar:** {user.image_url}\n"

    descricao_issue = (
        f"**Módulo afetado:** {draft.modulo_afetado}\n\n"
        f"{draft.descricao_tecnica}\n\n"
        f"{anexos_markdown}\n\n"
        "---\n\n"
        "## Prompt para Cursor (IA)\n\n"
        f"{draft.cursor_prompt}"
        f"{solicitante_md}"
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

    issue_id = issue.get("id") or ""
    if not issue_id:
        raise HTTPException(status_code=502, detail="Linear não retornou id da issue.")

    try:
        snap = linear_service.get_issue_snapshot(issue_id)
    except Exception:
        snap = {
            "status": "—",
            "last_comment_body": None,
            "last_comment_at": None,
        }

    try:
        db_service.insert_ticket(
            linear_issue_id=issue_id,
            linear_identifier=issue.get("identifier"),
            linear_url=issue.get("url"),
            titulo=draft.titulo,
            status=str(snap.get("status") or "—"),
            requester_email=user.email,
            requester_name=user.full_name,
            requester_clerk_id=user.user_id,
            requester_avatar=user.image_url or None,
            last_comment_body=snap.get("last_comment_body"),
            last_comment_at=snap.get("last_comment_at"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Issue criada no Linear, mas falhou ao salvar localmente: {e}",
        ) from e

    return {
        "ok": True,
        "linear": issue,
    }
