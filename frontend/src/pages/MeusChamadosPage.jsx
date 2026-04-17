import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { listMyTickets, markMyTicketsViewed } from "../api/tickets.js";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

export default function MeusChamadosPage() {
  const { getToken } = useAuth();
  const { refreshUnread } = useOutletContext() || {};
  const [tickets, setTickets] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        await markMyTicketsViewed(getToken);
        const data = await listMyTickets(getToken);
        if (cancelled) return;
        setTickets(data.tickets || []);
        setUnread(data.unread_completed ?? 0);
        refreshUnread?.();
      } catch (e) {
        if (!cancelled) setError(e.message || "Não foi possível carregar os chamados.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [getToken, refreshUnread]);

  if (loading) {
    return (
      <div className="app-surface rounded-2xl p-8 text-center text-sm text-[var(--text-muted)]">
        Carregando seus chamados…
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-surface rounded-2xl p-8">
        <p className="form-error rounded-lg px-3 py-2 text-sm">{error}</p>
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="app-surface rounded-2xl p-8 text-center text-sm text-[var(--text-muted)]">
        Você ainda não possui chamados registrados aqui. Abra um ticket na página inicial.
      </div>
    );
  }

  return (
    <div className="app-surface rounded-2xl p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--text-main)]">Meus chamados</h2>
        {unread > 0 ? (
          <span className="rounded-full bg-[#E55A4F] px-3 py-1 text-xs font-semibold text-white">
            {unread} concluído(s) não visto(s)
          </span>
        ) : null}
      </div>
      <ul className="space-y-4">
        {tickets.map((t) => (
          <li
            key={t.id}
            className="ticket-row rounded-xl border border-[var(--surface-border)] bg-[var(--chip-bg)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--text-main)]">{t.titulo}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {t.linear_identifier || t.linear_issue_id} · Atualizado em{" "}
                  {formatDate(t.updated_at)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="preview-meta-badge rounded-full px-3 py-1 text-xs font-semibold">
                  {t.status || "—"}
                </span>
                {!t.notified ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#E55A4F]">
                    Novo
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-3 border-t border-[var(--divider)] pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Último comentário
              </p>
              <p className="mt-1 line-clamp-3 text-sm text-[var(--text-main)]">
                {t.last_comment_body?.trim() ? t.last_comment_body : "—"}
              </p>
              {t.last_comment_at ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">{formatDate(t.last_comment_at)}</p>
              ) : null}
            </div>
            {t.linear_url ? (
              <a
                href={t.linear_url}
                target="_blank"
                rel="noreferrer"
                className="success-link mt-3 inline-block text-sm font-medium underline underline-offset-2"
              >
                Abrir no Linear
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
