"use client";

import { forwardRef, useMemo } from "react";
import type { Block, Diagnostic, Finding, Span } from "@/lucid";
import { buildLines, segmentRange, type LineSegment } from "../lib/editor-model";
import { findingId, metaFor, severityInkVar, severityRank, SEVERITY_LABEL } from "../lib/criteria";
import { PenNibIcon } from "./icons";

export type Mode = "audit" | "edit";

interface Props {
  mode: Mode;
  text: string;
  diagnostic: Diagnostic;
  blocks: readonly Block[] | null;
  selectedId: string | null;
  flashId: string | null;
  activeCriteria: ReadonlySet<string>;
  rewriteTarget: Span | null;
  onChangeText: (value: string) => void;
  onSelectFinding: (finding: Finding) => void;
}

interface SegmentContext {
  selectedId: string | null;
  flashId: string | null;
  activeCriteria: ReadonlySet<string>;
  rewriteTarget: Span | null;
  onSelectFinding: (finding: Finding) => void;
}

function Segments({ segments, ctx }: { segments: readonly LineSegment[]; ctx: SegmentContext }) {
  const { selectedId, flashId, activeCriteria, rewriteTarget, onSelectFinding } = ctx;
  return (
    <>
      {segments.map((seg, i) => {
        const inline = seg.inline && activeCriteria.has(seg.inline.criterion) ? seg.inline : undefined;
        const passage = seg.passage && activeCriteria.has(seg.passage.criterion) ? seg.passage : undefined;
        const inTarget =
          rewriteTarget !== null && seg.start >= rewriteTarget.start && seg.end <= rewriteTarget.end;

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
      })}
    </>
  );
}

function MarginTick({
  markers,
  selectedId,
  isFocused,
}: {
  markers: Finding[];
  selectedId: string | null;
  isFocused: boolean;
}) {
  if (markers.length === 0) return null;
  const tick = markers.reduce((a, b) => (severityRank(a.severity) >= severityRank(b.severity) ? a : b));
  const holdsSelected = markers.some((m) => findingId(m) === selectedId);
  return (
    <span
      aria-hidden
      className="margin-tick absolute -left-4 top-[0.5em] hidden h-[1.1em] w-0.75 rounded-full sm:block"
      style={{
        background: holdsSelected ? "var(--accent)" : severityInkVar(tick.severity),
        opacity: holdsSelected ? 1 : isFocused ? 0.18 : 0.4,
        transform: holdsSelected ? "scaleY(1.15)" : "scaleY(1)",
      }}
    />
  );
}

function headingSize(level: number): string {
  return `${Math.max(1.5 - (level - 1) * 0.14, 1.05).toFixed(2)}em`;
}

function BlockView({
  blocks,
  diagnostic,
  activeCriteria,
  ctx,
  isFocused,
}: {
  blocks: readonly Block[];
  diagnostic: Diagnostic;
  activeCriteria: ReadonlySet<string>;
  ctx: SegmentContext;
  isFocused: boolean;
}) {
  const markersIn = (start: number, end: number): Finding[] =>
    diagnostic.findings.filter(
      (f) => activeCriteria.has(f.criterion) && f.span.end > f.span.start && f.span.start < end && f.span.end > start,
    );

  return (
    <>
      {blocks.map((block, bi) => {
        const markers = markersIn(block.start, block.end);
        const tick = <MarginTick markers={markers} selectedId={ctx.selectedId} isFocused={isFocused} />;

        if (block.kind === "heading") {
          const Tag = `h${Math.min(Math.max(block.level + 1, 2), 6)}` as "h2" | "h3" | "h4" | "h5" | "h6";
          return (
            <div key={bi} className={`relative ${bi === 0 ? "" : "mt-[1.9em]"}`}>
              {tick}
              <div className="u-sublabel mb-1 text-ink-3">
                Título · nível {block.level}
              </div>
              <Tag className="font-semibold leading-snug text-ink-0" style={{ fontSize: headingSize(block.level) }}>
                <Segments segments={segmentRange(diagnostic.text, diagnostic.findings, block.start, block.end)} ctx={ctx} />
              </Tag>
            </div>
          );
        }

        if (block.kind === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <div key={bi} className={`relative ${bi === 0 ? "" : "mt-[1.55em]"}`}>
              {tick}
              <div className="u-sublabel mb-1.5 text-ink-3">
                {block.ordered ? "Lista numerada" : "Lista"}
                {block.items.length === 1 ? " · 1 item" : ` · ${block.items.length} itens`}
              </div>
              <ListTag className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-[1.4em] marker:text-ink-3`}>
                {block.items.map((item, ii) => (
                  <li key={ii} className="pl-1">
                    <Segments segments={segmentRange(diagnostic.text, diagnostic.findings, item.start, item.end)} ctx={ctx} />
                  </li>
                ))}
              </ListTag>
            </div>
          );
        }

        return (
          <p key={bi} className={`relative ${bi === 0 ? "" : "mt-[1.55em]"}`}>
            {tick}
            <Segments segments={segmentRange(diagnostic.text, diagnostic.findings, block.start, block.end)} ctx={ctx} />
          </p>
        );
      })}
    </>
  );
}

export const DocumentView = forwardRef<HTMLDivElement, Props>(function DocumentView(
  { mode, text, diagnostic, blocks, selectedId, flashId, activeCriteria, rewriteTarget, onChangeText, onSelectFinding },
  scrollRef,
) {
  const lines = useMemo(() => buildLines(diagnostic.text, diagnostic.findings), [diagnostic]);
  const paragraphs = useMemo(() => lines.filter((l) => l.text.trim().length > 0), [lines]);
  const words = diagnostic.metrics.words;
  const isFocused = mode === "audit" && selectedId !== null;

  const structured = blocks !== null && blocks.some((b) => b.kind !== "paragraph");
  const ctx: SegmentContext = { selectedId, flashId, activeCriteria, rewriteTarget, onSelectFinding };

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-desk" aria-label="Documento em revisão">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-210 px-4 py-8 sm:px-8 sm:py-12 lg:py-16">
          <div className="overflow-hidden rounded-xl border border-rule-1 bg-sheet shadow-(--shadow-sheet)">
            <div className="flex items-center justify-between border-b border-rule-1 px-6 py-3.5 sm:px-14">
              <span className="u-sublabel text-ink-3">
                {mode === "edit" ? "Rascunho" : structured ? "Documento estruturado" : "Documento em revisão"}
              </span>
              <span className="text-[12px] tabular-nums text-ink-3">{words} palavras</span>
            </div>

            {mode === "edit" ? (
              <div className="relative px-6 py-8 sm:px-14 sm:py-12">
                <textarea
                  value={text}
                  onChange={(e) => onChangeText(e.target.value)}
                  spellCheck={false}
                  autoFocus
                  aria-label="Texto do documento"
                  className={`prose-doc block min-h-[58vh] w-full resize-none border-0 bg-transparent p-0 outline-none transition-opacity duration-200 ${
                    text === "" ? "opacity-0" : "opacity-100"
                  }`}
                  style={{ caretColor: "var(--accent)" }}
                />
                {text === "" && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    <span className="grid size-11 place-items-center rounded-full bg-accent-weak text-accent">
                      <PenNibIcon className="size-5" />
                    </span>
                    <p className="mt-4 font-serif text-[21px] leading-snug text-ink-1">
                      Comece o seu rascunho
                    </p>
                    <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-3">
                      Escreva ou cole o seu texto. A auditoria roda em tempo real, critério por critério —
                      sem reescrever no seu lugar.
                    </p>
                    <span
                      aria-hidden
                      className="caret-blink mt-5 h-[1.4em] w-[3px] rounded-full bg-accent"
                    />
                  </div>
                )}
              </div>
            ) : (
              <article className={`prose-doc px-6 py-8 sm:px-14 sm:py-12 ${isFocused ? "is-focused" : ""}`}>
                {structured ? (
                  <BlockView
                    blocks={blocks!}
                    diagnostic={diagnostic}
                    activeCriteria={activeCriteria}
                    ctx={ctx}
                    isFocused={isFocused}
                  />
                ) : (
                  paragraphs.map((para) => (
                    <p key={para.number} className="relative">
                      <MarginTick
                        markers={para.markers.filter((m) => activeCriteria.has(m.criterion))}
                        selectedId={selectedId}
                        isFocused={isFocused}
                      />
                      {para.text.length === 0 ? <span>&nbsp;</span> : <Segments segments={para.segments} ctx={ctx} />}
                    </p>
                  ))
                )}
              </article>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});
