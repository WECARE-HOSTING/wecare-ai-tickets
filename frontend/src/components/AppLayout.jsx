import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { listMyTickets } from "../api/tickets.js";

const THEME_STORAGE_KEY = "wecare-theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function AppLayout() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { getToken } = useAuth();
  const location = useLocation();
  const [theme, setTheme] = useState(getInitialTheme);
  const [unreadCompleted, setUnreadCompleted] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const data = await listMyTickets(getToken);
      setUnreadCompleted(data.unread_completed ?? 0);
    } catch {
      setUnreadCompleted(0);
    }
  }, [getToken]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    void refreshUnread();
  }, [location.pathname, refreshUnread]);

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  const displayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.primaryEmailAddress?.emailAddress ||
    "Usuário";
  const avatar = user?.imageUrl;

  const outletContext = useMemo(() => ({ refreshUnread }), [refreshUnread]);

  const navClass = ({ isActive }) =>
    `nav-pill rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "nav-pill-active" : "nav-pill-idle"}`;

  return (
    <div className="app-page mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <header className="app-header mb-10 rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <img
            src="/logo.png"
            alt="WeCare Hosting"
            className="h-12 w-auto max-w-full object-contain sm:h-14"
          />
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <nav className="flex flex-wrap items-center gap-1">
              <NavLink to="/" end className={navClass}>
                Novo chamado
              </NavLink>
              <NavLink to="/meus-chamados" className={navClass}>
                <span className="inline-flex items-center gap-2">
                  Meus chamados
                  {unreadCompleted > 0 ? (
                    <span
                      className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-[#E55A4F] px-1.5 text-[11px] font-bold text-white"
                      aria-label={`${unreadCompleted} chamados concluídos não visualizados`}
                    >
                      {unreadCompleted > 9 ? "9+" : unreadCompleted}
                    </span>
                  ) : null}
                </span>
              </NavLink>
            </nav>
            <div className="user-chip flex items-center gap-2 rounded-full border border-[var(--chip-border)] bg-[var(--chip-bg)] py-1 pl-1 pr-2">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E55A4F] text-xs font-bold text-white">
                  {(displayName[0] || "?").toUpperCase()}
                </span>
              )}
              <span className="max-w-[10rem] truncate text-xs font-medium text-[var(--text-main)]">
                {displayName}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                void signOut({
                  redirectUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/entrar`,
                })
              }
              className="secondary-btn rounded-xl px-3 py-2 text-xs font-medium"
            >
              Sair
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle-btn"
              aria-label={`Ativar tema ${theme === "dark" ? "claro" : "escuro"}`}
              title={`Ativar tema ${theme === "dark" ? "claro" : "escuro"}`}
            >
              <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
            </button>
          </div>
        </div>
        <p className="app-brand mb-1 text-xs font-semibold uppercase tracking-[0.2em]">
          WeCare Hosting
        </p>
        <h1 className="app-title text-3xl font-bold tracking-tight sm:text-4xl">
          Tickets de TI com IA
        </h1>
        <p className="app-subtitle mt-3 text-sm">
          Descreva em texto livre, revise o que a IA propõe e acompanhe no Linear.
        </p>
      </header>

      <Outlet context={outletContext} />

      <footer className="app-footer mt-auto pt-10 text-center text-xs">
        WeCare · Clerk · Linear
      </footer>
    </div>
  );
}
