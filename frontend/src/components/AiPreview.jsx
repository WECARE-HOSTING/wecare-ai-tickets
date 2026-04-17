const tipoColors = {
  Bug: "badge-danger",
  Melhoria: "badge-success",
  Implantação: "badge-warning",
  Dúvida: "badge-neutral",
};

const prioridadeLabel = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const prioridadeOrdem = ["urgent", "high", "medium", "low"];

export default function AiPreview({
  draft,
  onChangeDraft,
  onConfirm,
  onBack,
  disabled,
  error,
}) {
  const tipoClass =
    tipoColors[draft.tipo] || "badge-primary";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tipoClass}`}
        >
          {draft.tipo}
        </span>
        <span className="preview-meta-badge rounded-full px-3 py-1 text-xs">
          Módulo: {draft.modulo_afetado}
        </span>
      </div>

      <div>
        <label
          htmlFor="preview-prioridade"
          className="form-label mb-1 block text-xs font-semibold uppercase tracking-wide"
        >
          Prioridade
        </label>
        <select
          id="preview-prioridade"
          className="form-field w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 disabled:opacity-50"
          value={draft.prioridade ?? "medium"}
          onChange={(e) =>
            onChangeDraft?.({
              ...draft,
              prioridade: e.target.value,
            })
          }
          disabled={disabled}
        >
          {prioridadeOrdem.map((valor) => (
            <option key={valor} value={valor}>
              {prioridadeLabel[valor]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="form-label mb-1 block text-xs font-semibold uppercase tracking-wide">
          Título sugerido pela IA
        </label>
        <input
          type="text"
          className="form-field w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 disabled:opacity-50"
          value={draft.titulo}
          onChange={(e) =>
            onChangeDraft?.({
              ...draft,
              titulo: e.target.value,
            })
          }
          disabled={disabled}
        />
      </div>

      <div>
        <h4 className="form-label mb-2 text-xs font-semibold uppercase tracking-wide">
          Descrição técnica sugerida (markdown)
        </h4>
        <textarea
          rows={10}
          className="form-field w-full rounded-xl px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 disabled:opacity-50"
          value={draft.descricao_tecnica}
          onChange={(e) =>
            onChangeDraft?.({
              ...draft,
              descricao_tecnica: e.target.value,
            })
          }
          disabled={disabled}
        />
      </div>

      {error ? (
        <p className="form-error rounded-lg px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={disabled}
          className="secondary-btn rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          Voltar e editar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="primary-btn rounded-xl px-5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {disabled ? "Criando no Linear…" : "Confirmar e abrir ticket"}
        </button>
      </div>
    </div>
  );
}
