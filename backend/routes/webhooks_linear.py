"""Webhook Linear: status e comentários sincronizam o SQLite local."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from config import get_settings
from services import db as db_service

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _verify_linear_signature(secret: str, raw_body: bytes, signature: str | None) -> bool:
    if not signature:
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    try:
        return hmac.compare_digest(expected, signature.lower())
    except Exception:
        return False


def _terminal_completion_state(state: dict[str, Any] | None) -> bool:
    """Estados finais que disparam badge (concluído / cancelado)."""
    if not state:
        return False
    typ = (state.get("type") or "").strip().lower()
    name = (state.get("name") or "").strip().lower()
    if typ == "completed":
        return True
    if name in ("done", "canceled", "cancelled"):
        return True
    return False


def _replay_window_ok(webhook_ts_ms: Any, max_age_sec: int = 300) -> bool:
    try:
        ts = int(webhook_ts_ms)
    except (TypeError, ValueError):
        return True
    return abs(time.time() * 1000 - ts) <= max_age_sec * 1000


@router.post("/linear")
async def linear_webhook(request: Request):
    settings = get_settings()
    secret = settings.linear_webhook_secret.strip()
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="LINEAR_WEBHOOK_SECRET não configurado.",
        )

    raw = await request.body()
    sig = request.headers.get("linear-signature") or request.headers.get("Linear-Signature")
    if not _verify_linear_signature(secret, raw, sig):
        raise HTTPException(status_code=401, detail="Assinatura inválida.")

    try:
        payload: dict[str, Any] = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=422, detail="Corpo JSON inválido.") from e

    if not _replay_window_ok(payload.get("webhookTimestamp")):
        raise HTTPException(status_code=401, detail="Timestamp fora da janela.")

    event_type = (payload.get("type") or "").strip()
    action = (payload.get("action") or "").strip()
    data = payload.get("data") or {}

    if event_type == "Issue" and action == "update":
        issue_id = (data.get("id") or "").strip()
        state = data.get("state") if isinstance(data.get("state"), dict) else None
        if issue_id and state is not None:
            status_name = (state.get("name") or "").strip() or "—"
            if _terminal_completion_state(state):
                db_service.update_ticket_by_linear_issue_id(
                    issue_id,
                    status=status_name,
                    notified=0,
                )
            else:
                db_service.update_ticket_by_linear_issue_id(
                    issue_id,
                    status=status_name,
                )

    elif event_type == "Comment" and action in ("create", "update"):
        issue_id = (data.get("issueId") or data.get("issue_id") or "").strip()
        body = data.get("body")
        created_at = (data.get("createdAt") or "").strip() or None
        if issue_id and isinstance(body, str):
            preview = body.strip()[:2000] or None
            db_service.update_ticket_by_linear_issue_id(
                issue_id,
                last_comment_body=preview,
                last_comment_at=created_at,
            )

    return {"ok": True}
