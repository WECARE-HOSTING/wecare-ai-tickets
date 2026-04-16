const tipoColors = {
  Bug: "bg-red-500/15 text-red-200 ring-red-500/30",
  Melhoria: "bg-wecare-teal/15 text-teal-100 ring-wecare-teal/35",
  Implantação: "bg-wecare-yellow/15 text-amber-100 ring-wecare-yellow/35",
  Dúvida: "bg-zinc-500/20 text-zinc-200 ring-zinc-500/30",
};

const prioridadeLabel = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export default function AiPreview({ draft, onConfirm, onBack, disabled, error }) {
  const tipoClass =
    tipoColors[draft.tipo] ||
    "bg-wecare-500/15 text-wecare-100 ring-wecare-500/30";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tipoClass}`}
        >
          {draft.tipo}
        </span>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 ring-1 ring-zinc-700">
          Prioridade: {prioridadeLabel[draft.prioridade] ?? draft.prioridade}
        </span>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 ring-1 ring-zinc-700">
          Módulo: {draft.modulo_afetado}
        </span>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white">{draft.titulo}</h3>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-wecare-300">
          Descrição técnica (markdown)
        </h4>
        <div className="max-h-72 overflow-auto rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm leading-relaxed text-zinc-200">
          <pre className="whitespace-pre-wrap font-sans">{draft.descricao_tecnica}</pre>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={disabled}
          className="rounded-xl border border-zinc-600 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
        >
          Voltar e editar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="rounded-xl bg-gradient-to-r from-wecare-600 to-wecare-orange px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-wecare-950/45 hover:from-wecare-500 hover:to-wecare-orange/95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {disabled ? "Criando no Linear…" : "Confirmar e abrir ticket"}
        </button>
      </div>
    </div>
  );
}
