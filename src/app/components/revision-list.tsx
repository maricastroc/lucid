"use client";

/**
 * A LISTA DE REVISÕES — o índice editorial das anotações. Não é um "Problems Panel": cada
 * item é uma nota curta (critério em nome humano, o trecho entre aspas, uma explicação de
 * uma linha e o selo de ação). Filtra por balde de ação (todas / seguras / decisão
 * humana), navega por teclado e sincroniza com o texto e com a nota aberta.
 */
import { useRef } from "react";
import type { Finding } from "@/lucid";
import { findingId, isSafe, metaFor } from "../lib/criteria";
import { ActionBadge, SeverityDot } from "./badges";

export type Bucket = "all" | "safe" | "human";

interface Props {
  findings: readonly Finding[];
  selectedId: string | null;
  bucket: Bucket;
  safeCount: number;
  humanCount: number;
  onBucket: (b: Bucket) => void;
  onSelect: (finding: Finding) => void;
}

export function RevisionList({ findings, selectedId, bucket, safeCount, humanCount, onBucket, onSelect }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const shown =
    bucket === "safe" ? findings.filter(isSafe) : bucket === "human" ? findings.filter((f) => !isSafe(f)) : findings;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-row]") ?? []);
    const i = rows.findIndex((r) => r === document.activeElement);
    const next = e.key === "ArrowDown" ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1);
    rows[next]?.focus();
  };

  const buckets: Array<[Bucket, string, number]> = [
    ["all", "Todas", findings.length],
    ["safe", "Seguras", safeCount],
    ["human", "Decisão sua", humanCount],
  ];

  return (
    <section aria-label="Revisões" className="border-t border-rule-1">
      <div className="flex items-center justify-between gap-2 px-6 pb-3 pt-5">
        <h2 className="u-label text-ink-3">Revisões</h2>
      </div>

      <div role="tablist" aria-label="Filtrar revisões" className="flex items-center gap-1.5 px-6 pb-3">
        {buckets.map(([b, labelText, n]) => (
          <button
            key={b}
            role="tab"
            aria-selected={bucket === b}
            onClick={() => onBucket(b)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors duration-150 ${
              bucket === b
                ? "border-transparent bg-ink-0 text-sheet"
                : "border-rule-2 text-ink-2 hover:bg-surface-2 hover:text-ink-1"
            }`}
          >
            {labelText}
            <span className={`tabular-nums ${bucket === b ? "opacity-70" : "text-ink-3"}`}>{n}</span>
          </button>
        ))}
      </div>

      <div ref={listRef} onKeyDown={onKeyDown} className="flex flex-col gap-3 px-3 pb-4">
        {shown.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12.5px] text-ink-3">Nenhuma anotação neste filtro.</p>
        ) : (
          shown.map((f) => {
            const id = findingId(f);
            const meta = metaFor(f.criterion);
            const selected = selectedId === id;
            return (
              <button
                key={id}
                data-row
                type="button"
                aria-current={selected}
                onClick={() => onSelect(f)}
                className={`row-hit flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left ${
                  selected ? "bg-accent-weak shadow-[inset_0_0_0_1px_var(--accent-line)]" : "hover:bg-surface-2"
                }`}
              >
                <div className="flex items-center gap-2">
                  <SeverityDot severity={f.severity} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-0">{meta.label}</span>
                  <ActionBadge finding={f} />
                </div>
                <p className="font-serif text-[14px] leading-snug text-ink-1">
                  “{f.span.text.replace(/\s+/g, " ").trim()}”
                </p>
                <p className="truncate text-[12px] text-ink-2">{meta.why}</p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
