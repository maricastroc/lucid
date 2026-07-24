"use client";

import { useRef, useState } from "react";
import type { Finding } from "@/lucid";
import { findingId, isSafe, metaFor } from "../lib/criteria";
import { ActionBadge, CriterionMark, SeverityDot } from "./badges";
import { ChevronDownIcon } from "./icons";

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

interface Group {
  criterion: string;
  items: Finding[];
}

function groupByCriterion(findings: readonly Finding[]): Group[] {
  const groups: Group[] = [];
  for (const f of findings) {
    const last = groups[groups.length - 1];
    if (last && last.criterion === f.criterion) last.items.push(f);
    else groups.push({ criterion: f.criterion, items: [f] });
  }
  return groups;
}

export function RevisionList({ findings, selectedId, bucket, safeCount, humanCount, onBucket, onSelect }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const shown =
    bucket === "safe" ? findings.filter(isSafe) : bucket === "human" ? findings.filter((f) => !isSafe(f)) : findings;
  const groups = groupByCriterion(shown);

  const toggle = (criterion: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(criterion)) next.delete(criterion);
      else next.add(criterion);
      return next;
    });

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
    ["safe", "Troca direta", safeCount],
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

      <div ref={listRef} onKeyDown={onKeyDown} className="flex flex-col gap-1.5 px-3 pb-4">
        {groups.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12.5px] text-ink-3">Nenhuma anotação neste filtro.</p>
        ) : (
          groups.map((g) => {
            const meta = metaFor(g.criterion);
            const isCollapsed = collapsed.has(g.criterion);
            const panelId = `revgrp-${g.criterion}`;
            return (
              <div key={g.criterion} className="flex flex-col">
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  aria-controls={panelId}
                  onClick={() => toggle(g.criterion)}
                  className="row-hit flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-surface-2"
                >
                  <ChevronDownIcon
                    className={`size-3.5 shrink-0 text-ink-3 transition-transform duration-150 ${
                      isCollapsed ? "-rotate-90" : ""
                    }`}
                  />
                  <CriterionMark criterion={g.criterion} />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink-0">{meta.label}</span>
                  <span className="tabular-nums text-[12px] text-ink-3">{g.items.length}</span>
                </button>

                {!isCollapsed && (
                  <div id={panelId} className="flex flex-col gap-0.5 pl-2">
                    <p className="px-3 pb-1 pt-0.5 text-[11.5px] leading-snug text-ink-3">{meta.why}</p>
                    {g.items.map((f) => {
                      const id = findingId(f);
                      const selected = selectedId === id;
                      return (
                        <button
                          key={id}
                          data-row
                          type="button"
                          aria-current={selected}
                          onClick={() => onSelect(f)}
                          className={`row-hit flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left ${
                            selected
                              ? "bg-accent-weak shadow-[inset_0_0_0_1px_var(--accent-line)]"
                              : "hover:bg-surface-2"
                          }`}
                        >
                          <SeverityDot severity={f.severity} />
                          <span className="min-w-0 flex-1 truncate font-serif text-[13.5px] text-ink-1">
                            “{f.span.text.replace(/\s+/g, " ").trim()}”
                          </span>
                          <ActionBadge finding={f} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
