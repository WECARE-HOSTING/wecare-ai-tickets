#!/usr/bin/env python3
"""Lista teams e projetos do Linear (id + nome) via GraphQL."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql"

TEAMS_QUERY = """
query Teams($after: String) {
  teams(first: 100, after: $after) {
    nodes {
      id
      name
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
"""

PROJECTS_QUERY = """
query Projects($after: String) {
  projects(first: 100, after: $after) {
    nodes {
      id
      name
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
"""


def _load_api_key() -> str:
    env_file = Path(__file__).resolve().parent / ".env"
    load_dotenv(env_file)
    key = (os.environ.get("LINEAR_API_KEY") or "").strip()
    if not key:
        print(
            "Erro: LINEAR_API_KEY ausente ou vazia. Defina no arquivo .env na raiz do projeto.",
            file=sys.stderr,
        )
        sys.exit(1)
    return key


def _fetch_connection(
    client: httpx.Client,
    headers: dict[str, str],
    query: str,
    root_key: str,
) -> list[dict[str, str]]:
    nodes: list[dict[str, str]] = []
    after: str | None = None
    while True:
        resp = client.post(
            LINEAR_GRAPHQL_URL,
            headers=headers,
            json={"query": query, "variables": {"after": after}},
        )
        resp.raise_for_status()
        body = resp.json()
        errors = body.get("errors")
        if errors:
            print("Erro GraphQL:", errors, file=sys.stderr)
            sys.exit(1)
        data = body.get("data") or {}
        conn = data.get(root_key) or {}
        batch = conn.get("nodes") or []
        nodes.extend(batch)
        page = conn.get("pageInfo") or {}
        if not page.get("hasNextPage"):
            break
        after = page.get("endCursor")
    return nodes


def main() -> None:
    api_key = _load_api_key()
    headers = {
        "Authorization": api_key,
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=60.0) as client:
        teams = _fetch_connection(client, headers, TEAMS_QUERY, "teams")
        projects = _fetch_connection(client, headers, PROJECTS_QUERY, "projects")

    print("\n=== Teams ===\n")
    if not teams:
        print("  (nenhum team encontrado)\n")
    else:
        id_w = max(len(t["id"]) for t in teams)
        for t in teams:
            print(f"  {t['id']:<{id_w}}  {t['name']}")
        print()

    print("=== Projetos ===\n")
    if not projects:
        print("  (nenhum projeto encontrado)\n")
    else:
        id_w = max(len(p["id"]) for p in projects)
        for p in projects:
            print(f"  {p['id']:<{id_w}}  {p['name']}")
        print()


if __name__ == "__main__":
    main()
