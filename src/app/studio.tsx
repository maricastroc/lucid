"use client";

/**
 * Studio — orquestrador da mesa de revisão. Único ponto que chama `analyze()`: a UI é
 * consumidora pura da Camada 1. Compõe o masthead, o documento (protagonista) e o trilho
 * editorial (visão geral ⇄ nota de um diagnóstico + lista de revisões).
 *
 * Selecionar um diagnóstico sincroniza tudo: acende o trecho na página, rola-o à vista
 * com um flash curto, faz a página recuar (modo lupa) e abre a nota dedicada. j/k (↑/↓)
 * percorrem as revisões; Esc fecha. "Aplicar as seguras" resolve num passo o que é
 * mecanicamente seguro; o resto, honestamente, fica com o autor. No mobile, a nota e a
 * lista vivem num bottom sheet.
 */
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { analyze, type Finding } from "@/lucid";
import { findingId, isSafe } from "./lib/criteria";
import { applySafeSuggestions } from "./lib/audit";
import { SAMPLE_TEXT } from "./lib/sample";
import { Masthead } from "./components/masthead";
import { DocumentView, type Mode } from "./components/document-view";
import { AuditRail, NoteNav, RailFooter } from "./components/audit-rail";
import { AuditOverview } from "./components/audit-overview";
import { RevisionList, type Bucket } from "./components/revision-list";
import { RevisionNote } from "./components/revision-note";
import { ArrowDownIcon } from "./components/icons";

export function Studio() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [mode, setMode] = useState<Mode>("audit");
  const [activeCriteria, setActiveCriteria] = useState<ReadonlySet<string>>(
    new Set(["passive_voice", "nominalization", "jargon", "long_sentence"]),
  );
  const [selectedIdRaw, setSelectedId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  const undoStack = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const deferredText = useDeferredValue(text);
  const diagnostic = useMemo(() => analyze(deferredText), [deferredText]);

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

  // Sincroniza a página com a seleção: rola o trecho à vista + flash curto.
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

  // As sugestões são aplicadas sobre `text` (o estado atual no clique), com o registro do
  // undo FORA do updater de `setText` — um updater tem de ser puro, e mutar o histórico lá
  // dentro duplicaria o registro sob o double-invoke do Strict Mode.
  const applySuggestion = useCallback(
    (finding: Finding) => {
      if (finding.suggestion === undefined) return;
      pushUndo(text);
      setText(text.slice(0, finding.span.start) + finding.suggestion + text.slice(finding.span.end));
      setSelectedId(null);
    },
    [text, pushUndo],
  );

  const applyAllSafe = useCallback(() => {
    const applicable = analyze(text).findings.filter((f) => activeCriteria.has(f.criterion) && isSafe(f));
    const next = applySafeSuggestions(text, applicable);
    if (next !== text) {
      pushUndo(text);
      setText(next);
    }
    setSelectedId(null);
  }, [text, pushUndo, activeCriteria]);

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (previous === undefined) return;
    setText(previous);
    setCanUndo(undoStack.current.length > 0);
  }, []);

  const railProps = {
    diagnostic,
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
    onApplyAllSafe: applyAllSafe,
    onApply: applySuggestion,
    onPrev: () => goTo(-1),
    onNext: () => goTo(1),
    onClose: closeSelection,
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-desk">
      <Masthead mode={mode} onChangeMode={setMode} />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <DocumentView
          ref={scrollRef}
          mode={mode}
          text={text}
          diagnostic={diagnostic}
          selectedId={selectedId}
          flashId={flashId}
          activeCriteria={activeCriteria}
          onChangeText={setText}
          onSelectFinding={selectFinding}
        />

        {/* Desktop: coluna editorial fixa */}
        <AuditRail {...railProps} />
      </div>

      {/* Mobile: botão flutuante que abre o bottom sheet de revisões */}
      {mode === "audit" && findings.length > 0 && !sheetOpen && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-ink shadow-[var(--shadow-pop)] lg:hidden"
        >
          {findings.length} {findings.length === 1 ? "revisão" : "revisões"}
        </button>
      )}

      {/* Mobile: bottom sheet (nota ou visão geral + lista) */}
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
          <div className="sheet-up absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-hidden rounded-t-[20px] border-t border-rule-2 bg-surface shadow-[var(--shadow-pop)]">
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
                  <RevisionNote finding={selectedFinding} onApply={applySuggestion} />
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <AuditOverview
                  diagnostic={diagnostic}
                  findings={findings}
                  safeCount={safeCount}
                  humanCount={humanCount}
                  activeCriteria={activeCriteria}
                  onToggleCriterion={toggleCriterion}
                  onApplyAllSafe={applyAllSafe}
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

      {/* Desfazer */}
      {canUndo && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="rise pointer-events-auto flex items-center gap-3 rounded-full border border-rule-2 bg-sheet px-4 py-2.5 shadow-[var(--shadow-pop)]">
            <span className="inline-flex items-center gap-2 text-[13px] text-ink-1">
              <ArrowDownIcon className="size-4 text-safe" aria-hidden />
              Sugestão aplicada ao texto.
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
