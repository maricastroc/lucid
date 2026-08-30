"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ImportNotes } from "../hooks/use-document-source";
import type { Block, BriefingCheck, Config, Diagnostic, Finding, RawBlock, ReaderBriefing, Span } from "@/lucid";
import type { RewriteProposal } from "@/report/rewrite";
import type { LedgerEntry } from "../lib/ledger";
import type { ProfileId } from "../lib/profiles";
import { buildAuditViews, viewPanelId, viewTabId, type AuditViewId } from "../lib/audit-views";
import type { FindingGroup, FindingQuery } from "../lib/finding-query";
import type { QueryActions } from "./revision-list/finding-filters";
import { noteOf, reviewStateOf, type ReviewMarkKind, type ReviewMarks } from "../lib/review-marks";
import { reviewRoute } from "../lib/review-route";
import type { OccurrenceCursor } from "../lib/occurrence-cursor";
import { useAuditView, type ReviewMode } from "../hooks/use-audit-view";
import { AuditNav } from "./audit-nav";
import { RouteHeader } from "./route/route-header";
import type { BaselineSurface } from "./views/baseline-panel";
import { ChangesView } from "./views/changes-view";
import { MetricsView } from "./views/metrics-view";
import { OverviewView } from "./views/overview-view";
import { ReviewView } from "./views/review-view";
import { SettingsView } from "./views/settings-view";
import { ViewHeader } from "./views/view-header";
import { ProbePanel } from "./probe-panel";
import { DecisionNote } from "./revision-note/decision-note";
import { RevisionNote } from "./revision-note";
import { NoteNav } from "./revision-note/note-nav";
import { useCopy } from "../i18n/use-copy";

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
  onMark: (finding: Finding, mark: ReviewMarkKind | null) => void;
  onMarkMany: (findings: readonly Finding[], mark: ReviewMarkKind | null) => void;
  onNote: (finding: Finding, text: string) => void;
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
  profileId: ProfileId;
  onProfileChange: (id: ProfileId) => void;
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
  originalText: string | null;
  originalFindings: readonly Finding[] | null;
  blocks: readonly Block[] | null;
  rawBlocks: readonly RawBlock[] | null;
  silentCriteria: readonly string[];
  missingBlockKinds: readonly string[];
  importNotes: ImportNotes | null;
  query: FindingQuery;
  filtered: boolean;
  onQuery: QueryActions;
  navigation: NoteNavigation;
  review: ReviewSurface;
  route: {
    step: string | null;
    onOpenStep: (criterion: string) => void;
    onLeave: () => void;
    onOpenFirstPending: () => void;
    onAdvance: (marked: Finding) => void;
  };
  highlights: HighlightVisibility;
  edits: DocumentEditActions;
  settings: AnalysisSettings;
  occurrences: OccurrenceSurface;
  history: { canUndo: boolean; onUndo: () => void };
  baseline: BaselineSurface;
  settingsOpen: boolean;
  onCloseSettings: () => void;
  probeExcerpt?: string;
  onClearProbeExcerpt?: () => void;
}

export function AuditPanel(props: AuditPanelProps) {
  const { c } = useCopy();
  const scrollRef = useRef<HTMLDivElement>(null);

  const route = useMemo(
    () => reviewRoute(props.findings, props.review.marks, props.route.step, props.originalFindings),
    [props.findings, props.review.marks, props.route.step, props.originalFindings],
  );

  const views = useMemo(
    () =>
      buildAuditViews(
        { pending: route.pending, changes: props.ledger.length, hasProbe: props.probeExcerpt !== undefined },
        c,
      ),
    [route.pending, props.ledger.length, props.probeExcerpt, c],
  );

  const nav = useAuditView(views, scrollRef);
  const { goToRoute, goTo, setReviewMode } = nav;

  const closeSettings = props.onCloseSettings;
  const goToView = useCallback(
    (id: AuditViewId) => {
      closeSettings();
      goTo(id);
    },
    [closeSettings, goTo],
  );

  const guidedStep = props.route.step;
  const lastStep = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (lastStep.current === guidedStep) return;
    lastStep.current = guidedStep;
    if (guidedStep === null) return;
    closeSettings();
    setReviewMode("route");
    goTo("review");
  }, [guidedStep, closeSettings, setReviewMode, goTo]);

  const noteRef = useRef<HTMLDivElement>(null);
  const noteWasOpen = useRef(false);
  const selectedId = props.navigation.selectedId;
  useEffect(() => {
    const open = selectedId !== null;
    if (open && !noteWasOpen.current) noteRef.current?.focus({ preventScroll: true });
    noteWasOpen.current = open;
  }, [selectedId]);

  if (props.settingsOpen) {
    return (
      <SettingsView
        briefing={props.settings.briefing}
        check={props.settings.briefingCheck}
        cursor={props.occurrences.cursor}
        index={props.occurrences.index}
        config={props.settings.config}
        profileId={props.settings.profileId}
        onBriefingChange={props.settings.onBriefingChange}
        onConfigChange={props.settings.onConfigChange}
        onProfileChange={props.settings.onProfileChange}
        onSelectOccurrence={props.occurrences.onSelect}
        onStepOccurrence={props.occurrences.onStep}
        onClose={closeSettings}
      />
    );
  }

  if (props.navigation.selectedFinding) {
    const selected = props.navigation.selectedFinding;
    const state = reviewStateOf(props.review.marks, selected);
    const pendingHere = state === "pending";
    const walking = route.open !== null;
    return (
      <>
        {walking && (
          <RouteHeader
            route={route}
            compact
            onGo={props.route.onOpenStep}
            onLeave={props.route.onLeave}
            onOpen={props.route.onOpenFirstPending}
          />
        )}
        <NoteNav
          index={props.navigation.index}
          total={props.navigation.total}
          criterion={selected.criterion}
          mark={reviewStateOf(props.review.marks, selected)}
          guided={walking ? { willFinishStep: pendingHere && route.open!.step.pending === 1 } : null}
          onMark={(value) => {
            props.review.onMark(selected, value);

            if (value !== "seen" || !walking) return;
            props.route.onAdvance(selected);
          }}
          onPrev={props.navigation.onPrev}
          onNext={props.navigation.onNext}
          onBackToList={props.navigation.onBackToList}
          onBackToOverview={props.navigation.onBackToOverview}
        />
        <div
          key={props.navigation.selectedId ?? "note"}
          ref={noteRef}
          tabIndex={-1}
          role="region"
          aria-label={c.guided.occurrenceOf(props.navigation.index, props.navigation.total)}
          className="min-h-0 flex-1 overflow-y-auto focus:outline-none"
        >
          {state !== "pending" && (
            <DecisionNote
              kind={state}
              note={noteOf(props.review.marks, selected)}
              onNote={(text) => props.review.onNote(selected, text)}
            />
          )}
          <RevisionNote
            finding={selected}
            source={props.diagnostic.text}
            allFindings={props.diagnostic.findings}
            onApplyRewrite={props.edits.onApplyRewrite}
            onManualEdit={props.edits.onManualEdit}
            onApplyCuratedSwap={props.edits.onApplyCuratedSwap}
          />
        </div>
      </>
    );
  }

  const active = views.find((view) => view.id === nav.view) ?? views[0];

  return (
    <>
      <AuditNav views={views} activeId={nav.view} onGo={goToView} onKeyDown={nav.onTabKeyDown} />
      <div
        ref={scrollRef}
        id={viewPanelId(active.id)}
        role="tabpanel"
        aria-labelledby={viewTabId(active.id)}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto focus:outline-none"
      >
        <ViewHeader id={active.id} title={active.label} purpose={active.purpose} />
        {active.id === "overview" && (
          <OverviewView
            diagnostic={props.diagnostic}
            findings={props.findings}
            route={route}
            safeCount={props.safeCount}
            humanCount={props.humanCount}
            changeCount={props.ledger.length}
            blocks={props.blocks}
            silentCriteria={props.silentCriteria}
            missingBlockKinds={props.missingBlockKinds}
            importNotes={props.importNotes}
            config={props.settings.config}
            onContinue={props.route.onOpenStep}
            onOpenReview={goToRoute}
            onSeeChanges={() => goToView("changes")}
          />
        )}
        {active.id === "review" && (
          <ReviewView
            diagnostic={props.diagnostic}
            route={route}
            groups={props.groups}
            visible={props.visible}
            allFindings={props.findings}
            query={props.query}
            marks={props.review.marks}
            filtered={props.filtered}
            selectedId={props.navigation.selectedId}
            mode={nav.reviewMode}
            onMode={(mode: ReviewMode) => {
              nav.setReviewMode(mode);
              props.onQuery.criterion(mode === "browse" ? null : (route.open?.step.criterion ?? null));
            }}
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
            onOpenStep={props.route.onOpenStep}
            onLeaveRoute={props.route.onLeave}
            onOpenFirstPending={props.route.onOpenFirstPending}
            onSeeSwaps={() => {
              nav.setReviewMode("browse");
              props.onQuery.bucket("safe");
            }}
          />
        )}
        {active.id === "changes" && (
          <ChangesView
            entries={props.ledger}
            originalText={props.originalText}
            originalFindings={props.originalFindings}
            findings={props.findings}
            canUndo={props.history.canUndo}
            onUndo={props.history.onUndo}
            baseline={props.baseline}
            config={props.settings.config}
          />
        )}
        {active.id === "metrics" && <MetricsView diagnostic={props.diagnostic} />}
        {active.id === "probe" && (
          <ProbePanel
            excerpt={props.probeExcerpt ?? ""}
            onClearExcerpt={props.onClearProbeExcerpt ?? (() => {})}
            suggestedQuestion={props.settings.briefing.purpose}
          />
        )}
      </div>
    </>
  );
}
