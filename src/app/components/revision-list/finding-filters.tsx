"use client";

import { useState } from "react";
import { metaFor } from "../../lib/criteria";
import type { Bucket, FindingQuery, SortOrder, StateFilter } from "../../lib/finding-query";
import { useCopy } from "../../i18n/use-copy";
import { ChevronDownIcon, ChevronLeftIcon } from "../icons";

export interface QueryActions {
  bucket: (bucket: Bucket) => void;
  state: (state: StateFilter) => void;
  search: (search: string) => void;
  order: (order: SortOrder) => void;
  criterion: (criterion: string | null) => void;
  clear: () => void;
}

interface Props {
  query: FindingQuery;
  sifting: boolean;
  filtered: boolean;
  visibleCount: number;
  totalCount: number;
  hiddenCount: number;
  onQuery: QueryActions;
}

export function FindingFilters({
  query,
  sifting,
  filtered,
  visibleCount,
  totalCount,
  hiddenCount,
  onQuery,
}: Props) {
  const { c, lang } = useCopy();
  const [moreFilters, setMoreFilters] = useState(false);

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
    <>

      {query.criterion !== null && (
        <div className="mb-2.5 flex items-center gap-2 border-b border-rule-1 px-4 pb-2.5">
          <button
            type="button"
            onClick={() => onQuery.criterion(null)}
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
          onChange={(e) => onQuery.search(e.target.value)}
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
          <Pill key={b} active={query.bucket === b} onClick={() => onQuery.bucket(b)}>
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
              onClick={() => onQuery.state(query.state === s ? "all" : s)}
            >
              {labelText}
            </Pill>
          ))}
      </div>

      {(sifting || filtered) && (
      <div className="flex items-center justify-between gap-3 px-4 pb-3">
        <span className="min-w-0 truncate text-[11.5px] text-ink-3">
          {filtered
            ? c.revisionList.showingFiltered(visibleCount, totalCount)
            : c.revisionList.showingAll(visibleCount)}
          {hiddenCount > 0 && ` · ${c.revisionList.hiddenCriteria(hiddenCount)}`}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {filtered && (
            <button
              type="button"
              onClick={onQuery.clear}
              className="rounded-md px-1.5 py-0.5 text-[11.5px] text-accent transition-colors duration-150 hover:bg-accent-weak"
            >
              {c.revisionList.clearFilters}
            </button>
          )}
          <button
            type="button"
            onClick={() => onQuery.order(query.order === "severity" ? "document" : "severity")}
            className="rounded-md px-1.5 py-0.5 text-[11.5px] text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
          >
            {query.order === "severity" ? c.revisionList.orderBySeverity : c.revisionList.orderByDocument}
          </button>
        </div>
      </div>
      )}
    </>
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
