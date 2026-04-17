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
 * @param {() => Promise<string | null>} [getToken]
 * @returns {Promise<Record<string, string>>}
 */
async function authHeaders(getToken) {
  const headers = {};
  if (typeof getToken === "function") {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * @param {string} descricao
 * @param {() => Promise<string | null>} getToken
 * @returns {Promise<Record<string, unknown>>}
 */
export async function previewTicket(descricao, getToken) {
  const res = await fetch(`${API_BASE}/tickets/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders(getToken)),
    },
    body: JSON.stringify({ descricao }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/**
 * @param {Record<string, unknown>} draft
 * @param {File[]} files
 * @param {() => Promise<string | null>} getToken
 * @returns {Promise<{ ok: boolean; linear: object }>}
 */
export async function createTicket(draft, files = [], getToken) {
  const formData = new FormData();
  formData.append("draft", JSON.stringify(draft));
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await fetch(`${API_BASE}/tickets/create`, {
    method: "POST",
    headers: await authHeaders(getToken),
    body: formData,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/**
 * @param {() => Promise<string | null>} getToken
 * @returns {Promise<{ tickets: object[]; unread_completed: number }>}
 */
export async function listMyTickets(getToken) {
  const res = await fetch(`${API_BASE}/tickets/mine`, {
    headers: await authHeaders(getToken),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/**
 * @param {() => Promise<string | null>} getToken
 * @returns {Promise<{ ok: boolean; updated: number }>}
 */
export async function markMyTicketsViewed(getToken) {
  const res = await fetch(`${API_BASE}/tickets/mine/mark-viewed`, {
    method: "POST",
    headers: await authHeaders(getToken),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
