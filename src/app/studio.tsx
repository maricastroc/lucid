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
import {
  analyze,
  analyzeDocument,
  applySplitAt,
  ptDocumentServices,
  type Document,
  type Finding,
  type Span,
  type SplitPoint,
} from "@/lucid";
import type { RewriteProposal } from "@/report/rewrite";
import { CRITERION_ORDER, findingId, isSafe } from "./lib/criteria";
import { rewriteTargetAt } from "./lib/paragraphs";
import { spliceSpan } from "./lib/text-edit";
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
  const [activeCriteria, setActiveCriteria] = useState<ReadonlySet<string>>(new Set(CRITERION_ORDER));
  const [selectedIdRaw, setSelectedId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  const undoStack = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Documento IMPORTADO (ADR-039/040): quando um `.docx` é aberto, guardamos o `Document`
  // ESTRUTURADO e o analisamos com `analyzeDocument` (headings/listas preservados). Assim que o
  // autor edita (o texto diverge de `doc.source`), voltamos à análise de texto puro — editar à mão
  // naturalmente perde a estrutura do arquivo.
  const [importedDoc, setImportedDoc] = useState<Document | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const deferredText = useDeferredValue(text);
  // Enquanto o texto casa com o do arquivo importado, analisamos o `Document` ESTRUTURADO e
  // expomos seus blocos ao render (títulos/listas destacados). Ao editar à mão, o texto diverge de
  // `doc.source` → voltamos ao texto puro (blocos = null) e o render por linhas assume.
  const structured = importedDoc !== null && deferredText === importedDoc.source;
  const diagnostic = useMemo(
    () => (structured ? analyzeDocument(importedDoc!) : analyze(deferredText)),
    [structured, importedDoc, deferredText],
  );
  const blocks = structured ? importedDoc!.blocks : null;

  const openDocx = useCallback(async (file: File) => {
    setImporting(true);
    setImportError(null);
    try {
      const bytes = await file.arrayBuffer();
      // Import dinâmico: o mammoth só entra no bundle do cliente quando um .docx é aberto.
      const { importDocx } = await import("@/importers/docx");
      const doc = await importDocx(bytes, ptDocumentServices);
      setImportedDoc(doc);
      setText(doc.source);
      setSelectedId(null);
      setMode("audit");
    } catch {
      setImportError("Não foi possível ler o arquivo. Confirme que é um .docx válido.");
    } finally {
      setImporting(false);
    }
  }, []);

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

  const applySuggestion = useCallback(
    (finding: Finding) => {
      if (finding.suggestion === undefined) return;
      pushUndo(text);
      setText(text.slice(0, finding.span.start) + finding.suggestion + text.slice(finding.span.end));
      setSelectedId(null);
    },
    [text, pushUndo],
  );

  const applySplit = useCallback(
    (point: SplitPoint) => {
      const next = applySplitAt(text, point);
      if (next !== text) {
        pushUndo(text);
        setText(next);
      }
      setSelectedId(null);
    },
    [text, pushUndo],
  );

  // Máquina ÚNICA de aplicação: substitui um span do texto por uma string, empilha o desfazer e
  // re-analisa (via setText). É o mesmo mecanismo para as três origens do "novo texto" — a ação
  // mecânica (voz ativa), a proposta da LLM (Tier 3) e a EDIÇÃO À MÃO do autor. A engine é quem
  // re-audita o resultado; a UI nunca decide clareza.
  const replaceSpan = useCallback(
    (target: Span, replacement: string) => {
      const next = spliceSpan(diagnostic.text, target, replacement);
      if (next !== text) {
        pushUndo(text);
        setText(next);
      }
      setSelectedId(null);
    },
    [text, diagnostic, pushUndo],
  );

  const applyRewrite = useCallback(
    (target: Span, proposal: RewriteProposal) => replaceSpan(target, proposal.proposed),
    [replaceSpan],
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
    onApplyAllSafe: applyAllSafe,
    onApply: applySuggestion,
    onSplit: applySplit,
    onApplyRewrite: applyRewrite,
    onPassiveActive: replaceSpan,
    onManualEdit: replaceSpan,
    onPrev: () => goTo(-1),
    onNext: () => goTo(1),
    onClose: closeSelection,
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-desk">
      <Masthead mode={mode} onChangeMode={setMode} onOpenDocx={openDocx} importing={importing} />
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
          onChangeText={setText}
          onSelectFinding={selectFinding}
        />

        <AuditRail {...railProps} />
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
                    onApply={applySuggestion}
                    onSplit={applySplit}
                    onApplyRewrite={applyRewrite}
                    onPassiveActive={replaceSpan}
                    onManualEdit={replaceSpan}
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

      {canUndo && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="rise pointer-events-auto flex items-center gap-3 rounded-full border border-rule-2 bg-sheet px-4 py-2.5 shadow-(--shadow-pop)">
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
