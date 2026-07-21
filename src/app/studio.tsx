"use client";

/**
 * Studio — orquestrador do "IDE de linguagem". Único ponto que chama `analyze()`: a UI é
 * consumidora pura da Camada 1. Compõe as zonas: barra de título, editor (artefato sob
 * inspeção), inspetor (o centro — visão geral ⇄ investigação de um diagnóstico), painel
 * Problems (diagnósticos) e status bar (instrumentação).
 *
 * Selecionar um diagnóstico sincroniza tudo: acende a linha no editor, rola o trecho à
 * vista com flash, e o inspetor vira a investigação daquele caso. j/k (↑/↓) percorrem os
 * diagnósticos; Esc fecha. "aplicar N seguras" resolve num passo o que é mecanicamente
 * seguro; o resto, honestamente, fica para o autor.
 */
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { analyze, type Finding } from "@/lucid";
import { findingId } from "./lib/criteria";
import { applySafeSuggestions } from "./lib/audit";
import { offsetToLineCol } from "./lib/editor-model";
import { SAMPLE_TEXT } from "./lib/sample";
import { TitleBar } from "./components/title-bar";
import { Editor, type Mode } from "./components/editor";
import { Inspector } from "./components/inspector";
import { ProblemsPanel, type Bucket } from "./components/problems-panel";
import { StatusBar } from "./components/status-bar";

export function Studio() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [mode, setMode] = useState<Mode>("audit");
  const [activeCriteria, setActiveCriteria] = useState<ReadonlySet<string>>(
    new Set(["passive_voice", "nominalization", "jargon", "long_sentence"]),
  );
  const [selectedIdRaw, setSelectedId] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket>("all");

  const undoStack = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const deferredText = useDeferredValue(text);
  const diagnostic = useMemo(() => analyze(deferredText), [deferredText]);

  const findings = useMemo(
    () => diagnostic.findings.filter((f) => activeCriteria.has(f.criterion)),
    [diagnostic, activeCriteria],
  );

  const resolvableCount = useMemo(() => findings.filter((f) => f.suggestion !== undefined).length, [findings]);
  const humanCount = findings.length - resolvableCount;

  const selectedId = useMemo(
    () => (selectedIdRaw && findings.some((f) => findingId(f) === selectedIdRaw) ? selectedIdRaw : null),
    [selectedIdRaw, findings],
  );
  const selectedIndex = selectedId ? findings.findIndex((f) => findingId(f) === selectedId) : -1;
  const selectedFinding = selectedIndex >= 0 ? findings[selectedIndex] : null;

  const activeLines = useMemo(() => {
    if (!selectedFinding) return new Set<number>();
    const from = offsetToLineCol(diagnostic.text, selectedFinding.span.start).line;
    const to = offsetToLineCol(diagnostic.text, Math.max(selectedFinding.span.start, selectedFinding.span.end - 1)).line;
    const set = new Set<number>();
    for (let l = from; l <= to; l++) set.add(l);
    return set;
  }, [selectedFinding, diagnostic.text]);

  // Sincroniza editor com a seleção: rola o trecho à vista + flash curto.
  useEffect(() => {
    if (!selectedId || mode !== "audit") return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-finding-id="${cssEscape(selectedId)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(selectedId);
    const t = window.setTimeout(() => setFlashId(null), 640);
    return () => window.clearTimeout(t);
  }, [selectedId, mode, diagnostic]);

  const selectFinding = useCallback((finding: Finding) => {
    setMode("audit");
    setSelectedId(findingId(finding));
  }, []);

  const goTo = useCallback(
    (delta: number) => {
      if (findings.length === 0) return;
      const from = selectedIndex < 0 ? (delta > 0 ? -1 : 0) : selectedIndex;
      const next = (from + delta + findings.length) % findings.length;
      setSelectedId(findingId(findings[next]));
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
      setText((current) => {
        pushUndo(current);
        return current.slice(0, finding.span.start) + finding.suggestion + current.slice(finding.span.end);
      });
      setSelectedId(null);
    },
    [pushUndo],
  );

  const applyAllSafe = useCallback(() => {
    setText((current) => {
      const applicable = analyze(current).findings.filter((f) => activeCriteria.has(f.criterion));
      const next = applySafeSuggestions(current, applicable);
      if (next !== current) pushUndo(current);
      return next;
    });
    setSelectedId(null);
  }, [pushUndo, activeCriteria]);

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (previous === undefined) return;
    setText(previous);
    setCanUndo(undoStack.current.length > 0);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TitleBar />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Editor
          ref={scrollRef}
          mode={mode}
          text={text}
          diagnostic={diagnostic}
          selectedId={selectedId}
          flashId={flashId}
          activeLines={activeLines}
          activeCriteria={activeCriteria}
          onChangeText={setText}
          onChangeMode={setMode}
          onSelectFinding={selectFinding}
        />
        <Inspector
          diagnostic={diagnostic}
          selectedFinding={selectedFinding}
          index={selectedIndex + 1}
          total={findings.length}
          activeCriteria={activeCriteria}
          onToggleCriterion={toggleCriterion}
          onPrev={() => goTo(-1)}
          onNext={() => goTo(1)}
          onClose={() => setSelectedId(null)}
          onApply={applySuggestion}
        />
      </div>

      <ProblemsPanel
        diagnostic={diagnostic}
        findings={findings}
        selectedId={selectedId}
        bucket={bucket}
        resolvableCount={resolvableCount}
        humanCount={humanCount}
        onBucket={setBucket}
        onSelect={selectFinding}
        onApplyAllSafe={applyAllSafe}
      />

      <StatusBar diagnostic={diagnostic} selectedFinding={selectedFinding} />

      {canUndo && (
        <div className="pointer-events-none fixed inset-x-0 bottom-9 flex justify-center">
          <div className="rise pointer-events-auto flex items-center gap-3 rounded-lg border border-line-2 bg-bg-1 px-3 py-2 shadow-[var(--shadow-pop)]">
            <span className="text-[12.5px] text-fg-1">Texto alterado pela sugestão.</span>
            <button
              type="button"
              onClick={undo}
              className="rounded-[4px] px-2 py-1 font-mono text-[11px] text-accent transition-colors duration-[120ms] hover:bg-accent-weak"
            >
              desfazer
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
