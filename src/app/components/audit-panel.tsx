"use client";

import { useMemo, useRef } from "react";
import type { DocxNotes } from "@/importers/docx";
import { configDeviations, type Block, type BriefingCheck, type Config, type Diagnostic, type Finding, type ReaderBriefing, type Span } from "@/lucid";
import { BriefingPanel } from "./briefing-panel";
import { ProfilePanel } from "./profile-panel";
import type { RewriteProposal } from "@/report/rewrite";
import type { LedgerEntry } from "../lib/ledger";
import { buildPanelSections, type PanelSectionId } from "../lib/panel-sections";
import type { Bucket, FindingGroup, FindingQuery, SortOrder, StateFilter } from "../lib/finding-query";
import type { ReviewMark, ReviewMarks } from "../lib/review-marks";
import { findingId, metaFor } from "../lib/criteria";
import { usePanelSections } from "../hooks/use-panel-sections";
import { AuditOverview, ReadingSection } from "./audit-overview";
import { PanelNav } from "./panel-nav";
import { PanelSection } from "./panel-section";
import { ProbePanel } from "./probe-panel";
import { RevisionList } from "./revision-list";
import { RevisionNote } from "./revision-note";
import { useCopy } from "../i18n/use-copy";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";

export interface AuditPanelProps {
  diagnostic: Diagnostic;
  findings: readonly Finding[];
  selectedFinding: Finding | null;
  selectedId: string | null;
  index: number;
  total: number;
  safeCount: number;
  humanCount: number;
  ledger: readonly LedgerEntry[];
  blocks: readonly Block[] | null;
  silentCriteria: readonly string[];
  missingBlockKinds: readonly string[];
  importNotes: DocxNotes | null;
  briefing: ReaderBriefing;
  briefingCheck: BriefingCheck;
  onBriefingChange: (briefing: ReaderBriefing) => void;
  config: Config;
  onConfigChange: (config: Config) => void;
  groups: readonly FindingGroup[];
  visible: readonly Finding[];
  query: FindingQuery;
  marks: ReviewMarks;
  filtered: boolean;
  onToggleCriterion: (criterion: string) => void;
  onBucket: (b: Bucket) => void;
  onState: (s: StateFilter) => void;
  onSearch: (s: string) => void;
  onOrder: (o: SortOrder) => void;
  onCriterion: (criterion: string | null) => void;
  onClearFilters: () => void;
  onMark: (finding: Finding, mark: ReviewMark | null) => void;
  onMarkMany: (findings: readonly Finding[], mark: ReviewMark | null) => void;
  onSelect: (finding: Finding) => void;
  onBackToList: () => void;
  onBackToOverview: () => void;
  onApplyRewrite: (target: Span, proposal: RewriteProposal) => void;
  onManualEdit: (target: Span, replacement: string) => void;
  onPrev: () => void;
  onNext: () => void;
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
  const nav = usePanelSections(sections, scrollRef, props.selectedFinding === null);

  if (props.selectedFinding) {
    return (
      <>
        <NoteNav
          index={props.index}
          total={props.total}
          criterion={props.selectedFinding.criterion}
          mark={props.marks[findingId(props.selectedFinding)] ?? null}
          onMark={(value) => props.onMark(props.selectedFinding as Finding, value)}
          onPrev={props.onPrev}
          onNext={props.onNext}
          onBackToList={props.onBackToList}
          onBackToOverview={props.onBackToOverview}
        />
        <div key={props.selectedId ?? "note"} className="min-h-0 flex-1 overflow-y-auto">
          <RevisionNote
            finding={props.selectedFinding}
            source={props.diagnostic.text}
            onApplyRewrite={props.onApplyRewrite}
            onManualEdit={props.onManualEdit}
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
            briefing={props.briefing}
            briefingCheck={props.briefingCheck}
            config={props.config}
            marks={props.marks}
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
            onToggleCriterion={props.onToggleCriterion}
            onMark={props.onMark}
            onMarkMany={props.onMarkMany}
          />
        );
      case "settings":
        return (
          <>
            <BriefingPanel briefing={props.briefing} check={props.briefingCheck} onChange={props.onBriefingChange} />
            <ProfilePanel config={props.config} onChange={props.onConfigChange} />
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
            suggestedQuestion={props.briefing.purpose}
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
        c.panel.settingsSummaryReader(props.briefingCheck.declared),
        c.panel.settingsSummaryProfile(configDeviations(props.config).length),
      ].join(c.panel.settingsSummaryJoin);
    case "metrics":
      return c.panel.metricsSummary(fmt(props.diagnostic.metrics.words), fmt(props.diagnostic.metrics.wordsPerSentence));
    case "probe":
      return c.panel.probeSummary;
    default:
      return undefined;
  }
}

export function NoteNav({
  index,
  total,
  criterion,
  mark,
  onMark,
  onPrev,
  onNext,
  onBackToList,
  onBackToOverview,
}: {
  index: number;
  total: number;
  criterion: string;
  mark: ReviewMark | null;
  onMark: (mark: ReviewMark | null) => void;
  onPrev: () => void;
  onNext: () => void;
  onBackToList: () => void;
  onBackToOverview: () => void;
}) {
  const { c, lang } = useCopy();
  const label = metaFor(criterion, lang).label;
  return (
    <div className="shrink-0 border-b border-rule-1">
      <div className="flex h-10 items-center gap-1 px-2.5 text-[11.5px]">
        <button
          type="button"
          onClick={onBackToOverview}
          className="rounded-md px-1.5 py-1 text-ink-3 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-1"
        >
          {c.note.crumbAll}
        </button>
        <ChevronRightIcon className="size-3 shrink-0 text-ink-dim" />
        <button
          type="button"
          onClick={onBackToList}
          className="row-hit min-w-0 truncate rounded-md px-1.5 py-1 font-medium text-accent transition-colors duration-150 hover:bg-accent-weak"
          title={c.note.crumbBackTo(label)}
        >
          {label} <span className="tabular-nums opacity-70">{total}</span>
        </button>
        <ChevronRightIcon className="size-3 shrink-0 text-ink-dim" />
        <span className="shrink-0 tabular-nums text-ink-2">
          {index} <span className="text-ink-3">{c.note.navOf}</span> {total}
        </span>
      </div>

      <div className="flex h-11 items-center justify-between gap-2 border-t border-rule-1 px-2.5">
        <div className="flex items-center gap-0.5">
          <IconBtn label={c.note.navPrev} onClick={onPrev}>
            <ChevronLeftIcon className="size-4" />
          </IconBtn>
          <IconBtn label={c.note.navNext} onClick={onNext}>
            <ChevronRightIcon className="size-4" />
          </IconBtn>
          <button
            type="button"
            onClick={onBackToList}
            className="ml-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
          >
            <ChevronLeftIcon className="size-3.5" />
            {c.note.backToList}
          </button>
        </div>
        <button
          type="button"
          aria-pressed={mark === "seen"}
          onClick={() => onMark(mark === "seen" ? null : "seen")}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] transition-colors duration-150 ${
            mark === "seen" ? "bg-surface-3 text-ink-1" : "text-ink-2 hover:bg-surface-2 hover:text-ink-0"
          }`}
        >
          <CheckIcon className="size-3.5" />
          {mark === "seen" ? c.revisionList.unmark : c.revisionList.markSeen}
        </button>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
    >
      {children}
    </button>
  );
}
