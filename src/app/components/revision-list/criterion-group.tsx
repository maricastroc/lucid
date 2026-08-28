"use client";

import type { Diagnostic, Finding } from "@/lucid";
import { metaFor, provenanceTag, severityInkVar } from "../../lib/criteria";
import { distinctTexts, type FindingGroup } from "../../lib/finding-query";
import { findingId } from "../../lib/criteria";
import { reviewStateOf, tally, type ReviewMark, type ReviewMarks } from "../../lib/review-marks";
import { useCopy } from "../../i18n/use-copy";
import type { UiLang } from "../../i18n/types";
import { CriterionMark, HumanScopeNote } from "../badges";
import { ChevronDownIcon, EyeIcon, EyeOffIcon } from "../icons";
import { contextAfter, excerptOf } from "./occurrence-excerpt";
import { OccurrenceRow } from "./occurrence-row";

export function CriterionGroup({
  group,
  diagnostic,
  marks,
  open,
  scoped,
  selectedId,
  onToggle,
  onScope,
  highlightsHidden,
  onToggleHighlights,
  onSelect,
  onMark,
  onMarkMany,
}: {
  group: FindingGroup;
  diagnostic: Diagnostic;
  marks: ReviewMarks;
  open: boolean;
  scoped: boolean;
  selectedId: string | null;
  onToggle: () => void;
  onScope: () => void;
  highlightsHidden: boolean;
  onToggleHighlights: () => void;
  onSelect: (finding: Finding) => void;
  onMark: (finding: Finding, mark: ReviewMark | null) => void;
  onMarkMany: (findings: readonly Finding[], mark: ReviewMark | null) => void;
}) {
  const { c, lang } = useCopy();
  const meta = metaFor(group.criterion, lang);
  const counts = tally(marks, group.items);

  const repeated = new Set(
    group.items
      .map(excerptOf)
      .filter((text, index, all) => all.indexOf(text) !== index),
  );
  const distinct = distinctTexts(group.items);
  const panelId = `revgrp-${group.criterion}`;
  const allOfCriterion = diagnostic.findings.filter((f) => f.criterion === group.criterion);

  return (
    <div className="flex flex-col">
      <div className="row-hit flex w-full items-center rounded-lg hover:bg-surface-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-opacity duration-150 ${
            highlightsHidden ? "opacity-55" : ""
          }`}
        >
          <ChevronDownIcon
            className={`size-3.5 shrink-0 text-ink-3 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
          />
          <CriterionMark criterion={group.criterion} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="min-w-0 truncate text-[13.5px] font-medium text-ink-0">{meta.label}</span>
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: severityInkVar(group.maxSeverity) }}
                aria-hidden
              />
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-ink-3">
              <span className="tabular-nums">{c.revisionList.occurrences(group.items.length)}</span>
              {highlightsHidden && (
                <>
                  <span aria-hidden>·</span>
                  <span>{c.revisionList.highlightsOff}</span>
                </>
              )}
              {distinct < group.items.length && (
                <>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">{c.revisionList.distinct(distinct)}</span>
                </>
              )}
              {group.filteredOut > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">{c.revisionList.hiddenByFilter(group.filteredOut)}</span>
                </>
              )}
            </span>
          </span>
          <GroupProgress pending={counts.pending} total={counts.total} />
        </button>
        <button
          type="button"
          aria-pressed={highlightsHidden}
          aria-label={highlightsHidden ? c.revisionList.showNamed(meta.label) : c.revisionList.hideNamed(meta.label)}
          title={highlightsHidden ? c.revisionList.showInDocument : c.revisionList.hideInDocument}
          onClick={onToggleHighlights}
          className={`mr-1.5 grid size-7 shrink-0 place-items-center rounded-md transition-colors duration-150 hover:bg-surface-3 hover:text-ink-1 ${
            highlightsHidden ? "text-ink-2" : "text-ink-dim"
          }`}
        >
          {highlightsHidden ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
        </button>
      </div>

      {open && (
        <div id={panelId} className="flex flex-col gap-0.5 pl-2">
          <div className="px-3 pb-2 pt-0.5">
            <p className="text-[11.5px] leading-snug text-ink-3">{meta.why}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <ProvenanceTag tag={tagFor(diagnostic, group.criterion, lang)} />
              <HumanScopeNote items={allOfCriterion} />
              <span className="flex-1" />
              <button
                type="button"
                aria-pressed={scoped}
                title={c.revisionList.scopeHint(allOfCriterion.length)}
                onClick={onScope}
                className={`rounded-md border px-2 py-1 text-[11.5px] transition-colors duration-150 ${
                  scoped
                    ? "border-accent-line bg-accent-weak text-accent"
                    : "border-rule-2 text-ink-2 hover:bg-surface-2 hover:text-ink-0"
                }`}
              >
                {scoped ? c.revisionList.scopeOff : c.revisionList.scopeOn}
              </button>
              {counts.total - counts.pending > 0 && (
                <button
                  type="button"
                  onClick={() => onMarkMany(group.items, null)}
                  className="rounded-md border border-rule-2 px-2 py-1 text-[11.5px] text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
                >
                  {c.revisionList.clearGroupMarks(counts.total - counts.pending)}
                </button>
              )}
            </div>
          </div>
          {group.items.map((f, index) => (
            <OccurrenceRow
              key={findingId(f)}
              finding={f}
              ordinal={index + 1}
              context={repeated.has(excerptOf(f)) ? contextAfter(diagnostic.text, f) : ""}
              state={reviewStateOf(marks, f)}
              selected={selectedId === findingId(f)}
              onSelect={() => onSelect(f)}
              onMark={(mark) => onMark(f, mark)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupProgress({ pending, total }: { pending: number; total: number }) {
  const { c } = useCopy();
  const done = total - pending;
  if (done === 0) return <span className="shrink-0 tabular-nums text-[13px] text-ink-1">{total}</span>;
  return (
    <span className="shrink-0 tabular-nums text-[12px] text-ink-2" title={c.revisionList.progressTitle(done, total)}>
      {done}
      <span className="text-ink-3">/{total}</span>
    </span>
  );
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
