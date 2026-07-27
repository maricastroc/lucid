"use client";

import { useRef, useState } from "react";
import type { Diagnostic, Finding } from "@/lucid";
import { CRITERION_ORDER, findingId, isSafe, metaFor, provenanceTag } from "../lib/criteria";
import { useCopy } from "../i18n/use-copy";
import type { UiLang } from "../i18n/types";
import { ActionBadge, CriterionMark, SeverityDot } from "./badges";
import { ChevronDownIcon, EyeIcon, EyeOffIcon } from "./icons";

export type Bucket = "all" | "safe" | "human";

interface Props {
  diagnostic: Diagnostic;
  findings: readonly Finding[];
  selectedId: string | null;
  bucket: Bucket;
  safeCount: number;
  humanCount: number;
  activeCriteria: ReadonlySet<string>;
  onBucket: (b: Bucket) => void;
  onSelect: (finding: Finding) => void;
  onToggleCriterion: (criterion: string) => void;
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

function countOf(diagnostic: Diagnostic, criterion: string): number {
  const s = diagnostic.score.byCriterion.find((c) => c.criterion === criterion);
  return s ? s.count.info + s.count.warning + s.count.error : 0;
}

function tagFor(diagnostic: Diagnostic, criterion: string, lang: UiLang) {
  const f = diagnostic.findings.find((x) => x.criterion === criterion);
  return f ? provenanceTag(f, lang) : null;
}

function ProvenanceTag({ tag }: { tag: { text: string; title: string } | null }) {
  if (!tag) return null;
  return (
    <span
      title={tag.title}
      className="shrink-0 rounded-[3px] bg-surface-3 px-1.5 py-px text-[10px] tabular-nums tracking-wide text-ink-3"
    >
      {tag.text}
    </span>
  );
}

export function RevisionList({
  diagnostic,
  findings,
  selectedId,
  bucket,
  safeCount,
  humanCount,
  activeCriteria,
  onBucket,
  onSelect,
  onToggleCriterion,
}: Props) {
  const { c, lang } = useCopy();
  const listRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [coverageOpen, setCoverageOpen] = useState(false);

  const shown =
    bucket === "safe" ? findings.filter(isSafe) : bucket === "human" ? findings.filter((f) => !isSafe(f)) : findings;
  const groups = groupByCriterion(shown);

  const hidden = CRITERION_ORDER.filter((c) => countOf(diagnostic, c) > 0 && !activeCriteria.has(c));
  const clean = CRITERION_ORDER.filter((c) => countOf(diagnostic, c) === 0);

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
    ["all", c.revisionList.bucketAll, findings.length],
    ["safe", c.revisionList.bucketSafe, safeCount],
    ["human", c.revisionList.bucketHuman, humanCount],
  ];

  return (
    <section aria-label={c.revisionList.regionLabel} className="border-t border-rule-1">
      <div className="flex items-center justify-between gap-2 px-6 pb-3 pt-5">
        <h2 className="u-label text-ink-3">{c.revisionList.title}</h2>
        {groups.length > 0 && <span className="text-[10.5px] text-ink-3">{c.revisionList.bySeverity}</span>}
      </div>

      <div role="tablist" aria-label={c.revisionList.filterLabel} className="flex items-center gap-1.5 px-6 pb-3">
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

      <div ref={listRef} onKeyDown={onKeyDown} className="flex flex-col gap-1.5 px-3 pb-3">
        {groups.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12.5px] text-ink-3">
            {findings.length === 0 ? c.revisionList.empty : c.revisionList.emptyInFilter}
          </p>
        ) : (
          groups.map((g) => {
            const meta = metaFor(g.criterion, lang);
            const isCollapsed = collapsed.has(g.criterion);
            const panelId = `revgrp-${g.criterion}`;
            return (
              <div key={g.criterion} className="flex flex-col">
                <div className="row-hit flex w-full items-center rounded-lg hover:bg-surface-2">
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    aria-controls={panelId}
                    onClick={() => toggle(g.criterion)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-left"
                  >
                    <ChevronDownIcon
                      className={`size-3.5 shrink-0 text-ink-3 transition-transform duration-150 ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                    <CriterionMark criterion={g.criterion} />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink-0">{meta.label}</span>
                    <ProvenanceTag tag={tagFor(diagnostic, g.criterion, lang)} />
                    <span className="tabular-nums text-[13px] text-ink-1">{g.items.length}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={c.revisionList.hideNamed(meta.label)}
                    title={c.revisionList.hideInDocument}
                    onClick={() => onToggleCriterion(g.criterion)}
                    className="mr-1.5 grid size-7 shrink-0 place-items-center rounded-md text-ink-dim transition-colors duration-150 hover:bg-surface-3 hover:text-ink-1"
                  >
                    <EyeIcon className="size-3.5" />
                  </button>
                </div>

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

      {(clean.length > 0 || hidden.length > 0) && (
        <div className="px-3 pb-4">
          <button
            type="button"
            aria-expanded={coverageOpen}
            onClick={() => setCoverageOpen((v) => !v)}
            className="row-hit flex w-full items-center gap-2.5 rounded-lg border-t border-dashed border-rule-2 px-3 pt-3.5 pb-2 text-left text-ink-3 hover:text-ink-2"
          >
            <ChevronDownIcon
              className={`size-3.5 shrink-0 transition-transform duration-150 ${coverageOpen ? "" : "-rotate-90"}`}
            />
            <span className="min-w-0 flex-1 text-[12px]">
              {c.revisionList.cleanCriteria(clean.length)}
              {hidden.length > 0 && ` · ${c.revisionList.hiddenCriteria(hidden.length)}`}
            </span>
            <span className="u-sublabel">{c.revisionList.coverage}</span>
          </button>

          {coverageOpen && (
            <div className="mt-1 flex flex-col gap-0.5">
              {hidden.map((criterion) => {
                const meta = metaFor(criterion, lang);
                return (
                  <div key={criterion} className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 opacity-60">
                    <CriterionMark criterion={criterion} />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-1">{meta.label}</span>
                    <ProvenanceTag tag={tagFor(diagnostic, criterion, lang)} />
                    <span className="tabular-nums text-[12px] text-ink-3">{countOf(diagnostic, criterion)}</span>
                    <button
                      type="button"
                      aria-label={c.revisionList.showNamed(meta.label)}
                      title={c.revisionList.showInDocument}
                      onClick={() => onToggleCriterion(criterion)}
                      className="grid size-6 shrink-0 place-items-center rounded-md text-ink-3 transition-colors duration-150 hover:bg-surface-3 hover:text-ink-1"
                    >
                      <EyeOffIcon className="size-3.5" />
                    </button>
                  </div>
                );
              })}
              {clean.map((criterion) => {
                const meta = metaFor(criterion, lang);
                return (
                  <div key={criterion} className="flex items-center gap-2.5 px-3 py-1.5">
                    <CriterionMark criterion={criterion} className="opacity-45" />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-3">{meta.label}</span>
                    <span className="tabular-nums text-[12px] text-ink-dim">0</span>
                  </div>
                );
              })}
              <p className="px-3 pt-1.5 text-[11px] italic leading-relaxed text-ink-3">
                {c.revisionList.absenceCaveat}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
