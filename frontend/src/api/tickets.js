const API_BASE = (() => {
  const raw = import.meta.env.VITE_API_URL;
  if (raw !== undefined && raw !== "") {
    return raw.replace(/\/$/, "");
  }
  if (import.meta.env.PROD) {
    return "";
  }
  return "http://localhost:8000";
})();

async function parseError(res) {
  let detail = res.statusText;
  try {
    const j = await res.json();
    if (j?.detail) {
      detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    }
  } catch {
    /* ignore */
  }
  return detail;
}

/**
 * @param {string} descricao
 * @returns {Promise<Record<string, unknown>>}
 */
export async function previewTicket(descricao) {
  const res = await fetch(`${API_BASE}/tickets/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ descricao }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/**
 * @param {Record<string, unknown>} draft
 * @returns {Promise<{ ok: boolean; linear: object }>}
 */
export async function createTicket(draft) {
  const res = await fetch(`${API_BASE}/tickets/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
