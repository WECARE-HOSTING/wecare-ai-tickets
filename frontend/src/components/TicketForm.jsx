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
          className="mb-2 block text-sm font-medium text-zinc-300"
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
          className="w-full resize-y rounded-xl border border-wecare-700/50 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-100 shadow-inner outline-none ring-wecare-500/30 placeholder:text-zinc-500 focus:border-wecare-500 focus:ring-2 disabled:opacity-50"
        />
      </div>
      <div>
        <label
          htmlFor="files"
          className="mb-2 block text-sm font-medium text-zinc-300"
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
          className="block w-full rounded-xl border border-wecare-700/50 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200 file:mr-3 file:rounded-lg file:border-0 file:bg-wecare-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-wecare-600 disabled:opacity-50"
        />
        <p className="mt-2 text-xs text-zinc-500">
          Máx. 10 arquivos, até 10 MB por arquivo.
        </p>
        {files?.length ? (
          <ul className="mt-3 space-y-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center justify-between rounded-lg border border-zinc-700/70 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-200"
              >
                <span className="truncate pr-3">
                  {file.name} ({formatSize(file.size)})
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveFile?.(index)}
                  disabled={disabled}
                  className="rounded-md border border-zinc-600 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-wecare-600 to-wecare-orange px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-wecare-950/45 transition hover:from-wecare-500 hover:to-wecare-orange/95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {disabled ? "Gerando preview com IA…" : "Gerar preview com IA"}
      </button>
    </form>
  );
}
