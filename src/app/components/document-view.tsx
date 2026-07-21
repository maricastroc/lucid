"use client";

import { forwardRef, useMemo } from "react";
import type { Diagnostic, Finding, Span } from "@/lucid";
import { buildLines } from "../lib/editor-model";
import { findingId, metaFor, severityInkVar, severityRank, SEVERITY_LABEL } from "../lib/criteria";

export type Mode = "audit" | "edit";

interface Props {
  mode: Mode;
  text: string;
  diagnostic: Diagnostic;
  selectedId: string | null;
  flashId: string | null;
  activeCriteria: ReadonlySet<string>;
  rewriteTarget: Span | null;
  onChangeText: (value: string) => void;
  onSelectFinding: (finding: Finding) => void;
}

export const DocumentView = forwardRef<HTMLDivElement, Props>(function DocumentView(
  { mode, text, diagnostic, selectedId, flashId, activeCriteria, rewriteTarget, onChangeText, onSelectFinding },
  scrollRef,
) {
  const lines = useMemo(() => buildLines(diagnostic.text, diagnostic.findings), [diagnostic]);
  const paragraphs = useMemo(() => lines.filter((l) => l.text.trim().length > 0), [lines]);
  const words = diagnostic.metrics.words;
  const isFocused = mode === "audit" && selectedId !== null;

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-desk" aria-label="Documento em revisão">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-210 px-4 py-8 sm:px-8 sm:py-12 lg:py-16">
          <div className="overflow-hidden rounded-xl border border-rule-1 bg-sheet shadow-(--shadow-sheet)">
            <div className="flex items-center justify-between border-b border-rule-1 px-8 py-3.5 sm:px-14">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-3">
                {mode === "edit" ? "Rascunho" : "Documento em revisão"}
              </span>
              <span className="text-[12px] tabular-nums text-ink-3">{words} palavras</span>
            </div>

            {mode === "edit" ? (
              <div className="px-6 py-8 sm:px-14 sm:py-12">
                <textarea
                  value={text}
                  onChange={(e) => onChangeText(e.target.value)}
                  spellCheck={false}
                  aria-label="Texto do documento"
                  className="prose-doc block min-h-[62vh] w-full resize-none border-0 bg-transparent p-0 outline-none placeholder:text-ink-3"
                  style={{ caretColor: "var(--accent)" }}
                  placeholder="Cole ou escreva aqui o texto a revisar…"
                />
              </div>
            ) : (
              <article
                className={`prose-doc px-6 py-8 sm:px-14 sm:py-12 ${isFocused ? "is-focused" : ""}`}
              >
                {paragraphs.map((para) => {
                  const activeMarkers = para.markers.filter((m) => activeCriteria.has(m.criterion));
                  const tick = activeMarkers.length
                    ? activeMarkers.reduce((a, b) => (severityRank(a.severity) >= severityRank(b.severity) ? a : b))
                    : null;
                  const holdsSelected = activeMarkers.some((m) => findingId(m) === selectedId);

                  return (
                    <p key={para.number} className="relative">
                      {tick && (
                        <span
                          aria-hidden
                          className="margin-tick absolute -left-4 top-[0.5em] hidden h-[1.1em] w-0.75 rounded-full sm:block"
                          style={{
                            background: holdsSelected ? "var(--accent)" : severityInkVar(tick.severity),
                            opacity: holdsSelected ? 1 : isFocused ? 0.18 : 0.4,
                            transform: holdsSelected ? "scaleY(1.15)" : "scaleY(1)",
                          }}
                        />
                      )}
                      {para.text.length === 0 ? (
                        <span>&nbsp;</span>
                      ) : (
                        para.segments.map((seg, i) => {
                          const inline = seg.inline && activeCriteria.has(seg.inline.criterion) ? seg.inline : undefined;
                          const passage =
                            seg.passage && activeCriteria.has("long_sentence") ? seg.passage : undefined;
                          const inTarget =
                            rewriteTarget !== null &&
                            seg.start >= rewriteTarget.start &&
                            seg.end <= rewriteTarget.end;

                          if (!inline && !passage) {
                            return (
                              <span key={i} className={inTarget ? "seg rewrite-target" : "seg"}>
                                {seg.text}
                              </span>
                            );
                          }

                          const target = inline ?? passage!;
                          const id = findingId(target);
                          const selected = selectedId === id;
                          const meta = metaFor(target.criterion);
                          const classes = ["seg"];
                          if (inTarget) classes.push("rewrite-target");
                          if (inline) classes.push("mark", meta.markStyleClass);
                          if (passage) classes.push("passage");
                          if (selected) classes.push("seg-selected", "is-lit");
                          if (flashId === id) classes.push("seg-flash");
                          const ink = inline ? severityInkVar(inline.severity) : undefined;

                          return (
                            <span
                              key={i}
                              role="button"
                              tabIndex={0}
                              data-finding-id={id}
                              className={classes.join(" ")}
                              style={ink ? ({ "--mark-ink": ink } as React.CSSProperties) : undefined}
                              aria-pressed={selected}
                              aria-label={`${meta.label}: “${seg.text.trim()}”. ${SEVERITY_LABEL[target.severity]}.`}
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
                    </p>
                  );
                })}
              </article>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});
