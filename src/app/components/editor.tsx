"use client";

/**
 * O EDITOR — o documento como ARTEFATO sob inspeção, não como campo de escrita. Renderiza
 * o texto em linhas numeradas (gutter estilo editor de código) com marcadores de
 * diagnóstico na margem e sublinhados inline. A linha do diagnóstico ativo acende
 * (active-line). Uma aba superior traz o "arquivo" e o alternador auditar/editar.
 *
 * A prosa permanece serifada e arejada (iA Writer) — é um documento real; o que o cerca é
 * que é um IDE.
 */
import { forwardRef, useMemo } from "react";
import type { Diagnostic, Finding } from "@/lucid";
import { buildLines } from "../lib/editor-model";
import { findingId, metaFor, severityInkVar, severityRank, SEVERITY_LABEL } from "../lib/criteria";

export type Mode = "audit" | "edit";

interface Props {
  mode: Mode;
  text: string;
  diagnostic: Diagnostic;
  selectedId: string | null;
  flashId: string | null;
  activeLines: ReadonlySet<number>;
  activeCriteria: ReadonlySet<string>;
  onChangeText: (value: string) => void;
  onChangeMode: (mode: Mode) => void;
  onSelectFinding: (finding: Finding) => void;
}

export const Editor = forwardRef<HTMLDivElement, Props>(function Editor(
  { mode, text, diagnostic, selectedId, flashId, activeLines, activeCriteria, onChangeText, onChangeMode, onSelectFinding },
  scrollRef,
) {
  const lines = useMemo(() => buildLines(diagnostic.text, diagnostic.findings), [diagnostic]);
  const words = diagnostic.metrics.words;

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-table" aria-label="Documento sob inspeção">
      {/* aba do arquivo */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-line-1 pl-2 pr-3">
        <div className="flex h-full items-center">
          <span className="flex h-full items-center gap-2 border-b-2 border-accent px-3 text-[12px] text-fg-0">
            <span className="font-mono text-[11px] text-fg-2">documento.txt</span>
            <span className="font-mono text-[10.5px] text-fg-3">{words}w · {lines.length}L</span>
          </span>
        </div>
        <div role="tablist" aria-label="Modo" className="flex items-center gap-0.5 rounded-md border border-line-2 p-0.5">
          {(["audit", "edit"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => onChangeMode(m)}
              className={`rounded-[4px] px-2 py-0.5 text-[11px] font-medium transition-colors duration-[120ms] ${mode === m ? "bg-bg-3 text-fg-0" : "text-fg-2 hover:text-fg-1"}`}
            >
              {m === "audit" ? "auditar" : "editar"}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {mode === "edit" ? (
          <div className="mx-auto max-w-[72ch] px-8 py-10">
            <textarea
              value={text}
              onChange={(e) => onChangeText(e.target.value)}
              spellCheck={false}
              aria-label="Texto-fonte"
              className="block min-h-[70vh] w-full resize-none border-0 bg-transparent p-0 font-serif text-[17px] leading-[1.75] text-fg-0 outline-none placeholder:text-fg-3"
              style={{ caretColor: "var(--accent)" }}
              placeholder="Cole aqui o texto a auditar…"
            />
          </div>
        ) : (
          <div className="py-6">
            {lines.map((line) => {
              const active = activeLines.has(line.number);
              const marker = line.markers.length
                ? line.markers.reduce((a, b) => (severityRank(a.severity) >= severityRank(b.severity) ? a : b))
                : null;
              return (
                <div
                  key={line.number}
                  className={`line-row group grid grid-cols-[3.5rem_1fr] ${active ? "line-active" : ""}`}
                >
                  {/* gutter */}
                  <div className="relative select-none pr-3 text-right">
                    <span className={`gutter-num font-mono text-[12px] tabular-nums ${active ? "text-fg-1" : "text-fg-3"}`}>
                      {line.number}
                    </span>
                    {marker && (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`Ir ao diagnóstico na linha ${line.number}`}
                        onClick={() => onSelectFinding(marker)}
                        className="absolute right-0 top-1/2 h-3 w-[3px] -translate-y-1/2 rounded-full"
                        style={{ background: severityInkVar(marker.severity) }}
                      />
                    )}
                  </div>

                  {/* conteúdo da linha */}
                  <div className="pr-8 font-serif text-[17px] leading-[1.85] text-fg-0">
                    {line.text.length === 0 ? (
                      <span>&nbsp;</span>
                    ) : (
                      line.segments.map((seg, i) => {
                        const inline = seg.inline && activeCriteria.has(seg.inline.criterion) ? seg.inline : undefined;
                        const passage = seg.passage && activeCriteria.has("long_sentence") ? seg.passage : undefined;
                        if (!inline && !passage) return <span key={i}>{seg.text}</span>;

                        const target = inline ?? passage!;
                        const id = findingId(target);
                        const classes: string[] = [];
                        if (inline) classes.push("mark", metaFor(inline.criterion).markStyleClass);
                        if (passage) classes.push("passage");
                        if (selectedId === id) classes.push("seg-selected");
                        if (flashId === id) classes.push("seg-flash");
                        const ink = inline ? severityInkVar(inline.severity) : undefined;
                        const m = metaFor(target.criterion);

                        return (
                          <span
                            key={i}
                            role="button"
                            tabIndex={0}
                            data-finding-id={id}
                            className={classes.join(" ")}
                            style={ink ? ({ "--mark-ink": ink } as React.CSSProperties) : undefined}
                            aria-pressed={selectedId === id}
                            aria-label={`${m.label}: "${seg.text}" — princípio ${target.principle}, ${SEVERITY_LABEL[target.severity]}`}
                            onClick={() => onSelectFinding(target)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelectFinding(target);
                              }
                            }}
                          >
                            {seg.text}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
});
