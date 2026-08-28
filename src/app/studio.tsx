"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { checkBriefing, DEFAULT_CONFIG, EMPTY_BRIEFING, isDefaultConfig, type Config, type Finding, type ReaderBriefing, type Span } from "@/lucid";
import type { RewriteProposal } from "@/report/rewrite";
import { isSafe, orderFindingsForIndex } from "./lib/criteria";
import { queryFindings } from "./lib/finding-query";
import { EMPTY_MARKS } from "./lib/review-marks";
import { rewriteTargetAt } from "./lib/paragraphs";
import { spliceSpan } from "./lib/text-edit";
import { sourceLabel, type LedgerEntry } from "./lib/ledger";
import { clearWorkspace, getSaveFailed, readWorkspace, subscribeSaveStatus, writeWorkspace } from "./lib/workspace";
import { useCopy } from "./i18n/use-copy";
import { useFindingQuery } from "./hooks/use-finding-query";
import { useReviewMarks } from "./hooks/use-review-marks";
import { useDocumentSource } from "./hooks/use-document-source";
import { useDocumentSelection } from "./hooks/use-document-selection";
import { useFindingNavigation } from "./hooks/use-finding-navigation";
import { useRevisionHistory } from "./hooks/use-revision-history";
import { Masthead } from "./components/masthead";
import { DocumentView, type Mode } from "./components/document-view";
import { AuditRail } from "./components/audit-rail";
import { RevisionSheet } from "./components/revision-sheet";
import { Welcome } from "./components/welcome";
import { ArrowDownIcon } from "./components/icons";
import { ConfirmDialog } from "./components/ui/confirm-dialog";

export function Studio() {
  const { c } = useCopy();
  const [restored] = useState(readWorkspace);
  const [mode, setMode] = useState<Mode>(restored?.mode ?? "audit");
  const [briefing, setBriefing] = useState<ReaderBriefing>(restored?.briefing ?? EMPTY_BRIEFING);
  const [config, setConfig] = useState<Config>(restored?.config ?? DEFAULT_CONFIG);
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
    loadExample: loadExampleDocument,
    clear: clearDocument,
    openDocx: importDocxFile,
  } = useDocumentSource(restored, config);

  const {
    ledger,
    canUndo,
    applyChange: recordChange,
    undo,
    noteFreeEdit,
    reset: resetHistory,
  } = useRevisionHistory(text, setText, isSettled, restored?.ledger);

  const { excerpt: probeExcerpt, clear: clearProbeExcerpt } = useDocumentSelection(scrollRef);

  const briefingCheck = useMemo(() => checkBriefing(diagnostic.text, briefing), [diagnostic, briefing]);

  const {
    query,
    toggleCriterion,
    setCriterion,
    setBucket,
    setState,
    setSearch,
    setOrder,
    clearFilters,
    filtered,
  } = useFindingQuery();

  const findings = useMemo(
    () => orderFindingsForIndex(diagnostic.findings.filter((f) => query.activeCriteria.has(f.criterion))),
    [diagnostic, query.activeCriteria],
  );
  const safeCount = useMemo(() => findings.filter(isSafe).length, [findings]);
  const humanCount = findings.length - safeCount;

  const {
    marks,
    mark,
    markMany,
    shiftForEdit,
    reset: resetMarks,
  } = useReviewMarks(diagnostic.findings, isSettled, restored?.reviewMarks ?? EMPTY_MARKS);

  const { groups, visible } = useMemo(
    () => queryFindings(diagnostic.findings, query, marks),
    [diagnostic, query, marks],
  );

  useEffect(() => {
    if (!isSettled) return;
    if (isEmpty && ledger.length === 0 && briefing === EMPTY_BRIEFING && isDefaultConfig(config)) {
      clearWorkspace();
      return;
    }
    writeWorkspace({ text, blocks: rawBlocks, ledger, mode, briefing, config, reviewMarks: marks });
  }, [isSettled, isEmpty, text, rawBlocks, ledger, mode, briefing, config, marks]);

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

  const rewriteTarget = useMemo(
    () =>
      selectedFinding && !isSafe(selectedFinding)
        ? rewriteTargetAt(diagnostic.text, selectedFinding.span.start).span
        : null,
    [selectedFinding, diagnostic],
  );

  const afterDocumentReplaced = useCallback(() => {
    clearSelection();
    resetHistory();
    setBriefing(EMPTY_BRIEFING);
    setMode("audit");
    resetMarks();
    clearFilters();
  }, [clearSelection, resetHistory, resetMarks, clearFilters]);

  const loadExample = useCallback(() => {
    loadExampleDocument();
    afterDocumentReplaced();
  }, [loadExampleDocument, afterDocumentReplaced]);

  const openDocx = useCallback(
    async (file: File) => {
      if (await importDocxFile(file)) afterDocumentReplaced();
    },
    [importDocxFile, afterDocumentReplaced],
  );

  const discardAndGoHome = useCallback(() => {
    clearWorkspace();
    clearDocument();
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

  const applyChange = useCallback(
    (entry: Omit<LedgerEntry, "burdenBefore" | "burdenAfter">, nextText: string) => {
      if (recordChange(entry, nextText)) clearSelection();
    },
    [recordChange, clearSelection],
  );

  const applyManualEdit = useCallback(
    (target: Span, replacement: string) => {
      shiftForEdit(target, replacement);
      applyChange(
        { source: "manual", label: sourceLabel("manual"), before: target.text, after: replacement },
        spliceSpan(diagnostic.text, target, replacement),
      );
    },
    [diagnostic, applyChange, shiftForEdit],
  );

  const applyRewrite = useCallback(
    (target: Span, proposal: RewriteProposal) => {
      shiftForEdit(target, proposal.proposed);
      applyChange(
        {
          source: "ai",
          label: `${sourceLabel("ai")} · ${proposal.proposerId}`,
          proposerId: proposal.proposerId,
          before: target.text,
          after: proposal.proposed,
        },
        spliceSpan(diagnostic.text, target, proposal.proposed),
      );
    },
    [diagnostic, applyChange, shiftForEdit],
  );

  const selectFinding = useCallback(
    (finding: Finding) => {
      setMode("audit");
      setCriterion(finding.criterion);
      select(finding);
    },
    [select, setCriterion],
  );

  const onFreeTypeText = useCallback(
    (value: string) => {
      noteFreeEdit();
      setText(value);
    },
    [noteFreeEdit, setText],
  );

  const panelProps = {
    diagnostic,
    findings,
    selectedFinding,
    selectedId,
    index: selectedIndex + 1,
    total: visible.length,
    safeCount,
    humanCount,
    ledger,
    blocks,
    silentCriteria,
    missingBlockKinds,
    importNotes,
    briefing,
    briefingCheck,
    onBriefingChange: setBriefing,
    config,
    onConfigChange: setConfig,
    groups,
    visible,
    query,
    marks,
    filtered,
    onToggleCriterion: toggleCriterion,
    onBucket: setBucket,
    onState: setState,
    onSearch: setSearch,
    onOrder: setOrder,
    onCriterion: setCriterion,
    onClearFilters: clearFilters,
    onMark: mark,
    onMarkMany: markMany,
    onSelect: selectFinding,
    onBackToList: clearSelection,
    onBackToOverview: () => {
      clearSelection();
      setCriterion(null);
    },
    onApplyRewrite: applyRewrite,
    onManualEdit: applyManualEdit,
    onPrev: () => goTo(-1),
    onNext: () => goTo(1),
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-desk">
      <Masthead mode={mode} onChangeMode={setMode} onOpenDocx={openDocx} onGoHome={goHome} importing={importing} />
      {importError !== null && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-sev-error/40 bg-sev-error/10 px-6 py-2 text-[12.5px] text-ink-1"
        >
          <span>{c.studio.importRefusal[importError]}</span>
          <button type="button" onClick={dismissImportError} className="text-ink-2 hover:text-ink-0">
            {c.common.close}
          </button>
        </div>
      )}

      {refusedEdit !== null && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-sev-warning/40 bg-sev-warning/10 px-6 py-2.5 text-[12.5px] text-ink-1"
        >
          <span className="min-w-0">
            {c.studio.spliceRefused[refusedEdit.reason]}{" "}
            <span className="text-ink-2">{c.studio.spliceRefusedKept}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={acceptAsPlainText}
              className="rounded-lg border border-rule-2 bg-sheet px-3 py-1.5 text-[12px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface-2"
            >
              {c.studio.spliceAcceptPlain}
            </button>
            <button
              type="button"
              onClick={discardRefusedEdit}
              className="rounded-lg px-2.5 py-1.5 text-[12px] text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink-0"
            >
              {c.studio.spliceDiscard}
            </button>
          </span>
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
            onOpenDocx={openDocx}
            onLoadExample={loadExample}
            importing={importing}
          />
        ) : (
          <DocumentView
            ref={scrollRef}
            mode={mode}
            text={text}
            diagnostic={diagnostic}
            blocks={blocks}
            selectedId={selectedId}
            flashId={flashId}
            activeCriteria={query.activeCriteria}
            rewriteTarget={rewriteTarget}
            onChangeText={onFreeTypeText}
            onSelectFinding={selectFinding}
          />
        )}

        {!isEmpty && (
          <AuditRail {...panelProps} probeExcerpt={probeExcerpt} onClearProbeExcerpt={clearProbeExcerpt} />
        )}
      </div>

      {mode === "audit" && visible.length > 0 && !sheetOpen && (
        <button
          type="button"
          onClick={revealSheet}
          className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-ink shadow-(--shadow-pop) lg:hidden"
        >
          {c.studio.revisions(visible.length)}
        </button>
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

      {canUndo && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="rise pointer-events-auto flex items-center gap-3 rounded-full border border-rule-2 bg-sheet px-4 py-2.5 shadow-(--shadow-pop)">
            <span className="inline-flex items-center gap-2 text-[13px] text-ink-1">
              <ArrowDownIcon className="size-4 text-safe" aria-hidden />
              {c.studio.changeApplied}
            </span>
            <button
              type="button"
              onClick={undo}
              className="rounded-full px-3 py-1 text-[12.5px] font-medium text-accent transition-colors duration-150 hover:bg-accent-weak"
            >
              {c.studio.undo}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
