"use client";

import { useMemo, useRef } from "react";
import type { ImportNotes } from "../hooks/use-document-source";
import {
  configDeviations,
  type Block,
  type BriefingCheck,
  type Config,
  type Diagnostic,
  type Finding,
  type ReaderBriefing,
  type Span,
} from "@/lucid";
import { BriefingPanel } from "./briefing-panel";
import { ProfilePanel } from "./profile-panel";
import type { RewriteProposal } from "@/report/rewrite";
import type { LedgerEntry } from "../lib/ledger";
import { buildPanelSections, type PanelSectionId } from "../lib/panel-sections";
import type { FindingGroup, FindingQuery } from "../lib/finding-query";
import type { QueryActions } from "./revision-list/finding-filters";
import type { ReviewMark, ReviewMarks } from "../lib/review-marks";
import { findingId } from "../lib/criteria";
import type { OccurrenceCursor } from "../lib/occurrence-cursor";
import { usePanelSections } from "../hooks/use-panel-sections";
import { AuditOverview, ReadingSection } from "./audit-overview";
import { PanelNav } from "./panel-nav";
import { PanelSection } from "./panel-section";
import { ProbePanel } from "./probe-panel";
import { RevisionList } from "./revision-list";
import { RevisionNote } from "./revision-note";
import { NoteNav } from "./revision-note/note-nav";
import { useCopy } from "../i18n/use-copy";
import { ChevronRightIcon } from "./icons";

export interface NoteNavigation {
  selectedFinding: Finding | null;
  selectedId: string | null;
  index: number;
  total: number;
  onSelect: (finding: Finding) => void;
  onPrev: () => void;
  onNext: () => void;
  onBackToList: () => void;
  onBackToOverview: () => void;
}

export interface ReviewSurface {
  marks: ReviewMarks;
  onMark: (finding: Finding, mark: ReviewMark | null) => void;
  onMarkMany: (findings: readonly Finding[], mark: ReviewMark | null) => void;
}

export interface HighlightVisibility {
  hidden: ReadonlySet<string>;
  onToggle: (criterion: string) => void;
}

export interface DocumentEditActions {
  onApplyRewrite: (target: Span, proposal: RewriteProposal) => void;
  onManualEdit: (target: Span, replacement: string) => void;
  onApplyCuratedSwap: (target: Span, replacement: string) => void;
}

export interface AnalysisSettings {
  briefing: ReaderBriefing;
  briefingCheck: BriefingCheck;
  onBriefingChange: (briefing: ReaderBriefing) => void;
  config: Config;
  onConfigChange: (config: Config) => void;
}

export interface OccurrenceSurface {
  cursor: OccurrenceCursor | null;
  index: number;
  onSelect: (expression: string, index: number) => void;
  onStep: (delta: number) => void;
}

export interface AuditPanelProps {
  diagnostic: Diagnostic;
  findings: readonly Finding[];
  groups: readonly FindingGroup[];
  visible: readonly Finding[];
  safeCount: number;
  humanCount: number;
  ledger: readonly LedgerEntry[];
  blocks: readonly Block[] | null;
  silentCriteria: readonly string[];
  missingBlockKinds: readonly string[];
  importNotes: ImportNotes | null;
  query: FindingQuery;
  filtered: boolean;
  onQuery: QueryActions;
  navigation: NoteNavigation;
  review: ReviewSurface;
  highlights: HighlightVisibility;
  edits: DocumentEditActions;
  settings: AnalysisSettings;
  occurrences: OccurrenceSurface;
  probeExcerpt?: string;
  onClearProbeExcerpt?: () => void;
}

const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function AuditPanel(props: AuditPanelProps) {
  const { c } = useCopy();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasProbe = props.probeExcerpt !== undefined;

  const sections = useMemo(
    () => buildPanelSections({ findingCount: props.visible.length, hasProbe }, c),
    [props.visible.length, hasProbe, c],
  );
  const nav = usePanelSections(sections, scrollRef, props.navigation.selectedFinding === null);

  if (props.navigation.selectedFinding) {
    return (
      <>
        <NoteNav
          index={props.navigation.index}
          total={props.navigation.total}
          criterion={props.navigation.selectedFinding.criterion}
          mark={props.review.marks[findingId(props.navigation.selectedFinding)] ?? null}
          onMark={(value) => props.review.onMark(props.navigation.selectedFinding as Finding, value)}
          onPrev={props.navigation.onPrev}
          onNext={props.navigation.onNext}
          onBackToList={props.navigation.onBackToList}
          onBackToOverview={props.navigation.onBackToOverview}
        />
        <div key={props.navigation.selectedId ?? "note"} className="min-h-0 flex-1 overflow-y-auto">
          <RevisionNote
            finding={props.navigation.selectedFinding}
            source={props.diagnostic.text}
            onApplyRewrite={props.edits.onApplyRewrite}
            onManualEdit={props.edits.onManualEdit}
            onApplyCuratedSwap={props.edits.onApplyCuratedSwap}
          />
        </div>
      </>
    );
  }

  const body = (id: PanelSectionId) => {
    switch (id) {
      case "summary":
        return (
          <AuditOverview
            diagnostic={props.diagnostic}
            findings={props.findings}
            safeCount={props.safeCount}
            humanCount={props.humanCount}
            ledger={props.ledger}
            blocks={props.blocks}
            silentCriteria={props.silentCriteria}
            missingBlockKinds={props.missingBlockKinds}
            importNotes={props.importNotes}
            briefing={props.settings.briefing}
            briefingCheck={props.settings.briefingCheck}
            config={props.settings.config}
            marks={props.review.marks}
          />
        );
      case "findings":
        return (
          <RevisionList
            diagnostic={props.diagnostic}
            groups={props.groups}
            visible={props.visible}
            allFindings={props.findings}
            query={props.query}
            marks={props.review.marks}
            filtered={props.filtered}
            selectedId={props.navigation.selectedId}
            onBucket={props.onQuery.bucket}
            onState={props.onQuery.state}
            onSearch={props.onQuery.search}
            onOrder={props.onQuery.order}
            onCriterion={props.onQuery.criterion}
            onClearFilters={props.onQuery.clear}
            onSelect={props.navigation.onSelect}
            hiddenHighlights={props.highlights.hidden}
            onToggleHighlights={props.highlights.onToggle}
            onMark={props.review.onMark}
            onMarkMany={props.review.onMarkMany}
          />
        );
      case "settings":
        return (
          <>
            <p className="px-4 pt-4 pb-1 text-[12.5px] leading-relaxed text-ink-2">{c.panel.settingsLead}</p>
            <BriefingPanel
              briefing={props.settings.briefing}
              check={props.settings.briefingCheck}
              cursor={props.occurrences.cursor}
              index={props.occurrences.index}
              onChange={props.settings.onBriefingChange}
              onSelectOccurrence={props.occurrences.onSelect}
              onStepOccurrence={props.occurrences.onStep}
            />
            <ProfilePanel config={props.settings.config} onChange={props.settings.onConfigChange} />
            <div className="border-t border-rule-1 px-4 py-4">
              <button
                type="button"
                onClick={() => nav.goTo("findings")}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-[12.5px] font-semibold text-accent-ink transition-opacity duration-150 hover:opacity-90"
              >
                {c.panel.goToFindings}
                <ChevronRightIcon className="size-3.5" />
              </button>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{c.panel.goToFindingsHint}</p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{c.panel.settingsRecordPointer}</p>
              <p className="mt-3 text-[11px] text-ink-dim" title={c.panel.settingsIsoTitle}>
                {c.panel.settingsIsoNote}
              </p>
            </div>
          </>
        );
      case "metrics":
        return <ReadingSection diagnostic={props.diagnostic} />;
      case "probe":
        return (
          <ProbePanel
            excerpt={props.probeExcerpt ?? ""}
            onClearExcerpt={props.onClearProbeExcerpt ?? (() => {})}
            suggestedQuestion={props.settings.briefing.purpose}
          />
        );
    }
  };

  return (
    <>
      <PanelNav sections={sections} activeId={nav.activeId} onGo={nav.goTo} />
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto [overflow-anchor:none]">
        {sections.map((section) => (
          <PanelSection
            key={section.id}
            id={section.id}
            title={sectionTitle(section.id, c)}
            summary={sectionSummary(section.id, props, c)}
            collapsible={section.collapsible}
            open={nav.isOpen(section.id)}
            onToggle={nav.toggle}
          >
            {body(section.id)}
          </PanelSection>
        ))}
      </div>
    </>
  );
}

function sectionTitle(id: PanelSectionId, c: ReturnType<typeof useCopy>["c"]): string {
  switch (id) {
    case "summary":
      return c.panel.sections.summary;
    case "findings":
      return c.revisionList.title;
    case "settings":
      return c.panel.settingsTitle;
    case "metrics":
      return c.overview.readingLabel;
    case "probe":
      return c.probe.title;
  }
}

function sectionSummary(
  id: PanelSectionId,
  props: AuditPanelProps,
  c: ReturnType<typeof useCopy>["c"],
): string | undefined {
  switch (id) {
    case "settings":
      return [
        c.panel.settingsSummaryExpressions(props.settings.briefing.mustFind.length),
        c.panel.settingsSummaryProfile(configDeviations(props.settings.config).length),
      ].join(c.panel.settingsSummaryJoin);
    case "metrics":
      return c.panel.metricsSummary(
        fmt(props.diagnostic.metrics.words),
        fmt(props.diagnostic.metrics.wordsPerSentence),
      );
    case "probe":
      return c.panel.probeSummary;
    default:
      return undefined;
  }
}
