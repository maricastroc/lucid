"use client";

import { forwardRef, useMemo, useRef } from "react";
import type { Block, Diagnostic, Finding, Span } from "@/lucid";
import { buildLines, segmentRange, type LineSegment } from "../lib/editor-model";
import { findingId, metaFor, severityInkVar, severityLabel } from "../lib/criteria";
import { severityRank } from "../lib/criteria";
import { occurrenceKey } from "../lib/occurrence-cursor";
import { useFileDrop } from "../hooks/use-file-drop";
import { useCopy } from "../i18n/use-copy";
import { ArrowDownIcon, PenNibIcon } from "./icons";

export type Mode = "audit" | "edit";

interface Props {
  mode: Mode;
  text: string;
  diagnostic: Diagnostic;
  blocks: readonly Block[] | null;
  selectedId: string | null;
  flashId: string | null;
  hiddenHighlights: ReadonlySet<string>;
  rewriteTarget: Span | null;
  occurrences: readonly Span[];
  activeOccurrence: Span | null;
  onChangeText: (value: string) => void;
  /** A paste over the whole draft: a different document, not an edit to this one. */
  onPasteDocument: (value: string) => void;
  onSelectFinding: (finding: Finding) => void;
  onOpenDocument: (file: File) => void;
}

interface SegmentContext {
  selectedId: string | null;
  flashId: string | null;
  hiddenHighlights: ReadonlySet<string>;
  rewriteTarget: Span | null;
  activeOccurrence: Span | null;
  onSelectFinding: (finding: Finding) => void;
}

function occurrenceAttrs(seg: LineSegment, active: Span | null) {
  if (seg.mark === undefined) return null;
  const key = occurrenceKey(seg.mark);
  const isActive = active !== null && occurrenceKey(active) === key;
  return { key, isActive, className: isActive ? "occ occ-active" : "occ" };
}

function Segments({ segments, ctx }: { segments: readonly LineSegment[]; ctx: SegmentContext }) {
  const { c, lang } = useCopy();
  const { selectedId, flashId, hiddenHighlights, rewriteTarget, activeOccurrence, onSelectFinding } = ctx;
  return (
    <>
      {segments.map((seg, i) => {
        const inline = seg.inline && !hiddenHighlights.has(seg.inline.criterion) ? seg.inline : undefined;
        const passage = seg.passage && !hiddenHighlights.has(seg.passage.criterion) ? seg.passage : undefined;
        const inTarget = rewriteTarget !== null && seg.start >= rewriteTarget.start && seg.end <= rewriteTarget.end;

        const occ = occurrenceAttrs(seg, activeOccurrence);

        if (!inline && !passage) {
          const plain = ["seg"];
          if (inTarget) plain.push("rewrite-target");
          if (occ) plain.push(occ.className);
          return (
            <span key={i} data-occurrence={occ?.key} className={plain.join(" ")}>
              {seg.text}
            </span>
          );
        }

        const target = inline ?? passage!;
        const id = findingId(target);
        const selected = selectedId === id;
        const meta = metaFor(target.criterion, lang);
        const classes = ["seg"];
        if (inTarget) classes.push("rewrite-target");
        if (inline) classes.push("mark", meta.markStyleClass);
        if (passage) classes.push("passage");
        if (selected) classes.push("seg-selected", "is-lit");
        if (flashId === id) classes.push("seg-flash");
        if (occ) classes.push(occ.className, "is-lit");
        const ink = inline ? severityInkVar(inline.severity) : undefined;

        return (
          <span
            key={i}
            role="button"
            tabIndex={0}
            data-finding-id={id}
            data-occurrence={occ?.key}
            className={classes.join(" ")}
            style={ink ? ({ "--mark-ink": ink } as React.CSSProperties) : undefined}
            aria-pressed={selected}
            aria-label={c.documentView.segmentLabel(meta.label, seg.text.trim(), severityLabel(target.severity, lang))}
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
      className={`margin-tick absolute top-[0.5em] hidden rounded-full sm:block ${
        holdsSelected ? "-left-5 h-[1.35em] w-1" : "-left-4 h-[1.1em] w-0.75"
      }`}
      style={{
        background: holdsSelected ? "var(--accent)" : severityInkVar(tick.severity),
        opacity: holdsSelected ? 1 : isFocused ? 0.22 : 0.4,
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
  hiddenHighlights,
  occurrences,
  ctx,
  isFocused,
}: {
  blocks: readonly Block[];
  diagnostic: Diagnostic;
  hiddenHighlights: ReadonlySet<string>;
  occurrences: readonly Span[];
  ctx: SegmentContext;
  isFocused: boolean;
}) {
  const { c } = useCopy();
  const markersIn = (start: number, end: number): Finding[] =>
    diagnostic.findings.filter(
      (f) =>
        !hiddenHighlights.has(f.criterion) && f.span.end > f.span.start && f.span.start < end && f.span.end > start,
    );

  return (
    <>
      {blocks.map((block, bi) => {
        const markers = markersIn(block.start, block.end);
        const tick = <MarginTick markers={markers} selectedId={ctx.selectedId} isFocused={isFocused} />;

        if (block.kind === "heading") {
          const Tag = `h${Math.min(Math.max(block.level + 1, 2), 6)}` as "h2" | "h3" | "h4" | "h5" | "h6";
          return (
            <div key={bi} data-start={block.start} className={`relative ${bi === 0 ? "" : "mt-[1.9em]"}`}>
              {tick}
              <div className="u-sublabel mb-1 text-ink-3">{c.documentView.headingLevel(block.level)}</div>
              <Tag className="font-semibold leading-snug text-ink-0" style={{ fontSize: headingSize(block.level) }}>
                <Segments
                  segments={segmentRange(diagnostic.text, diagnostic.findings, block.start, block.end, occurrences)}
                  ctx={ctx}
                />
              </Tag>
            </div>
          );
        }

        if (block.kind === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <div key={bi} data-start={block.start} className={`relative ${bi === 0 ? "" : "mt-[1.55em]"}`}>
              {tick}
              <div className="u-sublabel mb-1.5 text-ink-3">
                {block.ordered ? c.documentView.orderedList : c.documentView.list}
                {c.documentView.listItems(block.items.length)}
              </div>
              <ListTag
                className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-[1.4em] marker:text-ink-3`}
              >
                {block.items.map((item, ii) => (
                  <li key={ii} className="pl-1">
                    <Segments
                      segments={segmentRange(diagnostic.text, diagnostic.findings, item.start, item.end, occurrences)}
                      ctx={ctx}
                    />
                  </li>
                ))}
              </ListTag>
            </div>
          );
        }

        return (
          <p key={bi} data-start={block.start} className={`relative ${bi === 0 ? "" : "mt-[1.55em]"}`}>
            {tick}
            <Segments
              segments={segmentRange(diagnostic.text, diagnostic.findings, block.start, block.end, occurrences)}
              ctx={ctx}
            />
          </p>
        );
      })}
    </>
  );
}

export const DocumentView = forwardRef<HTMLDivElement, Props>(function DocumentView(
  {
    mode,
    text,
    diagnostic,
    blocks,
    selectedId,
    flashId,
    hiddenHighlights,
    rewriteTarget,
    occurrences,
    activeOccurrence,
    onChangeText,
    onPasteDocument,
    onSelectFinding,
    onOpenDocument,
  },
  scrollRef,
) {
  const { c } = useCopy();
  const pastedOverAll = useRef(false);
  const drop = useFileDrop(onOpenDocument);
  const lines = useMemo(() => buildLines(diagnostic.text, diagnostic.findings, occurrences), [diagnostic, occurrences]);
  const paragraphs = useMemo(() => lines.filter((l) => l.text.trim().length > 0), [lines]);
  const words = diagnostic.metrics.words;
  const isFocused = mode === "audit" && selectedId !== null;

  const structured = blocks !== null && blocks.some((b) => b.kind !== "paragraph");
  const ctx: SegmentContext = {
    selectedId,
    flashId,
    hiddenHighlights,
    rewriteTarget,
    activeOccurrence,
    onSelectFinding,
  };

  return (
    <section
      className="relative flex min-w-0 flex-1 flex-col bg-desk"
      aria-label={c.documentView.regionLabel}
      {...drop.handlers}
    >
      {drop.dragging && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 z-20 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-desk/85 backdrop-blur-[1px]"
        >
          <div className="text-center">
            <p className="font-serif text-[19px] text-ink-0">{c.documentView.dropHere}</p>
            <p className="mt-1 text-[12.5px] text-ink-2">{c.documentView.dropHint}</p>
          </div>
        </div>
      )}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-210 px-4 py-8 sm:px-8 sm:py-12 lg:py-16">
          <div className="overflow-hidden rounded-xl border border-rule-1 bg-sheet shadow-(--shadow-sheet)">
            <div className="flex items-center justify-between border-b border-rule-1 px-6 py-3.5 sm:px-14">
              <span className="u-sublabel text-ink-3">
                {mode === "edit"
                  ? c.documentView.draft
                  : structured
                    ? c.documentView.structured
                    : c.documentView.underReview}
              </span>
              <span className="text-[12px] tabular-nums text-ink-3">
                {words} {c.common.words}
              </span>
            </div>

            {mode === "edit" ? (
              <div className="relative px-6 py-8 sm:px-14 sm:py-12">
                <textarea
                  value={text}
                  onPaste={(e) => {
                    const field = e.currentTarget;
                    pastedOverAll.current = field.selectionStart === 0 && field.selectionEnd === field.value.length;
                  }}
                  onChange={(e) => {
                    const replaced = pastedOverAll.current;
                    pastedOverAll.current = false;
                    if (replaced && e.target.value !== "") onPasteDocument(e.target.value);
                    else onChangeText(e.target.value);
                  }}
                  spellCheck={false}
                  autoFocus={text === ""}
                  aria-label={c.documentView.textareaLabel}
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
                    <p className="mt-4 font-serif text-[21px] leading-snug text-ink-1">{c.documentView.emptyTitle}</p>
                    <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-3">{c.documentView.emptyBody}</p>
                    <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-3">
                      <ArrowDownIcon className="size-3.5 text-ink-dim" />
                      {c.documentView.emptyDrop}
                    </p>
                    <span aria-hidden className="caret-blink mt-5 h-[1.4em] w-0.75 rounded-full bg-accent" />
                  </div>
                )}
              </div>
            ) : (
              <article className={`prose-doc px-6 py-8 sm:px-14 sm:py-12 ${isFocused ? "is-focused" : ""}`}>
                {structured ? (
                  <BlockView
                    blocks={blocks!}
                    diagnostic={diagnostic}
                    hiddenHighlights={hiddenHighlights}
                    occurrences={occurrences}
                    ctx={ctx}
                    isFocused={isFocused}
                  />
                ) : (
                  paragraphs.map((para) => (
                    <p key={para.number} data-start={para.start} className="relative">
                      <MarginTick
                        markers={para.markers.filter((m) => !hiddenHighlights.has(m.criterion))}
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
