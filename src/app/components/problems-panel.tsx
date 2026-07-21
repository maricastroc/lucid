"use client";

/**
 * PROBLEMS — o painel inferior de diagnósticos (como o Problems do VS Code). Barra de
 * ferramentas com o total, filtro por balde de ação (todos / resolvíveis / exigem decisão)
 * e a ação "aplicar N seguras" (o análogo do `--fix`). Cada linha é um diagnóstico denso:
 * severidade, regra, cláusula, mensagem, localização Ln. Clicar seleciona e leva o editor
 * e o inspetor ao caso. Navegável por teclado.
 */
import { useRef } from "react";
import type { Diagnostic, Finding } from "@/lucid";
import { partitionFindings } from "../lib/audit";
import { findingId, metaFor, severityInkVar } from "../lib/criteria";
import { offsetToLineCol } from "../lib/editor-model";

export type Bucket = "all" | "resolvable" | "human";

interface Props {
  diagnostic: Diagnostic;
  findings: readonly Finding[];
  selectedId: string | null;
  bucket: Bucket;
  resolvableCount: number;
  humanCount: number;
  onBucket: (b: Bucket) => void;
  onSelect: (finding: Finding) => void;
  onApplyAllSafe: () => void;
}

export function ProblemsPanel({
  diagnostic,
  findings,
  selectedId,
  bucket,
  resolvableCount,
  humanCount,
  onBucket,
  onSelect,
  onApplyAllSafe,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const { resolvable, human } = partitionFindings(findings);
  const shown = bucket === "resolvable" ? resolvable : bucket === "human" ? human : findings;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-row]") ?? []);
    const i = rows.findIndex((r) => r === document.activeElement);
    const next = e.key === "ArrowDown" ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1);
    rows[next]?.focus();
  };

  return (
    <section aria-label="Problems" className="flex h-[230px] shrink-0 flex-col border-t border-line-2 bg-bg-1">
      {/* toolbar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-line-1 px-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-fg-2">Problems</span>
          <span className="font-mono text-[11px] tabular-nums text-fg-1">{diagnostic.findings.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Filtro" className="flex items-center gap-0.5 rounded-md border border-line-2 p-0.5">
            {([
              ["all", `todos ${findings.length}`],
              ["resolvable", `resolvíveis ${resolvableCount}`],
              ["human", `exigem ${humanCount}`],
            ] as const).map(([b, labelText]) => (
              <button
                key={b}
                role="tab"
                aria-selected={bucket === b}
                onClick={() => onBucket(b)}
                className={`rounded-[4px] px-2 py-0.5 font-mono text-[10.5px] transition-colors duration-[120ms] ${bucket === b ? "bg-bg-3 text-fg-0" : "text-fg-2 hover:text-fg-1"}`}
              >
                {labelText}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onApplyAllSafe}
            disabled={resolvableCount === 0}
            className="flex items-center gap-1.5 rounded-md border border-accent-line bg-accent-weak px-2.5 py-1 font-mono text-[11px] text-accent transition-opacity duration-[120ms] hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <span aria-hidden>⚡</span>
            aplicar {resolvableCount} seguras
          </button>
        </div>
      </div>

      {/* lista */}
      <div ref={listRef} onKeyDown={onKeyDown} className="min-h-0 flex-1 overflow-y-auto py-1">
        {shown.length === 0 ? (
          <p className="px-4 py-6 text-center font-mono text-[11.5px] text-fg-3">
            nenhum diagnóstico neste filtro
          </p>
        ) : (
          shown.map((f) => {
            const id = findingId(f);
            const meta = metaFor(f.criterion);
            const pos = offsetToLineCol(diagnostic.text, f.span.start);
            const selected = selectedId === id;
            return (
              <button
                key={id}
                data-row
                type="button"
                aria-current={selected}
                onClick={() => onSelect(f)}
                className={`kv-row flex w-full items-center gap-3 px-3 py-1.5 text-left ${selected ? "bg-bg-3" : "hover:bg-bg-2"}`}
              >
                <span className="size-1.5 shrink-0 rounded-[1px]" style={{ background: severityInkVar(f.severity) }} aria-hidden />
                <span className="w-[7.5rem] shrink-0 font-mono text-[11px] text-fg-1">{f.criterion}</span>
                <span className="w-9 shrink-0 font-mono text-[10.5px] text-fg-3">{f.principle}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-fg-2">
                  <span className="font-serif text-fg-1">“{f.span.text.replace(/\s+/g, " ").trim()}”</span>
                  <span className="mx-1.5 text-fg-3">—</span>
                  {meta.why}
                </span>
                <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-fg-3">Ln {pos.line}:{pos.col}</span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
