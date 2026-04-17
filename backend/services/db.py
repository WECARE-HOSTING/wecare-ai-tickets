"""Persistência local de tickets (SQLite) para painel e webhooks Linear."""

from __future__ import annotations

import sqlite3
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from config import get_settings

def _db_path() -> Path:
    raw = get_settings().tickets_db_path.strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return Path(__file__).resolve().parent.parent / "data" / "tickets.db"


def _connect() -> sqlite3.Connection:
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path, check_same_thread=False)
    con.row_factory = sqlite3.Row
    return con


def init_db() -> None:
    con = _connect()
    try:
        con.executescript(
            """
            CREATE TABLE IF NOT EXISTS tickets (
              id TEXT PRIMARY KEY,
              linear_issue_id TEXT NOT NULL UNIQUE,
              linear_identifier TEXT,
              linear_url TEXT,
              titulo TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT '',
              requester_email TEXT NOT NULL,
              requester_name TEXT NOT NULL,
              requester_clerk_id TEXT NOT NULL,
              requester_avatar TEXT,
              last_comment_body TEXT,
              last_comment_at TEXT,
              notified INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_tickets_requester
              ON tickets(requester_clerk_id);
            """
        )
        con.commit()
    finally:
        con.close()


def _now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


@dataclass
class TicketRow:
    id: str
    linear_issue_id: str
    linear_identifier: str | None
    linear_url: str | None
    titulo: str
    status: str
    requester_email: str
    requester_name: str
    requester_clerk_id: str
    requester_avatar: str | None
    last_comment_body: str | None
    last_comment_at: str | None
    notified: bool
    created_at: str
    updated_at: str

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> TicketRow:
        return cls(
            id=row["id"],
            linear_issue_id=row["linear_issue_id"],
            linear_identifier=row["linear_identifier"],
            linear_url=row["linear_url"],
            titulo=row["titulo"],
            status=row["status"] or "",
            requester_email=row["requester_email"],
            requester_name=row["requester_name"],
            requester_clerk_id=row["requester_clerk_id"],
            requester_avatar=row["requester_avatar"],
            last_comment_body=row["last_comment_body"],
            last_comment_at=row["last_comment_at"],
            notified=bool(row["notified"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def to_api_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "linear_issue_id": self.linear_issue_id,
            "linear_identifier": self.linear_identifier,
            "linear_url": self.linear_url,
            "titulo": self.titulo,
            "status": self.status,
            "last_comment_body": self.last_comment_body,
            "last_comment_at": self.last_comment_at,
            "notified": self.notified,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


def insert_ticket(
    *,
    linear_issue_id: str,
    linear_identifier: str | None,
    linear_url: str | None,
    titulo: str,
    status: str,
    requester_email: str,
    requester_name: str,
    requester_clerk_id: str,
    requester_avatar: str | None,
    last_comment_body: str | None,
    last_comment_at: str | None,
) -> TicketRow:
    tid = str(uuid.uuid4())
    ts = _now_iso()
    con = _connect()
    try:
        con.execute(
            """
            INSERT INTO tickets (
              id, linear_issue_id, linear_identifier, linear_url, titulo, status,
              requester_email, requester_name, requester_clerk_id, requester_avatar,
              last_comment_body, last_comment_at, notified, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            """,
            (
                tid,
                linear_issue_id,
                linear_identifier,
                linear_url,
                titulo,
                status,
                requester_email,
                requester_name,
                requester_clerk_id,
                requester_avatar or "",
                last_comment_body,
                last_comment_at,
                ts,
                ts,
            ),
        )
        con.commit()
        row = con.execute("SELECT * FROM tickets WHERE id = ?", (tid,)).fetchone()
        assert row is not None
        return TicketRow.from_row(row)
    finally:
        con.close()


def list_tickets_for_requester(clerk_user_id: str) -> list[TicketRow]:
    con = _connect()
    try:
        cur = con.execute(
            """
            SELECT * FROM tickets
            WHERE requester_clerk_id = ?
            ORDER BY datetime(updated_at) DESC
            """,
            (clerk_user_id,),
        )
        return [TicketRow.from_row(r) for r in cur.fetchall()]
    finally:
        con.close()


def count_unread_completed(clerk_user_id: str) -> int:
    con = _connect()
    try:
        row = con.execute(
            """
            SELECT COUNT(*) AS c FROM tickets
            WHERE requester_clerk_id = ?
              AND notified = 0
            """,
            (clerk_user_id,),
        ).fetchone()
        return int(row["c"]) if row else 0
    finally:
        con.close()


def mark_all_viewed_for_requester(clerk_user_id: str) -> int:
    con = _connect()
    try:
        cur = con.execute(
            """
            UPDATE tickets SET notified = 1, updated_at = ?
            WHERE requester_clerk_id = ? AND notified = 0
            """,
            (_now_iso(), clerk_user_id),
        )
        con.commit()
        return cur.rowcount
    finally:
        con.close()


def update_ticket_by_linear_issue_id(
    linear_issue_id: str,
    *,
    status: str | None = None,
    last_comment_body: str | None = None,
    last_comment_at: str | None = None,
    notified: int | None = None,
) -> bool:
    fields: list[str] = []
    values: list[Any] = []
    if status is not None:
        fields.append("status = ?")
        values.append(status)
    if last_comment_body is not None:
        fields.append("last_comment_body = ?")
        values.append(last_comment_body)
    if last_comment_at is not None:
        fields.append("last_comment_at = ?")
        values.append(last_comment_at)
    if notified is not None:
        fields.append("notified = ?")
        values.append(notified)
    if not fields:
        return False
    fields.append("updated_at = ?")
    values.append(_now_iso())
    values.append(linear_issue_id)
    con = _connect()
    try:
        cur = con.execute(
            f"UPDATE tickets SET {', '.join(fields)} WHERE linear_issue_id = ?",
            values,
        )
        con.commit()
        return cur.rowcount > 0
    finally:
        con.close()


def get_ticket_by_linear_issue_id(linear_issue_id: str) -> TicketRow | None:
    con = _connect()
    try:
        row = con.execute(
            "SELECT * FROM tickets WHERE linear_issue_id = ? LIMIT 1",
            (linear_issue_id,),
        ).fetchone()
        return TicketRow.from_row(row) if row else None
    finally:
        con.close()
