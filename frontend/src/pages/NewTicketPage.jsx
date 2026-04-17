import { useAuth } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { createTicket, previewTicket } from "../api/tickets.js";
import AiPreview from "../components/AiPreview.jsx";
import TicketForm from "../components/TicketForm.jsx";

const emptyDraft = () => ({
  tipo: "Dúvida",
  titulo: "",
  descricao_tecnica: "",
  prioridade: "medium",
  modulo_afetado: "",
  cursor_prompt: "",
});

export default function NewTicketPage() {
  const { getToken } = useAuth();
  const { refreshUnread } = useOutletContext() || {};
  const MAX_FILES = 10;
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
  const [step, setStep] = useState("form");
  const [descricao, setDescricao] = useState("");
  const [files, setFiles] = useState([]);
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  const [draft, setDraft] = useState(emptyDraft);
  const [linear, setLinear] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [error, setError] = useState("");

  async function handlePreview() {
    setError("");
    setLoadingPreview(true);
    try {
      const data = await previewTicket(descricao, getToken);
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
      const res = await createTicket(draft, files, getToken);
      setLinear(res.linear);
      setStep("done");
      refreshUnread?.();
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
    setError("");
  }

  function handleFilesChange(newFiles) {
    if (!newFiles?.length) return;
    const current = filesRef.current;
    const merged = [...current, ...newFiles];
    const tooLarge = merged.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge) {
      setError(`O arquivo "${tooLarge.name}" excede o limite de 10 MB.`);
      return;
    }
    if (merged.length > MAX_FILES) {
      setError(`Você pode anexar no máximo ${MAX_FILES} arquivos.`);
      return;
    }
    setError("");
    setFiles(merged);
  }

  function handleRemoveFile(indexToRemove) {
    setFiles((current) => current.filter((_, index) => index !== indexToRemove));
  }

  return (
    <div className="app-surface rounded-2xl p-6 sm:p-8">
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
          <button
            type="button"
            onClick={reset}
            className="secondary-btn rounded-xl px-4 py-2 text-sm font-medium"
          >
            Abrir outro ticket
          </button>
        </div>
      ) : null}
    </div>
  );
}
