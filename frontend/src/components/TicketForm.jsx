export default function TicketForm({
  value,
  onChange,
  onSubmit,
  disabled,
  error,
}) {
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
          placeholder="Ex.: O painel de backups não lista jobs desde ontem; clientes X e Y afetados..."
          className="w-full resize-y rounded-xl border border-wecare-700/50 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-100 shadow-inner outline-none ring-wecare-500/30 placeholder:text-zinc-500 focus:border-wecare-500 focus:ring-2 disabled:opacity-50"
        />
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
