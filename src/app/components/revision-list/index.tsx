"use client";

import { useState } from "react";
import type { Diagnostic, Finding } from "@/lucid";
import {
  cleanCriteria,
  hiddenHighlightCount,
  type Bucket,
  type FindingGroup,
  type FindingQuery,
  type SortOrder,
  type StateFilter,
} from "../../lib/finding-query";
import type { ReviewMark, ReviewMarks } from "../../lib/review-marks";
import { tally } from "../../lib/review-marks";
import { startHerePlan } from "../../lib/start-here";
import { useCopy } from "../../i18n/use-copy";
import { CleanCriteriaDisclosure } from "./clean-criteria-disclosure";
import { CriterionGroup } from "./criterion-group";
import { FindingFilters } from "./finding-filters";
import { StartHerePlan } from "./start-here-plan";
import { useListRovingFocus } from "./use-list-roving-focus";

export type { Bucket } from "../../lib/finding-query";

const FILTER_THRESHOLD = 10;

interface Props {
  diagnostic: Diagnostic;
  groups: readonly FindingGroup[];
  visible: readonly Finding[];
  allFindings: readonly Finding[];
  originalFindings: readonly Finding[] | null;
  query: FindingQuery;
  marks: ReviewMarks;
  filtered: boolean;
  selectedId: string | null;
  onBucket: (b: Bucket) => void;
  onState: (s: StateFilter) => void;
  onSearch: (s: string) => void;
  onOrder: (o: SortOrder) => void;
  onCriterion: (criterion: string | null) => void;
  onStartStep: (criterion: string) => void;
  guided: boolean;
  onClearFilters: () => void;
  onSelect: (finding: Finding) => void;
  hiddenHighlights: ReadonlySet<string>;
  onToggleHighlights: (criterion: string) => void;
  onMark: (finding: Finding, mark: ReviewMark | null) => void;
  onMarkMany: (findings: readonly Finding[], mark: ReviewMark | null) => void;
}

export function RevisionList({
  diagnostic,
  groups,
  visible,
  allFindings,
  originalFindings,
  query,
  marks,
  filtered,
  selectedId,
  onBucket,
  onState,
  onSearch,
  onOrder,
  onCriterion,
  onStartStep,
  guided,
  onClearFilters,
  onSelect,
  hiddenHighlights,
  onToggleHighlights,
  onMark,
  onMarkMany,
}: Props) {
  const { c } = useCopy();
  const { ref: listRef, onKeyDown } = useListRovingFocus();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  const sifting = allFindings.length >= FILTER_THRESHOLD;
  const plan = startHerePlan(allFindings, marks, filtered, originalFindings);
  const hiddenCount = hiddenHighlightCount(groups, hiddenHighlights);

  const clean = cleanCriteria(diagnostic);

  const toggleGroup = (criterion: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(criterion)) next.delete(criterion);
      else next.add(criterion);
      return next;
    });

  return (
    <div>
      <StartHerePlan plan={guided ? null : plan} onBucket={onBucket} onStart={onStartStep} />
      {!guided && plan !== null && (
        <div className="mx-4 mb-2.5 border-t border-rule-1 pt-3">
          <h4 className="u-label text-ink-2">{c.revisionList.indexLabel}</h4>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{c.revisionList.indexHint}</p>
        </div>
      )}
      {!guided && (
        <FindingFilters
          query={query}
          sifting={sifting}
          filtered={filtered}
          visibleCount={visible.length}
          totalCount={allFindings.length}
          hiddenCount={hiddenCount}
          onQuery={{
            bucket: onBucket,
            state: onState,
            search: onSearch,
            order: onOrder,
            criterion: onCriterion,
            clear: onClearFilters,
          }}
        />
      )}

      {!guided && filtered && visible.length > 0 && tally(marks, visible).pending < visible.length && (
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
            <CriterionGroup
              key={group.criterion}
              group={group}
              diagnostic={diagnostic}
              marks={marks}
              guided={guided}
              open={guided || open.has(group.criterion) || query.criterion === group.criterion}
              scoped={query.criterion === group.criterion}
              selectedId={selectedId}
              onToggle={() => toggleGroup(group.criterion)}
              onScope={() => onCriterion(query.criterion === group.criterion ? null : group.criterion)}
              highlightsHidden={hiddenHighlights.has(group.criterion)}
              onToggleHighlights={() => onToggleHighlights(group.criterion)}
              onSelect={onSelect}
              onMark={onMark}
              onMarkMany={onMarkMany}
            />
          ))
        )}
      </div>

      {!guided && <CleanCriteriaDisclosure criteria={clean} />}

      <p className="px-4 pb-5 text-[11.5px] leading-relaxed text-ink-3">{c.revisionList.lexiconCaveat}</p>
    </div>
  );
}
