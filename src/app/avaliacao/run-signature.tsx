"use client";

import { useState } from "react";

export function CopyRunSignature({ signature }: { signature: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(signature);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      //
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rule-2 bg-sheet px-3 py-1.5 text-[12px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Copiar assinatura da rodada
      </button>
      <span role="status" aria-live="polite" className="text-[12px] text-ink-1">
        {copied ? "Assinatura copiada." : ""}
      </span>
    </div>
  );
}
