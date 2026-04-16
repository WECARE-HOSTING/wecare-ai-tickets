import { useState } from "react";

export default function CursorPrompt({ text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-wecare-200">
          Prompt para o Cursor Agent
        </h3>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg bg-wecare-800/90 px-3 py-1.5 text-xs font-medium text-wecare-50 ring-1 ring-wecare-500/40 hover:bg-wecare-700"
        >
          {copied ? "Copiado!" : "Copiar prompt"}
        </button>
      </div>
      <div className="max-h-96 overflow-auto rounded-xl border border-wecare-800/60 bg-zinc-950/80 p-4 font-mono text-xs leading-relaxed text-zinc-200 ring-1 ring-inset ring-wecare-900/30">
        <pre className="whitespace-pre-wrap">{text}</pre>
      </div>
      <p className="text-xs text-zinc-500">
        Cole no Cursor Agent para orientar implementação ou correção com contexto e critérios de aceite.
      </p>
    </div>
  );
}
