import { useEffect, useState } from "react";
import { createTicket, previewTicket } from "./api/tickets.js";
import AiPreview from "./components/AiPreview.jsx";
import TicketForm from "./components/TicketForm.jsx";

const THEME_STORAGE_KEY = "wecare-theme";

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const emptyDraft = () => ({
  tipo: "Dúvida",
  titulo: "",
  descricao_tecnica: "",
  prioridade: "medium",
  modulo_afetado: "",
  cursor_prompt: "",
});

export default function App() {
  const MAX_FILES = 10;
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
  const [step, setStep] = useState("form");
  const [descricao, setDescricao] = useState("");
  const [files, setFiles] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [linear, setLinear] = useState(null);
  const [emailError, setEmailError] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  async function handlePreview() {
    setError("");
    setLoadingPreview(true);
    try {
      const data = await previewTicket(descricao);
      setDraft(data);
      setStep("preview");
    } catch (e) {
      setError(e.message || "Falha ao gerar preview.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleCreate() {
    setError("");
    setLoadingCreate(true);
    try {
      const res = await createTicket(draft, files);
      setLinear(res.linear);
      setEmailError(
        res.email_sent === false && res.email_error ? String(res.email_error) : ""
      );
      setStep("done");
    } catch (e) {
      setError(e.message || "Falha ao criar ticket.");
    } finally {
      setLoadingCreate(false);
    }
  }

  function reset() {
    setStep("form");
    setDescricao("");
    setFiles([]);
    setDraft(emptyDraft());
    setLinear(null);
    setEmailError("");
    setError("");
  }

  function handleFilesChange(newFiles) {
    const safeFiles = newFiles.slice(0, MAX_FILES);
    const tooLarge = safeFiles.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge) {
      setError(
        `O arquivo "${tooLarge.name}" excede o limite de 10 MB.`
      );
      return;
    }
    if (newFiles.length > MAX_FILES) {
      setError(`Você pode anexar no máximo ${MAX_FILES} arquivos.`);
      return;
    }
    setError("");
    setFiles(safeFiles);
  }

  function handleRemoveFile(indexToRemove) {
    setFiles((current) => current.filter((_, index) => index !== indexToRemove));
  }

  return (
    <div className="app-page mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <header className="app-header mb-10 rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <img
            src="/logo.png"
            alt="WeCare Hosting"
            className="h-12 w-auto max-w-full object-contain sm:h-14"
          />
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
        <p className="app-brand mb-1 text-xs font-semibold uppercase tracking-[0.2em]">
          WeCare Hosting
        </p>
        <h1 className="app-title text-3xl font-bold tracking-tight sm:text-4xl">
          Tickets de TI com IA
        </h1>
        <p className="app-subtitle mt-3 text-sm">
          Descreva em texto livre, revise o que a IA propõe e abra a issue no Linear com notificação por e-mail.
        </p>
      </header>

      <main className="app-surface rounded-2xl p-6 sm:p-8">
        {step === "form" ? (
          <TicketForm
            value={descricao}
            onChange={setDescricao}
            onSubmit={handlePreview}
            files={files}
            onFilesChange={handleFilesChange}
            onRemoveFile={handleRemoveFile}
            disabled={loadingPreview}
            error={error}
          />
        ) : null}

        {step === "preview" ? (
          <AiPreview
            draft={draft}
            onChangeDraft={setDraft}
            onConfirm={handleCreate}
            onBack={() => {
              setStep("form");
              setError("");
            }}
            disabled={loadingCreate}
            error={error}
          />
        ) : null}

        {step === "done" ? (
          <div className="space-y-8">
            <div className="success-alert rounded-xl px-4 py-3 text-sm">
              <p className="font-semibold text-wecare-teal">Ticket criado com sucesso.</p>
              {linear?.url ? (
                <a
                  href={linear.url}
                  target="_blank"
                  rel="noreferrer"
                  className="success-link mt-2 inline-block underline underline-offset-2"
                >
                  Abrir issue no Linear ({linear.identifier || linear.id})
                </a>
              ) : null}
            </div>
            {emailError ? (
              <div
                className="warning-alert rounded-xl px-4 py-3 text-sm"
                role="status"
              >
                <p className="font-semibold">E-mail de notificação não enviado</p>
                <p className="mt-1">{emailError}</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={reset}
              className="secondary-btn rounded-xl px-4 py-2 text-sm font-medium"
            >
              Abrir outro ticket
            </button>
          </div>
        ) : null}
      </main>

      <footer className="app-footer mt-auto pt-10 text-center text-xs">
        Demo stateless · Linear + SMTP
      </footer>
    </div>
  );
}
