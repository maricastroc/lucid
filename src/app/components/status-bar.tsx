"use client";

/**
 * STATUS BAR — o rodapé de instrumentação, como num IDE. Determinismo (o ponto),
 * proveniência (versão, hash da config), convenção de offset, posição da seleção, contagem
 * de diagnósticos e o Flesch-PT. Tudo mono, denso, sem marketing.
 */
import type { Diagnostic, Finding } from "@/lucid";
import { offsetToLineCol } from "../lib/editor-model";

interface Props {
  diagnostic: Diagnostic;
  selectedFinding: Finding | null;
}

export function StatusBar({ diagnostic, selectedFinding }: Props) {
  const pos = selectedFinding ? offsetToLineCol(diagnostic.text, selectedFinding.span.start) : null;
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

  return (
    <footer className="flex h-6 shrink-0 items-center justify-between border-t border-line-2 bg-bg-1 px-3 font-mono text-[10.5px] text-fg-3">
      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1.5 text-fg-2">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          determinístico
        </span>
        <Sep />
        <span>lucid v{diagnostic.meta.lucidVersion}</span>
        <Sep />
        <span>cfg {diagnostic.meta.configHash}</span>
        <Sep />
        <span className="hidden sm:inline">utf-16 · nfc</span>
      </div>
      <div className="flex items-center gap-2.5">
        {pos && (
          <>
            <span className="text-fg-2">Ln {pos.line}, Col {pos.col}</span>
            <Sep />
          </>
        )}
        <span>{diagnostic.findings.length} diagnósticos</span>
        <Sep />
        <span className="hidden md:inline">flesch-pt {fmt(diagnostic.metrics.fleschPt)}</span>
        <Sep />
        <span className="hidden lg:inline text-fg-3">{diagnostic.meta.standardVersion}</span>
      </div>
    </footer>
  );
}

function Sep() {
  return <span className="text-fg-3/50" aria-hidden>·</span>;
}
