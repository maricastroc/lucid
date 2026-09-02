"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  analyze,
  checkBriefing,
  DEFAULT_CONFIG,
  EMPTY_BRIEFING,
  isDefaultConfig,
  type Config,
  type Finding,
  type ReaderBriefing,
  type Span,
  type SpliceRefusal,
} from "@/lucid";
import { acceptBaseline, compareToBaseline, parseBaseline, type Baseline, type BaselineRefusal } from "./lib/baseline";
import { findingId, isSafe, orderFindingsForIndex } from "./lib/criteria";
import { queryFindings } from "./lib/finding-query";
import { EMPTY_MARKS } from "./lib/review-marks";
import { rewriteTargetAt } from "./lib/paragraphs";
import { clearWorkspace, getSaveFailed, readWorkspace, subscribeSaveStatus, writeWorkspace } from "./lib/workspace";
import { useCopy } from "./i18n/use-copy";
import { useFindingQuery } from "./hooks/use-finding-query";
import { useHighlightVisibility } from "./hooks/use-highlight-visibility";
import { useReviewMarks } from "./hooks/use-review-marks";
import { useDocumentSource } from "./hooks/use-document-source";
import { useDocumentSelection } from "./hooks/use-document-selection";
import { useFindingNavigation } from "./hooks/use-finding-navigation";
import { useOccurrenceNavigation } from "./hooks/use-occurrence-navigation";
import { useDocumentEdits } from "./hooks/use-document-edits";
import { useReadingPosition } from "./hooks/use-reading-position";
import { isProfileId, profileConfig, type ProfileId } from "./lib/profiles";
import { useRevisionHistory } from "./hooks/use-revision-history";
import { Masthead } from "./components/masthead";
import { DocumentView, type Mode } from "./components/document-view";
import { AuditRail } from "./components/audit-rail";
import { RevisionSheet } from "./components/revision-sheet";
import { Welcome } from "./components/welcome";
import { ArrowDownIcon } from "./components/icons";
import { ConfirmDialog } from "./components/ui/confirm-dialog";
import { Button } from "./components/ui/button";

export function Studio() {
  const { c } = useCopy();
  const [restored] = useState(readWorkspace);
  const [mode, setMode] = useState<Mode>(restored?.mode ?? "audit");
  const [briefing, setBriefing] = useState<ReaderBriefing>(restored?.briefing ?? EMPTY_BRIEFING);
  const [config, setConfig] = useState<Config>(restored?.config ?? DEFAULT_CONFIG);
  const [profileId, setProfileId] = useState<ProfileId>(isProfileId(restored?.profileId) ? restored.profileId : "base");

  const [openedStep, setGuidedStep] = useState<string | null>(restored?.guidedStep ?? null);
  const [baseline, setBaseline] = useState<Baseline | null>(restored?.baseline ?? null);
  const [baselineRefusal, setBaselineRefusal] = useState<BaselineRefusal | null>(null);

  const chooseProfile = useCallback((id: ProfileId) => {
    setProfileId(id);
    setConfig(profileConfig(id));
  }, []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [goHomeOpen, setGoHomeOpen] = useState(false);
  const saveFailed = useSyncExternalStore(subscribeSaveStatus, getSaveFailed, () => false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    text,
    setText,
    diagnostic,
    blocks,
    silentCriteria,
    missingBlockKinds,
    importNotes,
    rawBlocks,
    isEmpty,
    isSettled,
    importing,
    importError,
    dismissImportError,
    refusedEdit,
    acceptAsPlainText,
    discardRefusedEdit,
    previewText,
    loadExample: loadExampleDocument,
    clear: clearDocument,
    openDocument: importDocumentFile,
    originalText,
    enterPastedDocument,
  } = useDocumentSource(restored, config);

  const {
    ledger,
    canUndo,
    applyChange: recordChange,
    undo,
    noteFreeEdit,
    closeTypingSession,
    reset: resetHistory,
  } = useRevisionHistory(text, setText, isSettled, restored?.ledger);

  // A mesma seleção serve a dois destinos: o trecho candidato a termo do vocabulário e, quando a
  // sonda estiver de volta, o trecho a sondar.
  const { excerpt: probeExcerpt, clear: clearProbeExcerpt } = useDocumentSelection(scrollRef);

  const briefingCheck = useMemo(() => checkBriefing(diagnostic.text, briefing), [diagnostic, briefing]);

  const { query, setCriterion, setBucket, setState, setSearch, setOrder, clearFilters, filtered } = useFindingQuery(
    restored?.guidedStep ?? null,
  );

  const findings = useMemo(() => orderFindingsForIndex(diagnostic.findings), [diagnostic]);

  const guidedStep = useMemo(
    () => (openedStep !== null && findings.some((finding) => finding.criterion === openedStep) ? openedStep : null),
    [openedStep, findings],
  );
  const { hiddenHighlights, toggleHighlights } = useHighlightVisibility();
  const safeCount = useMemo(() => findings.filter(isSafe).length, [findings]);
  const humanCount = findings.length - safeCount;

  const {
    marks,
    mark,
    markMany,
    note: noteMark,
    shiftForEdit,
    snapshot: snapshotMarks,
    restore: restoreMarks,
    forgetHistory: forgetMarkHistory,
    reset: resetMarks,
  } = useReviewMarks(diagnostic.findings, isSettled, restored?.reviewMarks ?? EMPTY_MARKS);

  const { groups, visible } = useMemo(
    () => queryFindings(diagnostic.findings, query, marks),
    [diagnostic, query, marks],
  );

  const pendingCount = useMemo(
    () => findings.filter((finding) => marks[findingId(finding)] === undefined).length,
    [findings, marks],
  );

  useEffect(() => {
    if (!isSettled) return;
    if (isEmpty && ledger.length === 0 && briefing === EMPTY_BRIEFING && isDefaultConfig(config)) {
      clearWorkspace();
      return;
    }
    writeWorkspace({
      text,
      originalText,
      blocks: rawBlocks,
      ledger,
      mode,
      briefing,
      config,
      profileId,
      reviewMarks: marks,
      guidedStep,
      importNotes,
      baseline,
    });
  }, [
    isSettled,
    isEmpty,
    text,
    originalText,
    rawBlocks,
    ledger,
    mode,
    briefing,
    config,
    profileId,
    marks,
    guidedStep,
    importNotes,
    baseline,
  ]);

  const revealSheet = useCallback(() => setSheetOpen(true), []);
  const {
    selectedId,
    selectedIndex,
    selectedFinding,
    flashId,
    select,
    clear: clearSelection,
    goTo,
  } = useFindingNavigation({
    findings: visible,
    scrollRef,
    diagnostic,
    enabled: mode === "audit",
    onNavigate: revealSheet,
  });

  const occurrences = useOccurrenceNavigation({
    check: briefingCheck,
    scrollRef,
    enabled: mode === "audit",
  });

  const rewriteTarget = useMemo(
    () =>
      selectedFinding && !isSafe(selectedFinding)
        ? rewriteTargetAt(diagnostic.text, selectedFinding.span.start).span
        : null,
    [selectedFinding, diagnostic],
  );

  const afterDocumentEntered = useCallback(() => {
    clearSelection();
    resetHistory();
    setBriefing(EMPTY_BRIEFING);
    resetMarks();
    setGuidedStep(null);
    clearFilters();
  }, [clearSelection, resetHistory, resetMarks, clearFilters]);

  const afterDocumentReplaced = useCallback(() => {
    afterDocumentEntered();
    setMode("audit");
  }, [afterDocumentEntered]);

  const loadExample = useCallback(() => {
    loadExampleDocument();
    afterDocumentReplaced();
  }, [loadExampleDocument, afterDocumentReplaced]);

  const openDocument = useCallback(
    async (file: File) => {
      if (await importDocumentFile(file)) afterDocumentReplaced();
    },
    [importDocumentFile, afterDocumentReplaced],
  );

  const discardAndGoHome = useCallback(() => {
    clearWorkspace();
    clearDocument();
    setBaseline(null);
    setBaselineRefusal(null);
    afterDocumentReplaced();
  }, [clearDocument, afterDocumentReplaced]);

  const goHome = useCallback(() => {
    if (isEmpty && mode === "audit") return;
    if (!isEmpty) {
      setGoHomeOpen(true);
      return;
    }
    discardAndGoHome();
  }, [isEmpty, mode, discardAndGoHome]);

  const changeMode = useCallback(
    (next: Mode) => {
      closeTypingSession();
      setMode(next);
    },
    [closeTypingSession],
  );

  const originalFindings = useMemo(
    () => (originalText === null || originalText.trim() === "" ? null : analyze(originalText, config).findings),
    [originalText, config],
  );

  const comparison = useMemo(
    () => (baseline === null ? null : compareToBaseline(baseline, diagnostic, config)),
    [baseline, diagnostic, config],
  );

  const attachBaseline = useCallback(
    async (file: File) => {
      const parsed = parseBaseline(await file.text());
      if (!parsed.ok) return setBaselineRefusal(parsed.refusal);
      const refusal = acceptBaseline(parsed.baseline, diagnostic.meta);
      if (refusal !== null) return setBaselineRefusal(refusal);
      setBaselineRefusal(null);
      setBaseline(parsed.baseline);

      // O vocabulário do arquivo é da casa, não daquela medição: ele vale para o documento aberto
      // agora. Os termos que já estão declarados aqui ficam; os do arquivo entram junto.
      const incoming = parsed.baseline.vocabulary;
      if (incoming.length > 0) {
        setConfig((current) => {
          const known = new Set(current.vocabulario.terms.map((t) => t.term.toLocaleLowerCase("pt-BR")));
          const added = incoming.filter((t) => !known.has(t.term.toLocaleLowerCase("pt-BR")));
          if (added.length === 0) return current;
          return {
            ...current,
            vocabulario: { ...current.vocabulario, terms: [...current.vocabulario.terms, ...added] },
          };
        });
      }
    },
    [diagnostic, setConfig],
  );

  const detachBaseline = useCallback(() => {
    setBaselineRefusal(null);
    setBaseline(null);
  }, []);

  const adoptBaselineProfile = useCallback(() => {
    if (baseline === null) return;
    setProfileId(baseline.historical.profileId);
    setConfig(baseline.historical.config);
  }, [baseline]);

  const reading = useReadingPosition(scrollRef, mode, text);

  const shiftAllForEdit = useCallback(
    (target: Span, delta: number) => {
      shiftForEdit(target, delta);
      reading.rebase(target, delta);
    },
    [shiftForEdit, reading],
  );

  const { applyManualEdit, applyCuratedSwap, applyRewrite, undoChange } = useDocumentEdits({
    diagnostic,
    marks,
    previewText,
    snapshotMarks,
    shiftForEdit: shiftAllForEdit,
    restoreMarks,
    recordChange,
    undo,
    clearSelection,
  });

  const goToStep = useCallback(
    (criterion: string) => {
      setGuidedStep(criterion);
      clearFilters();
      setCriterion(criterion);
      clearSelection();
    },
    [clearFilters, setCriterion, clearSelection],
  );

  const scopeCriterion = setCriterion;

  const focusCriterion = useCallback(
    (criterion: string) => {
      setGuidedStep((step) => (step === null ? null : criterion));
      setCriterion(criterion);
    },
    [setCriterion],
  );

  const clearAllFilters = useCallback(() => {
    setGuidedStep(null);
    clearFilters();
  }, [clearFilters]);

  const openFirstPending = useCallback(() => {
    const next = visible.find((finding) => marks[findingId(finding)] === undefined) ?? visible[0];
    if (next !== undefined) select(next);
  }, [visible, marks, select]);

  const advancePast = useCallback(
    (marked: Finding) => {
      const markedId = findingId(marked);
      const size = visible.length;
      const from = visible.findIndex((finding) => findingId(finding) === markedId);
      for (let step = 1; step <= size; step++) {
        const candidate = visible[(from + step + size) % size];
        if (findingId(candidate) === markedId) continue;
        if (marks[findingId(candidate)] === undefined) {
          select(candidate);
          return;
        }
      }
      clearSelection();
    },
    [visible, marks, select, clearSelection],
  );

  const leaveRoute = useCallback(() => {
    setGuidedStep(null);
    setCriterion(null);
    clearSelection();
  }, [setCriterion, clearSelection]);

  const selectFinding = useCallback(
    (finding: Finding) => {
      setMode("audit");
      focusCriterion(finding.criterion);
      select(finding);
    },
    [select, focusCriterion],
  );

  const onFreeTypeText = useCallback(
    (value: string) => {
      noteFreeEdit();
      forgetMarkHistory();
      setText(value);
    },
    [noteFreeEdit, forgetMarkHistory, setText],
  );

  const onPasteDocument = useCallback(
    (value: string, html: string | null) => {
      enterPastedDocument(value, html);
      afterDocumentEntered();
    },
    [enterPastedDocument, afterDocumentEntered],
  );

  const panelProps = {
    selection: probeExcerpt,
    onClearSelection: clearProbeExcerpt,
    diagnostic,
    findings,
    groups,
    visible,
    safeCount,
    humanCount,
    ledger,
    originalText,
    originalFindings,
    blocks,
    rawBlocks,
    silentCriteria,
    missingBlockKinds,
    importNotes,
    query,
    filtered,
    onQuery: {
      bucket: setBucket,
      state: setState,
      search: setSearch,
      order: setOrder,
      criterion: scopeCriterion,
      clear: clearAllFilters,
    },
    navigation: {
      selectedFinding,
      selectedId,
      index: selectedIndex + 1,
      total: visible.length,
      onSelect: selectFinding,
      onPrev: () => goTo(-1),
      onNext: () => goTo(1),
      onBackToList: clearSelection,
      onBackToOverview: () => {
        clearSelection();
        scopeCriterion(null);
      },
    },
    review: { marks, onMark: mark, onMarkMany: markMany, onNote: noteMark },
    history: { canUndo, onUndo: undoChange },
    baseline: {
      attached: baseline,
      comparison,
      refusal: baselineRefusal,
      onAttach: attachBaseline,
      onDetach: detachBaseline,
      onAdoptProfile: adoptBaselineProfile,
      onDismissRefusal: () => setBaselineRefusal(null),
    },
    route: {
      step: guidedStep,
      onOpenStep: goToStep,
      onLeave: leaveRoute,
      onOpenFirstPending: openFirstPending,
      onAdvance: advancePast,
    },
    highlights: { hidden: hiddenHighlights, onToggle: toggleHighlights },
    edits: { onApplyRewrite: applyRewrite, onManualEdit: applyManualEdit, onApplyCuratedSwap: applyCuratedSwap },
    settings: {
      briefing,
      briefingCheck,
      onBriefingChange: setBriefing,
      config,
      onConfigChange: setConfig,
      profileId,
      onProfileChange: chooseProfile,
    },
    occurrences: {
      cursor: occurrences.cursor,
      index: occurrences.index,
      onSelect: occurrences.select,
      onStep: occurrences.step,
    },
  };
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-desk">
      <Masthead onGoHome={goHome} />
      {importError !== null && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-sev-error/40 bg-sev-error/10 px-6 py-2 text-[12.5px] text-ink-1"
        >
          <span>{c.studio.importRefusal[importError]}</span>
          <Button variant="ghost" size="sm" onClick={dismissImportError}>
            {c.common.close}
          </Button>
        </div>
      )}

      {saveFailed && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-sev-warning/40 bg-sev-warning/10 px-6 py-2 text-[12.5px] text-ink-1"
        >
          <span>{c.studio.saveFailed}</span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {isEmpty && mode === "audit" ? (
          <Welcome
            onWrite={() => setMode("edit")}
            onOpenDocument={openDocument}
            onLoadExample={loadExample}
            importing={importing}
          />
        ) : (
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <DocumentView
              ref={scrollRef}
              mode={mode}
              onChangeMode={changeMode}
              importing={importing}
              text={text}
              diagnostic={diagnostic}
              blocks={blocks}
              selectedId={selectedId}
              flashId={flashId}
              hiddenHighlights={hiddenHighlights}
              rewriteTarget={rewriteTarget}
              occurrences={occurrences.spans}
              activeOccurrence={occurrences.active}
              onChangeText={onFreeTypeText}
              onLeaveDraft={closeTypingSession}
              onPasteDocument={onPasteDocument}
              onSelectFinding={selectFinding}
              onOpenDocument={openDocument}
            />
            <DocumentNotices
              refusedEdit={refusedEdit}
              canUndo={canUndo}
              changeKey={ledger.length}
              onAcceptPlain={acceptAsPlainText}
              onDiscardRefused={discardRefusedEdit}
              onUndo={undoChange}
            />
          </div>
        )}

        {!isEmpty && <AuditRail {...panelProps} probeExcerpt={probeExcerpt} onClearProbeExcerpt={clearProbeExcerpt} />}
      </div>

      {mode === "audit" && findings.length > 0 && !sheetOpen && (
        <Button
          variant="primary"
          size="xl"
          shape="pill"
          onClick={revealSheet}
          className="fixed bottom-5 right-5 z-30 shadow-(--shadow-pop) lg:hidden"
        >
          {c.studio.openAudit(pendingCount)}
        </Button>
      )}

      {mode === "audit" && sheetOpen && (
        <RevisionSheet
          {...panelProps}
          onDismiss={() => {
            setSheetOpen(false);
            clearSelection();
          }}
        />
      )}

      <ConfirmDialog
        open={goHomeOpen}
        onOpenChange={setGoHomeOpen}
        title={c.studio.goHome.title}
        body={c.studio.goHome.body}
        confirmLabel={c.studio.goHome.confirm}
        onConfirm={discardAndGoHome}
      />
    </div>
  );
}

function DocumentNotices({
  refusedEdit,
  canUndo,
  changeKey,
  onAcceptPlain,
  onDiscardRefused,
  onUndo,
}: {
  refusedEdit: { reason: SpliceRefusal } | null;
  canUndo: boolean;
  changeKey: number;
  onAcceptPlain: () => void;
  onDiscardRefused: () => void;
  onUndo: () => void;
}) {
  const { c } = useCopy();
  const [settled, setSettled] = useState<number | null>(null);

  useEffect(() => {
    if (!canUndo) return;
    const timer = setTimeout(() => setSettled(changeKey), 8000);
    return () => clearTimeout(timer);
  }, [canUndo, changeKey]);

  const showUndo = canUndo && settled !== changeKey;
  if (refusedEdit === null && !showUndo) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex flex-col items-center gap-2 px-4">
      {refusedEdit !== null && (
        <div
          role="alert"
          className="rise pointer-events-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-2xl border border-sev-warning/40 bg-sheet px-4 py-2.5 shadow-(--shadow-pop)"
        >
          <span className="text-[12.5px] text-ink-1">
            {c.studio.spliceRefused[refusedEdit.reason]}{" "}
            <span className="text-ink-2">{c.studio.spliceRefusedKept}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <Button variant="outline" shape="pill" onClick={onAcceptPlain}>
              {c.studio.spliceAcceptPlain}
            </Button>
            <Button variant="ghost" shape="pill" onClick={onDiscardRefused}>
              {c.studio.spliceDiscard}
            </Button>
          </span>
        </div>
      )}
      {showUndo && (
        <div className="rise pointer-events-auto flex items-center gap-3 rounded-full border border-rule-2 bg-sheet px-4 py-2.5 shadow-(--shadow-pop)">
          <span className="inline-flex items-center gap-2 text-[13px] text-ink-1">
            <ArrowDownIcon className="size-4 text-safe" aria-hidden />
            {c.studio.changeApplied}
          </span>
          <Button variant="link" shape="pill" onClick={onUndo}>
            {c.studio.undo}
          </Button>
        </div>
      )}
    </div>
  );
}
