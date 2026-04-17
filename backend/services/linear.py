"""Cliente Linear: API oficial é GraphQL via POST HTTPS (documentação Linear Developers)."""

from typing import Any

import httpx

from config import get_settings

LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql"


def _headers() -> dict[str, str]:
    settings = get_settings()
    if not settings.linear_api_key:
        raise ValueError("LINEAR_API_KEY não configurada.")
    return {
        "Authorization": settings.linear_api_key,
        "Content-Type": "application/json",
    }


def _priority_to_linear(prioridade: str) -> int:
    mapping = {"urgent": 1, "high": 2, "medium": 3, "low": 4}
    return mapping.get(prioridade.lower(), 3)


def create_issue(
    *,
    titulo: str,
    descricao_markdown: str,
    prioridade: str,
    tipo_label: str | None = None,
) -> dict[str, Any]:
    """Cria issue no time (e opcionalmente no projeto) configurados via env."""
    settings = get_settings()
    if not settings.linear_team_id:
        raise ValueError("LINEAR_TEAM_ID não configurado.")

    mutation = """
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          url
        }
      }
    }
    """

    issue_input: dict[str, Any] = {
        "teamId": settings.linear_team_id,
        "title": titulo,
        "description": descricao_markdown,
        "priority": _priority_to_linear(prioridade),
    }
    if settings.linear_project_id:
        issue_input["projectId"] = settings.linear_project_id

    if tipo_label:
        issue_input["description"] = (
            f"**Tipo (IA):** {tipo_label}\n\n" + descricao_markdown
        )

    payload = {"query": mutation, "variables": {"input": issue_input}}

    with httpx.Client(timeout=30.0) as client:
        resp = client.post(LINEAR_GRAPHQL_URL, json=payload, headers=_headers())
        resp.raise_for_status()
        body = resp.json()

    if "errors" in body and body["errors"]:
        msgs = "; ".join(e.get("message", str(e)) for e in body["errors"])
        raise RuntimeError(f"Linear API: {msgs}")

    data = body.get("data") or {}
    ic = data.get("issueCreate") or {}
    if not ic.get("success"):
        raise RuntimeError("Linear não confirmou criação da issue.")

    issue = ic.get("issue") or {}
    return {
        "id": issue.get("id"),
        "identifier": issue.get("identifier"),
        "title": issue.get("title"),
        "url": issue.get("url"),
    }


def get_issue_snapshot(issue_id: str) -> dict[str, Any]:
    """Estado atual e último comentário (por data) da issue no Linear."""
    query = """
    query IssueSnapshot($id: String!) {
      issue(id: $id) {
        id
        identifier
        title
        url
        state { name type }
        comments(first: 30) {
          nodes { body createdAt }
        }
      }
    }
    """
    payload = {"query": query, "variables": {"id": issue_id}}
    with httpx.Client(timeout=30.0) as client:
        resp = client.post(LINEAR_GRAPHQL_URL, json=payload, headers=_headers())
        resp.raise_for_status()
        body = resp.json()

    if "errors" in body and body["errors"]:
        msgs = "; ".join(e.get("message", str(e)) for e in body["errors"])
        raise RuntimeError(f"Linear API: {msgs}")

    issue = (body.get("data") or {}).get("issue") or {}
    if not issue.get("id"):
        raise RuntimeError("Issue não encontrada no Linear.")

    state = issue.get("state") or {}
    status_name = (state.get("name") or "").strip() or "—"
    nodes = ((issue.get("comments") or {}).get("nodes")) or []
    last_body: str | None = None
    last_at: str | None = None
    if nodes:
        sorted_nodes = sorted(
            nodes,
            key=lambda c: c.get("createdAt") or "",
            reverse=True,
        )
        top = sorted_nodes[0]
        raw_body = (top.get("body") or "").strip()
        last_body = raw_body[:2000] if raw_body else None
        last_at = (top.get("createdAt") or "").strip() or None

    return {
        "linear_issue_id": issue.get("id"),
        "linear_identifier": issue.get("identifier"),
        "linear_url": issue.get("url"),
        "titulo": issue.get("title") or "",
        "status": status_name,
        "last_comment_body": last_body,
        "last_comment_at": last_at,
    }
