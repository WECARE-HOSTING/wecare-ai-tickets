import { useState } from "react";
import { createTicket, previewTicket } from "./api/tickets.js";
import AiPreview from "./components/AiPreview.jsx";
import TicketForm from "./components/TicketForm.jsx";

const emptyDraft = () => ({
  tipo: "Dúvida",
  titulo: "",
  descricao_tecnica: "",
  prioridade: "medium",
  modulo_afetado: "",
  cursor_prompt: "",
});

export default function App() {
  const [step, setStep] = useState("form");
  const [descricao, setDescricao] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [linear, setLinear] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [error, setError] = useState("");

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
      const res = await createTicket(draft);
      setLinear(res.linear);
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
    setDraft(emptyDraft());
    setLinear(null);
    setError("");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <img
          src="/logo.png"
          alt="WeCare Hosting"
          className="mx-auto h-14 w-auto max-w-full object-contain sm:h-16"
        />
        <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-wecare-400">
          WeCare Hosting
        </p>
        <h1 className="bg-gradient-to-r from-white via-wecare-100 to-wecare-orange bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
          Tickets de TI com IA
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          Descreva em texto livre, revise o que a IA propõe e abra a issue no Linear com notificação por e-mail.
        </p>
      </header>

      <main className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 shadow-2xl shadow-black/40 ring-1 ring-wecare-800/25 backdrop-blur-sm sm:p-8">
        {step === "form" ? (
          <TicketForm
            value={descricao}
            onChange={setDescricao}
            onSubmit={handlePreview}
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
            <div className="rounded-xl border border-wecare-teal/35 bg-wecare-teal/10 px-4 py-3 text-sm text-zinc-100">
              <p className="font-semibold text-wecare-teal">Ticket criado com sucesso.</p>
              {linear?.url ? (
                <a
                  href={linear.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-wecare-300 underline decoration-wecare-500/60 underline-offset-2 hover:text-wecare-200"
                >
                  Abrir issue no Linear ({linear.identifier || linear.id})
                </a>
              ) : null}
            </div>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
            >
              Abrir outro ticket
            </button>
          </div>
        ) : null}
      </main>

      <footer className="mt-auto pt-10 text-center text-xs text-zinc-600">
        Demo stateless · Linear + SMTP
      </footer>
    </div>
  );
}
