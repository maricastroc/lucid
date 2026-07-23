"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  analyze,
  analyzeDocument,
  ptDocumentServices,
  type Document,
  type Finding,
  type Span,
} from "@/lucid";
import type { RewriteProposal } from "@/report/rewrite";
import { CRITERION_ORDER, findingId, isSafe } from "./lib/criteria";
import { rewriteTargetAt } from "./lib/paragraphs";
import { spliceSpan } from "./lib/text-edit";
import { documentBurden, sourceLabel, type LedgerEntry } from "./lib/ledger";
import { SAMPLE_TEXT } from "./lib/sample";
import { Masthead } from "./components/masthead";
import { DocumentView, type Mode } from "./components/document-view";
import { AuditRail, NoteNav, RailFooter } from "./components/audit-rail";
import { AuditOverview } from "./components/audit-overview";
import { RevisionList, type Bucket } from "./components/revision-list";
import { RevisionNote } from "./components/revision-note";
import { Welcome } from "./components/welcome";
import { ArrowDownIcon } from "./components/icons";

export function Studio() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("audit");
  const [activeCriteria, setActiveCriteria] = useState<ReadonlySet<string>>(new Set(CRITERION_ORDER));
  const [selectedIdRaw, setSelectedId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  const undoStack = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [importedDoc, setImportedDoc] = useState<Document | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const deferredText = useDeferredValue(text);
  const structured = importedDoc !== null && deferredText === importedDoc.source;
  const diagnostic = useMemo(
    () => (structured ? analyzeDocument(importedDoc!) : analyze(deferredText)),
    [structured, importedDoc, deferredText],
  );
  const blocks = structured ? importedDoc!.blocks : null;
  const isEmpty = text.trim() === "" && importedDoc === null;

  // Trocar de documento tem que zerar o histórico de undo e a trilha de revisão
  // (ADR-018) — do contrário undo aplica snapshot do documento ANTERIOR sobre o
  // novo, e o relatório de auditoria carrega proveniência de um texto diferente.
  const resetDocumentState = useCallback(() => {
    undoStack.current = [];
    setCanUndo(false);
    setLedger([]);
  }, []);

  const loadExample = useCallback(() => {
    setImportedDoc(null);
    setText(SAMPLE_TEXT);
    setSelectedId(null);
    setMode("audit");
    resetDocumentState();
  }, [resetDocumentState]);

  const goHome = useCallback(() => {
    const alreadyHome = isEmpty && mode === "audit";
    if (alreadyHome) return;
    if (!isEmpty && !window.confirm("Voltar ao início? O texto atual não fica salvo.")) return;
    setImportedDoc(null);
    setText("");
    setSelectedId(null);
    setMode("audit");
    resetDocumentState();
  }, [isEmpty, mode, resetDocumentState]);

  const openDocx = useCallback(async (file: File) => {
    setImporting(true);
    setImportError(null);
    try {
      const bytes = await file.arrayBuffer();

      const { importDocx } = await import("@/importers/docx");
      const doc = await importDocx(bytes, ptDocumentServices);
      setImportedDoc(doc);
      setText(doc.source);
      setSelectedId(null);
      setMode("audit");
      resetDocumentState();
    } catch {
      setImportError("Não foi possível ler o arquivo. Confirme que é um .docx válido.");
    } finally {
      setImporting(false);
    }
  }, [resetDocumentState]);

  const findings = useMemo(
    () => diagnostic.findings.filter((f) => activeCriteria.has(f.criterion)),
    [diagnostic, activeCriteria],
  );

  const safeCount = useMemo(() => findings.filter(isSafe).length, [findings]);
  const humanCount = findings.length - safeCount;

  const selectedId = useMemo(
    () => (selectedIdRaw && findings.some((f) => findingId(f) === selectedIdRaw) ? selectedIdRaw : null),
    [selectedIdRaw, findings],
  );
  const selectedIndex = selectedId ? findings.findIndex((f) => findingId(f) === selectedId) : -1;
  const selectedFinding = selectedIndex >= 0 ? findings[selectedIndex] : null;

  const rewriteTarget = useMemo(
    () =>
      selectedFinding && !isSafe(selectedFinding)
        ? rewriteTargetAt(diagnostic.text, selectedFinding.span.start).span
        : null,
    [selectedFinding, diagnostic],
  );

  useEffect(() => {
    if (!selectedId || mode !== "audit") return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-finding-id="${cssEscape(selectedId)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(selectedId);
    const t = window.setTimeout(() => setFlashId(null), 660);
    return () => window.clearTimeout(t);
  }, [selectedId, mode, diagnostic]);

  const selectFinding = useCallback((finding: Finding) => {
    setMode("audit");
    setSelectedId(findingId(finding));
    setSheetOpen(true);
  }, []);

  const closeSelection = useCallback(() => setSelectedId(null), []);

  const goTo = useCallback(
    (delta: number) => {
      if (findings.length === 0) return;
      const from = selectedIndex < 0 ? (delta > 0 ? -1 : 0) : selectedIndex;
      const next = (from + delta + findings.length) % findings.length;
      setSelectedId(findingId(findings[next]));
      setSheetOpen(true);
    },
    [findings, selectedIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) return;
      if (mode !== "audit") return;
      if (e.key === "Escape") return setSelectedId(null);
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        goTo(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        goTo(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, mode]);

  const toggleCriterion = useCallback((criterion: string) => {
    setActiveCriteria((prev) => {
      const next = new Set(prev);
      if (next.has(criterion)) next.delete(criterion);
      else next.add(criterion);
      return next;
    });
  }, []);

  const pushUndo = useCallback((current: string) => {
    undoStack.current.push(current);
    setCanUndo(true);
  }, []);

  const applyingRef = useRef(false);
  useEffect(() => {
    applyingRef.current = false;
  }, [text]);

  const applyChange = useCallback(
    (entry: Omit<LedgerEntry, "burdenBefore" | "burdenAfter">, nextText: string) => {
      if (applyingRef.current) return;
      if (deferredText !== text) return;
      if (nextText === text) return;
      applyingRef.current = true;
      // burdenAfter só existe no modo plano (a edição sempre destrutura o doc
      // importado — nextText nunca volta a bater com importedDoc.source). Medir
      // burdenBefore com o mesmo analyzer plano evita comparar bases diferentes
      // (estruturado vs. plano) e um delta de peso que não reflete o que mudou (M5).
      const burdenBefore = documentBurden(analyze(text).findings);
      const burdenAfter = documentBurden(analyze(nextText).findings);
      pushUndo(text);
      setLedger((prev) => [...prev, { ...entry, burdenBefore, burdenAfter }]);
      setText(nextText);
      setSelectedId(null);
    },
    [text, deferredText, pushUndo],
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
        { source: "ai", label: `${sourceLabel("ai")} · ${proposal.proposerId}`, before: target.text, after: proposal.proposed },
        spliceSpan(diagnostic.text, target, proposal.proposed),
      ),
    [diagnostic, applyChange],
  );

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (previous === undefined) return;
    setText(previous);
    setLedger((prev) => prev.slice(0, -1));
    setCanUndo(undoStack.current.length > 0);
  }, []);

  // Digitação livre não passa por pushUndo — o snapshot no topo da pilha vira
  // stale (desfazer descartaria o que foi digitado depois, sem aviso). Em vez de
  // arriscar essa perda silenciosa, invalidamos o undo assim que o texto muda por
  // fora do fluxo rastreado (M4): o "Desfazer" some, a digitação nunca é jogada fora.
  const onFreeTypeText = useCallback((value: string) => {
    if (undoStack.current.length > 0) {
      undoStack.current = [];
      setCanUndo(false);
    }
    setText(value);
  }, []);

  const railProps = {
    diagnostic,
    text,
    findings,
    selectedFinding,
    selectedId,
    index: selectedIndex + 1,
    total: findings.length,
    safeCount,
    humanCount,
    activeCriteria,
    bucket,
    onToggleCriterion: toggleCriterion,
    onBucket: setBucket,
    onSelect: selectFinding,
    onApplyRewrite: applyRewrite,
    onManualEdit: applyManualEdit,
    ledger,
    onPrev: () => goTo(-1),
    onNext: () => goTo(1),
    onClose: closeSelection,
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-desk">
      <Masthead mode={mode} onChangeMode={setMode} onOpenDocx={openDocx} onGoHome={goHome} importing={importing} />
      {importError !== null && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-sev-error/40 bg-sev-error/10 px-6 py-2 text-[12.5px] text-ink-1"
        >
          <span>{importError}</span>
          <button type="button" onClick={() => setImportError(null)} className="text-ink-2 hover:text-ink-0">
            Fechar
          </button>
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

        {!isEmpty && <AuditRail {...railProps} />}
      </div>

      {mode === "audit" && findings.length > 0 && !sheetOpen && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-ink shadow-(--shadow-pop) lg:hidden"
        >
          {findings.length} {findings.length === 1 ? "revisão" : "revisões"}
        </button>
      )}

      {mode === "audit" && sheetOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Revisões">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => {
              setSheetOpen(false);
              setSelectedId(null);
            }}
            className="absolute inset-0 bg-ink-0/25 backdrop-blur-[2px]"
          />
          <div className="sheet-up absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-hidden rounded-t-[20px] border-t border-rule-2 bg-surface shadow-(--shadow-pop)">
            <button
              type="button"
              aria-label="Recolher"
              onClick={() => {
                setSheetOpen(false);
                setSelectedId(null);
              }}
              className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-rule-3"
            />
            {selectedFinding ? (
              <>
                <NoteNav
                  index={selectedIndex + 1}
                  total={findings.length}
                  onPrev={() => goTo(-1)}
                  onNext={() => goTo(1)}
                  onClose={closeSelection}
                />
                <div key={selectedId ?? "note"} className="min-h-0 flex-1 overflow-y-auto">
                  <RevisionNote
                    finding={selectedFinding}
                    source={diagnostic.text}
                    onApplyRewrite={applyRewrite}
                    onManualEdit={applyManualEdit}
                  />
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <AuditOverview
                  diagnostic={diagnostic}
                  findings={findings}
                  safeCount={safeCount}
                  humanCount={humanCount}
                  ledger={ledger}
                  activeCriteria={activeCriteria}
                  onToggleCriterion={toggleCriterion}
                />
                <RevisionList
                  findings={findings}
                  selectedId={selectedId}
                  bucket={bucket}
                  safeCount={safeCount}
                  humanCount={humanCount}
                  onBucket={setBucket}
                  onSelect={selectFinding}
                />
              </div>
            )}
            <RailFooter diagnostic={diagnostic} />
          </div>
        </div>
      )}

      {canUndo && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="rise pointer-events-auto flex items-center gap-3 rounded-full border border-rule-2 bg-sheet px-4 py-2.5 shadow-(--shadow-pop)">
            <span className="inline-flex items-center gap-2 text-[13px] text-ink-1">
              <ArrowDownIcon className="size-4 text-safe" aria-hidden />
              Alteração aplicada ao texto.
            </span>
            <button
              type="button"
              onClick={undo}
              className="rounded-full px-3 py-1 text-[12.5px] font-medium text-accent transition-colors duration-150 hover:bg-accent-weak"
            >
              Desfazer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function cssEscape(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}
