"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { checkBriefing, DEFAULT_CONFIG, EMPTY_BRIEFING, isDefaultConfig, type Config, type Finding, type ReaderBriefing, type Span } from "@/lucid";
import type { RewriteProposal } from "@/report/rewrite";
import { isSafe, orderFindingsForIndex } from "./lib/criteria";
import { rewriteTargetAt } from "./lib/paragraphs";
import { spliceSpan } from "./lib/text-edit";
import { sourceLabel, type LedgerEntry } from "./lib/ledger";
import { clearWorkspace, getSaveFailed, readWorkspace, subscribeSaveStatus, writeWorkspace } from "./lib/workspace";
import { useCopy } from "./i18n/use-copy";
import { useCriterionFilter } from "./hooks/use-criterion-filter";
import { useDocumentSource } from "./hooks/use-document-source";
import { useFindingNavigation } from "./hooks/use-finding-navigation";
import { useRevisionHistory } from "./hooks/use-revision-history";
import { Masthead } from "./components/masthead";
import { DocumentView, type Mode } from "./components/document-view";
import { AuditRail } from "./components/audit-rail";
import { RevisionSheet } from "./components/revision-sheet";
import { Welcome } from "./components/welcome";
import { ArrowDownIcon } from "./components/icons";

export function Studio() {
  const { c } = useCopy();
  const [restored] = useState(readWorkspace);
  const [mode, setMode] = useState<Mode>(restored?.mode ?? "audit");
  const [briefing, setBriefing] = useState<ReaderBriefing>(restored?.briefing ?? EMPTY_BRIEFING);
  const [config, setConfig] = useState<Config>(restored?.config ?? DEFAULT_CONFIG);
  const [sheetOpen, setSheetOpen] = useState(false);
  const saveFailed = useSyncExternalStore(subscribeSaveStatus, getSaveFailed, () => false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    text,
    setText,
    diagnostic,
    blocks,
    rawBlocks,
    isEmpty,
    isSettled,
    importing,
    importError,
    dismissImportError,
    structureLost,
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

  useEffect(() => {
    if (!isSettled) return;
    if (isEmpty && ledger.length === 0 && briefing === EMPTY_BRIEFING && isDefaultConfig(config)) {
      clearWorkspace();
      return;
    }
    writeWorkspace({ text, blocks: rawBlocks, ledger, mode, briefing, config });
  }, [isSettled, isEmpty, text, rawBlocks, ledger, mode, briefing, config]);

  const briefingCheck = useMemo(() => checkBriefing(diagnostic.text, briefing), [diagnostic, briefing]);

  const { activeCriteria, toggleCriterion, bucket, setBucket } = useCriterionFilter();

  const findings = useMemo(
    () => orderFindingsForIndex(diagnostic.findings.filter((f) => activeCriteria.has(f.criterion))),
    [diagnostic, activeCriteria],
  );
  const safeCount = useMemo(() => findings.filter(isSafe).length, [findings]);
  const humanCount = findings.length - safeCount;

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
    findings,
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
  }, [clearSelection, resetHistory]);

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

  const goHome = useCallback(() => {
    if (isEmpty && mode === "audit") return;
    if (!isEmpty && !window.confirm(c.studio.goHomeConfirm)) return;
    clearWorkspace();
    clearDocument();
    afterDocumentReplaced();
  }, [isEmpty, mode, clearDocument, afterDocumentReplaced, c]);

  const applyChange = useCallback(
    (entry: Omit<LedgerEntry, "burdenBefore" | "burdenAfter">, nextText: string) => {
      if (recordChange(entry, nextText)) clearSelection();
    },
    [recordChange, clearSelection],
  );

  const applyManualEdit = useCallback(
    (target: Span, replacement: string) =>
      applyChange(
        { source: "manual", label: sourceLabel("manual"), before: target.text, after: replacement },
        spliceSpan(diagnostic.text, target, replacement),
      ),
    [diagnostic, applyChange],
  );

  const applyRewrite = useCallback(
    (target: Span, proposal: RewriteProposal) =>
      applyChange(
        {
          source: "ai",
          label: `${sourceLabel("ai")} · ${proposal.proposerId}`,
          proposerId: proposal.proposerId,
          before: target.text,
          after: proposal.proposed,
        },
        spliceSpan(diagnostic.text, target, proposal.proposed),
      ),
    [diagnostic, applyChange],
  );

  const selectFinding = useCallback(
    (finding: Finding) => {
      setMode("audit");
      select(finding);
    },
    [select],
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
    total: findings.length,
    safeCount,
    humanCount,
    ledger,
    blocks,
    briefing,
    briefingCheck,
    onBriefingChange: setBriefing,
    config,
    onConfigChange: setConfig,
    activeCriteria,
    bucket,
    onToggleCriterion: toggleCriterion,
    onBucket: setBucket,
    onSelect: selectFinding,
    onApplyRewrite: applyRewrite,
    onManualEdit: applyManualEdit,
    onPrev: () => goTo(-1),
    onNext: () => goTo(1),
    onClose: clearSelection,
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-desk">
      <Masthead mode={mode} onChangeMode={setMode} onOpenDocx={openDocx} onGoHome={goHome} importing={importing} />
      {importError !== null && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-sev-error/40 bg-sev-error/10 px-6 py-2 text-[12.5px] text-ink-1"
        >
          <span>{c.studio.importUnreadable}</span>
          <button type="button" onClick={dismissImportError} className="text-ink-2 hover:text-ink-0">
            {c.common.close}
          </button>
        </div>
      )}

      {structureLost && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 border-b border-sev-warning/40 bg-sev-warning/10 px-6 py-2 text-[12.5px] text-ink-1"
        >
          <span>{c.studio.structureLost}</span>
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
            activeCriteria={activeCriteria}
            rewriteTarget={rewriteTarget}
            onChangeText={onFreeTypeText}
            onSelectFinding={selectFinding}
          />
        )}

        {!isEmpty && <AuditRail {...panelProps} text={text} />}
      </div>

      {mode === "audit" && findings.length > 0 && !sheetOpen && (
        <button
          type="button"
          onClick={revealSheet}
          className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-ink shadow-(--shadow-pop) lg:hidden"
        >
          {c.studio.revisions(findings.length)}
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
