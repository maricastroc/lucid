"use client";

import type { Diagnostic, Finding } from "@/lucid";
import { metaFor } from "../../lib/criteria";
import type { Bucket, FindingGroup, FindingQuery, SortOrder, StateFilter } from "../../lib/finding-query";
import type { ReviewRoute } from "../../lib/review-route";
import type { ReviewMarkKind, ReviewMarks } from "../../lib/review-marks";
import type { ReviewMode } from "../../hooks/use-audit-view";
import { useCopy } from "../../i18n/use-copy";
import { CheckIcon, ChevronLeftIcon } from "../icons";
import { CriterionGroup } from "../revision-list/criterion-group";
import { PointBrowser } from "../revision-list/point-browser";
import { RouteHeader } from "../route/route-header";
import { StepList } from "../route/step-list";

interface Props {
  diagnostic: Diagnostic;
  route: ReviewRoute;
  groups: readonly FindingGroup[];
  visible: readonly Finding[];
  allFindings: readonly Finding[];
  query: FindingQuery;
  marks: ReviewMarks;
  filtered: boolean;
  selectedId: string | null;
  mode: ReviewMode;
  onMode: (mode: ReviewMode) => void;
  onBucket: (b: Bucket) => void;
  onState: (s: StateFilter) => void;
  onSearch: (s: string) => void;
  onOrder: (o: SortOrder) => void;
  onCriterion: (criterion: string | null) => void;
  onClearFilters: () => void;
  onSelect: (finding: Finding) => void;
  hiddenHighlights: ReadonlySet<string>;
  onToggleHighlights: (criterion: string) => void;
  onMark: (finding: Finding, mark: ReviewMarkKind | null) => void;
  onMarkMany: (findings: readonly Finding[], mark: ReviewMarkKind | null) => void;
  onOpenStep: (criterion: string) => void;
  onLeaveRoute: () => void;
  onOpenFirstPending: () => void;
  onSeeSwaps: () => void;
}

export function ReviewView(props: Props) {
  const { c, lang } = useCopy();
  const { route, mode } = props;
  const open = route.open;

  if (route.found === 0) {
    return (
      <div className="fade-in px-4 py-4">
        <div className="rounded-xl border border-dashed border-rule-2 px-4 py-6 text-center">
          <span className="mx-auto grid size-9 place-items-center rounded-full bg-safe-weak text-safe">
            <CheckIcon className="size-4.5" />
          </span>
          <p className="mt-3 text-[13.5px] font-medium text-ink-1">{c.revisionList.empty}</p>
          <p className="mx-auto mt-1.5 max-w-xs text-[12px] leading-relaxed text-ink-2">
            {c.revisionList.absenceCaveat}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <ModeTabs
        mode={mode}
        onMode={props.onMode}
        routeCaption={route.steps.length === 0 ? "" : c.counts.stepsDone(route.stepsDone, route.steps.length)}
        browseCaption={c.counts.noun.found(route.found)}
        browseCount={route.found}
      />

      {mode === "route" ? (
        open === null ? (
          <StepList route={route} onOpenStep={props.onOpenStep} onSeeSwaps={props.onSeeSwaps} />
        ) : (
          <>
            <RouteHeader
              route={route}
              onGo={props.onOpenStep}
              onLeave={props.onLeaveRoute}
              onOpen={props.onOpenFirstPending}
            />
            <StepOccurrences {...props} />
          </>
        )
      ) : (
        <>
          {open !== null && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule-1 bg-surface-2/60 px-4 py-2">
              <p className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-ink-2">{c.route.browseLead}</p>
              <button
                type="button"
                onClick={() => props.onMode("route")}
                className="focus-inset inline-flex shrink-0 items-center gap-1 rounded-md text-[11.5px] font-medium text-accent transition-colors duration-150 hover:underline"
              >
                <ChevronLeftIcon className="size-3.5" />
                {c.route.browseReturn(open.index + 1, metaFor(open.step.criterion, lang).label)}
              </button>
            </div>
          )}
          <PointBrowser
            diagnostic={props.diagnostic}
            groups={props.groups}
            visible={props.visible}
            allFindings={props.allFindings}
            query={props.query}
            marks={props.marks}
            filtered={props.filtered}
            selectedId={props.selectedId}
            onBucket={props.onBucket}
            onState={props.onState}
            onSearch={props.onSearch}
            onOrder={props.onOrder}
            onCriterion={props.onCriterion}
            onClearFilters={props.onClearFilters}
            onSelect={props.onSelect}
            hiddenHighlights={props.hiddenHighlights}
            onToggleHighlights={props.onToggleHighlights}
            onMark={props.onMark}
            onMarkMany={props.onMarkMany}
          />
        </>
      )}
    </div>
  );
}

function ModeTabs({
  mode,
  onMode,
  routeCaption,
  browseCaption,
  browseCount,
}: {
  mode: ReviewMode;
  onMode: (mode: ReviewMode) => void;
  routeCaption: string;
  browseCaption: string;
  browseCount: number;
}) {
  const { c } = useCopy();
  const options: Array<{ id: ReviewMode; label: string; caption: string }> = [
    { id: "route", label: c.route.tabRoute, caption: routeCaption },
    { id: "browse", label: c.route.tabBrowse, caption: `${browseCount} ${browseCaption}` },
  ];

  return (
    <div role="radiogroup" aria-label={c.route.tabsLabel} className="flex gap-1.5 border-b border-rule-1 px-4 py-2.5">
      {options.map((option) => {
        const active = option.id === mode;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.caption === "" ? option.label : `${option.label} · ${option.caption}`}
            onClick={() => onMode(option.id)}
            className={`min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-left transition-colors duration-150 ${
              active ? "border-accent-line bg-accent-weak" : "border-rule-2 hover:border-rule-3 hover:bg-surface-2"
            }`}
          >
            <span
              className={`block truncate text-[12.5px] ${active ? "font-semibold text-ink-0" : "font-medium text-ink-2"}`}
            >
              {option.label}
            </span>
            {option.caption !== "" && (
              <span className="mt-0.5 block truncate text-[10.5px] tabular-nums text-ink-3">{option.caption}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function StepOccurrences(props: Props) {
  const { c } = useCopy();
  const open = props.route.open;
  if (open === null) return null;

  const items = props.allFindings.filter((finding) => finding.criterion === open.step.criterion);
  const group: FindingGroup = {
    criterion: open.step.criterion,
    items,
    filteredOut: 0,
    maxSeverity: items.reduce<Finding["severity"]>(
      (worst, f) => (f.severity === "error" ? "error" : worst === "error" ? worst : f.severity),
      "info",
    ),
  };

  return (
    <div className="px-3 pb-4 pt-4">
      <h3 className="u-label px-1 pb-2 text-ink-3">{c.guided.stepOccurrences}</h3>
      <CriterionGroup
        group={group}
        diagnostic={props.diagnostic}
        marks={props.marks}
        guided
        open
        scoped={false}
        selectedId={props.selectedId}
        onToggle={() => {}}
        onScope={() => {}}
        highlightsHidden={false}
        onToggleHighlights={() => {}}
        onSelect={props.onSelect}
        onMark={props.onMark}
        onMarkMany={props.onMarkMany}
      />
      <p className="px-1 pt-3 text-[11.5px] leading-relaxed text-ink-3">{c.revisionList.lexiconCaveat}</p>
    </div>
  );
}
