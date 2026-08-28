"use client";

import { useRef, useState } from "react";
import type { Diagnostic, Finding } from "@/lucid";
import { CRITERION_ORDER, findingId, metaFor, provenanceTag, severityInkVar } from "../lib/criteria";
import { distinctTexts, type Bucket, type FindingGroup, type FindingQuery, type SortOrder, type StateFilter } from "../lib/finding-query";
import { reviewStateOf, tally, type ReviewMark, type ReviewMarks } from "../lib/review-marks";
import { useCopy } from "../i18n/use-copy";
import type { UiLang } from "../i18n/types";
import { ActionBadge, CriterionMark, SeverityDot } from "./badges";
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, CloseIcon, EyeIcon, EyeOffIcon } from "./icons";

export type { Bucket } from "../lib/finding-query";

interface Props {
  diagnostic: Diagnostic;
  groups: readonly FindingGroup[];
  visible: readonly Finding[];
  allFindings: readonly Finding[];
  query: FindingQuery;
  marks: ReviewMarks;
  filtered: boolean;
  selectedId: string | null;
  onBucket: (b: Bucket) => void;
  onState: (s: StateFilter) => void;
  onSearch: (s: string) => void;
  onOrder: (o: SortOrder) => void;
  onCriterion: (criterion: string | null) => void;
  onClearFilters: () => void;
  onSelect: (finding: Finding) => void;
  onToggleCriterion: (criterion: string) => void;
  onMark: (finding: Finding, mark: ReviewMark | null) => void;
  onMarkMany: (findings: readonly Finding[], mark: ReviewMark | null) => void;
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

const excerptOf = (f: Finding): string => f.span.text.replace(/\s+/g, " ").trim();

const CONTEXT_WORDS = 6;

function contextAfter(text: string, finding: Finding): string {
  const tail = text.slice(finding.span.end, finding.span.end + 160).replace(/\s+/gu, " ").trim();
  if (tail === "") return "";
  const words = tail.split(" ").slice(0, CONTEXT_WORDS);
  return `${words.join(" ")}${tail.split(" ").length > CONTEXT_WORDS ? "…" : ""}`;
}

const FILTER_THRESHOLD = 10;

export function RevisionList({
  diagnostic,
  groups,
  visible,
  allFindings,
  query,
  marks,
  filtered,
  selectedId,
  onBucket,
  onState,
  onSearch,
  onOrder,
  onCriterion,
  onClearFilters,
  onSelect,
  onToggleCriterion,
  onMark,
  onMarkMany,
}: Props) {
  const { c, lang } = useCopy();
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [moreFilters, setMoreFilters] = useState(false);

  const sifting = allFindings.length >= FILTER_THRESHOLD;

  const hidden = CRITERION_ORDER.filter((id) => countOf(diagnostic, id) > 0 && !query.activeCriteria.has(id));
  const clean = CRITERION_ORDER.filter((id) => countOf(diagnostic, id) === 0);

  const toggleGroup = (criterion: string) =>
    setOpen((prev) => {
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

  const buckets: Array<[Bucket, string]> = [
    ["all", c.revisionList.bucketAll],
    ["safe", c.revisionList.bucketSafe],
    ["human", c.revisionList.bucketHuman],
  ];
  const showStates = sifting && (moreFilters || query.state !== "all");

  const states: Array<[StateFilter, string]> = [
    ["pending", c.revisionList.statePending],
    ["seen", c.revisionList.stateSeen],
    ["dismissed", c.revisionList.stateDismissed],
  ];

  return (
    <div>
      {query.criterion !== null && (
        <div className="mb-2.5 flex items-center gap-2 border-b border-rule-1 px-4 pb-2.5">
          <button
            type="button"
            onClick={() => onCriterion(null)}
            className="row-hit inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] text-accent transition-colors duration-150 hover:bg-accent-weak"
          >
            <ChevronLeftIcon className="size-3.5" />
            {c.note.crumbAll}
          </button>
          <span className="min-w-0 truncate text-[12px] text-ink-2">{metaFor(query.criterion, lang).label}</span>
        </div>
      )}

      {sifting && (
      <div className="px-4 pb-2.5">
        <input
          type="search"
          value={query.search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={c.revisionList.searchPlaceholder}
          aria-label={c.revisionList.searchLabel}
          className="w-full rounded-lg border border-rule-2 bg-sheet px-2.5 py-1.5 text-[12.5px] text-ink-0 placeholder:text-ink-dim focus:border-accent focus:outline-none"
        />
      </div>
      )}

      <div
        role="group"
        aria-label={c.revisionList.filterLabel}
        className="flex flex-wrap items-center gap-1.5 px-4 pb-2.5"
      >
        {buckets.map(([b, labelText]) => (
          <Pill key={b} active={query.bucket === b} onClick={() => onBucket(b)}>
            {labelText}
          </Pill>
        ))}
        {sifting && (
          <button
            type="button"
            aria-expanded={showStates}
            onClick={() => setMoreFilters((v) => !v)}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
          >
            <ChevronDownIcon
              className={`size-3 shrink-0 transition-transform duration-150 ${showStates ? "" : "-rotate-90"}`}
            />
            {showStates ? c.revisionList.fewerFilters : c.revisionList.moreFilters}
          </button>
        )}
        {showStates &&
          states.map(([s, labelText]) => (
            <Pill
              key={s}
              tone="quiet"
              active={query.state === s}
              onClick={() => onState(query.state === s ? "all" : s)}
            >
              {labelText}
            </Pill>
          ))}
      </div>

      {(sifting || filtered) && (
      <div className="flex items-center justify-between gap-3 px-4 pb-3">
        <span className="min-w-0 truncate text-[11.5px] text-ink-3">
          {filtered
            ? c.revisionList.showingFiltered(visible.length, allFindings.length)
            : c.revisionList.showingAll(visible.length)}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {filtered && (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-md px-1.5 py-0.5 text-[11.5px] text-accent transition-colors duration-150 hover:bg-accent-weak"
            >
              {c.revisionList.clearFilters}
            </button>
          )}
          <button
            type="button"
            onClick={() => onOrder(query.order === "severity" ? "document" : "severity")}
            className="rounded-md px-1.5 py-0.5 text-[11.5px] text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
          >
            {query.order === "severity" ? c.revisionList.orderBySeverity : c.revisionList.orderByDocument}
          </button>
        </div>
      </div>
      )}

      {filtered && visible.length > 0 && tally(marks, visible).pending < visible.length && (
        <div className="mx-6 mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-rule-1 bg-surface-2/60 px-2.5 py-2">
          <span className="u-sublabel text-ink-3">{c.revisionList.batchLabel}</span>
          <button
            type="button"
            onClick={() => onMarkMany(visible, null)}
            className="rounded-md border border-rule-2 bg-sheet px-2 py-1 text-[11.5px] text-ink-1 transition-colors duration-150 hover:bg-surface-2"
          >
            {c.revisionList.batchClear(visible.length)}
          </button>
          <p className="w-full text-[11px] leading-relaxed text-ink-3">{c.revisionList.batchCaveat}</p>
        </div>
      )}

      <div ref={listRef} onKeyDown={onKeyDown} className="flex flex-col gap-1 px-3 pb-3">
        {groups.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12.5px] text-ink-3">
            {allFindings.length === 0 ? c.revisionList.empty : c.revisionList.emptyInFilter}
          </p>
        ) : (
          groups.map((group) => (
            <Group
              key={group.criterion}
              group={group}
              diagnostic={diagnostic}
              marks={marks}
              open={open.has(group.criterion) || query.criterion === group.criterion}
              scoped={query.criterion === group.criterion}
              selectedId={selectedId}
              onToggle={() => toggleGroup(group.criterion)}
              onScope={() => onCriterion(query.criterion === group.criterion ? null : group.criterion)}
              onHide={() => onToggleCriterion(group.criterion)}
              onSelect={onSelect}
              onMark={onMark}
              onMarkMany={onMarkMany}
            />
          ))
        )}
      </div>

      {(clean.length > 0 || hidden.length > 0) && (
        <div className="px-3 pb-4">
          <button
            type="button"
            aria-expanded={coverageOpen}
            onClick={() => setCoverageOpen((v) => !v)}
            className="row-hit flex w-full items-center gap-2.5 rounded-lg border-t border-dashed border-rule-2 px-3 pb-2 pt-3.5 text-left text-ink-3 hover:text-ink-2"
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

      <p className="px-4 pb-5 text-[11.5px] leading-relaxed text-ink-3">{c.revisionList.lexiconCaveat}</p>
    </div>
  );
}

function Group({
  group,
  diagnostic,
  marks,
  open,
  scoped,
  selectedId,
  onToggle,
  onScope,
  onHide,
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
  onHide: () => void;
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

  return (
    <div className="flex flex-col">
      <div className="row-hit flex w-full items-center rounded-lg hover:bg-surface-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left"
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
          aria-label={c.revisionList.hideNamed(meta.label)}
          title={c.revisionList.hideInDocument}
          onClick={onHide}
          className="mr-1.5 grid size-7 shrink-0 place-items-center rounded-md text-ink-dim transition-colors duration-150 hover:bg-surface-3 hover:text-ink-1"
        >
          <EyeIcon className="size-3.5" />
        </button>
      </div>

      {open && (
        <div id={panelId} className="flex flex-col gap-0.5 pl-2">
          <div className="flex items-start justify-between gap-2 px-3 pb-1 pt-0.5">
            <p className="min-w-0 flex-1 text-[11.5px] leading-snug text-ink-3">{meta.why}</p>
            <ProvenanceTag tag={tagFor(diagnostic, group.criterion, lang)} />
          </div>
          <div className="flex flex-wrap items-center gap-2 px-3 pb-1.5">
            <button
              type="button"
              aria-pressed={scoped}
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
          {group.items.map((f, index) => (
            <Row
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

function Row({
  finding,
  ordinal,
  context,
  state,
  selected,
  onSelect,
  onMark,
}: {
  finding: Finding;
  ordinal: number;
  context: string;
  state: "pending" | ReviewMark;
  selected: boolean;
  onSelect: () => void;
  onMark: (mark: ReviewMark | null) => void;
}) {
  const { c } = useCopy();
  const excerpt = excerptOf(finding);
  const marked = state !== "pending";
  return (
    <div
      className={`row-hit flex w-full items-center rounded-lg ${
        selected ? "bg-accent-weak shadow-[inset_0_0_0_1px_var(--accent-line)]" : "hover:bg-surface-2"
      }`}
    >
      <button
        data-row
        type="button"
        aria-current={selected}
        onClick={onSelect}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left ${marked ? "opacity-55" : ""}`}
      >
        <span className="w-6 shrink-0 text-right tabular-nums text-[11px] text-ink-dim">{ordinal}</span>
        <SeverityDot severity={finding.severity} />
        <span
          className={`min-w-0 flex-1 truncate font-serif text-[13.5px] text-ink-1 ${
            state === "dismissed" ? "line-through decoration-ink-3" : ""
          }`}
        >
          “{excerpt}”
          {context !== "" && <span className="font-sans text-[11.5px] text-ink-3"> {context}</span>}
        </span>
        <ActionBadge finding={finding} />
      </button>
      <MarkButton
        pressed={state === "seen"}
        label={c.revisionList.markSeenNamed(`${ordinal}. ${excerpt}`)}
        title={state === "seen" ? c.revisionList.unmarkHint : c.revisionList.markSeenHint}
        onClick={() => onMark(state === "seen" ? null : "seen")}
      >
        <CheckIcon className="size-4" />
      </MarkButton>
      <MarkButton
        pressed={state === "dismissed"}
        label={c.revisionList.dismissNamed(`${ordinal}. ${excerpt}`)}
        title={state === "dismissed" ? c.revisionList.unmarkHint : c.revisionList.dismissHint}
        onClick={() => onMark(state === "dismissed" ? null : "dismissed")}
        className="mr-1.5"
      >
        <CloseIcon className="size-4" />
      </MarkButton>
    </div>
  );
}

function MarkButton({
  pressed,
  label,
  title,
  onClick,
  className = "",
  children,
}: {
  pressed: boolean;
  label: string;
  title: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={title}
      onClick={onClick}
      className={`grid size-8 shrink-0 place-items-center rounded-md transition-colors duration-150 ${
        pressed ? "bg-surface-3 text-ink-0" : "text-ink-2 hover:bg-surface-3 hover:text-ink-0"
      } ${className}`}
    >
      {children}
    </button>
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

function Pill({
  active,
  onClick,
  tone = "strong",
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: "strong" | "quiet";
  children: React.ReactNode;
}) {
  const activeClass =
    tone === "strong" ? "border-transparent bg-ink-0 text-sheet" : "border-accent-line bg-accent-weak text-accent";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 ${
        active ? activeClass : "border-rule-2 text-ink-2 hover:bg-surface-2 hover:text-ink-1"
      }`}
    >
      {children}
    </button>
  );
}
