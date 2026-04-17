export default function TicketForm({
  value,
  onChange,
  onSubmit,
  files,
  onFilesChange,
  onRemoveFile,
  disabled,
  error,
}) {
  const acceptedTypes = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.csv,.doc,.docx,.xls,.xlsx";

  function formatSize(bytes) {
    if (!Number.isFinite(bytes)) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <label
          htmlFor="descricao"
          className="form-label mb-2 block text-sm font-medium"
        >
          Descreva o problema ou pedido
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Ex.: Preciso de uma nova visão consolidada de comissão por parceiro, com total mensal e detalhamento por contrato."
          className="form-field w-full resize-y rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 disabled:opacity-50"
        />
      </div>
      <div>
        <label
          htmlFor="files"
          className="form-label mb-2 block text-sm font-medium"
        >
          Anexos (prints, PDF, TXT e outros)
        </label>
        <input
          id="files"
          name="files"
          type="file"
          multiple
          accept={acceptedTypes}
          disabled={disabled}
          onChange={(e) => onFilesChange?.(Array.from(e.target.files || []))}
          className="file-input block w-full rounded-xl px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-semibold disabled:opacity-50"
        />
        <p className="form-help mt-2 text-xs">
          Máx. 10 arquivos, até 10 MB por arquivo.
        </p>
        {files?.length ? (
          <ul className="mt-3 space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="file-chip flex items-center justify-between rounded-lg px-3 py-2 text-xs"
              >
                <span className="truncate pr-3">
                  {file.name} ({formatSize(file.size)})
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveFile?.(index)}
                  disabled={disabled}
                  className="chip-action rounded-md px-2 py-1 text-[11px] font-medium disabled:opacity-50"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? (
        <p className="form-error rounded-lg px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="primary-btn inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        {disabled ? "Gerando preview com IA…" : "Gerar preview com IA"}
      </button>
    </form>
  );
}
