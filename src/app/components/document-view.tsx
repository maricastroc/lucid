"use client";

import { forwardRef, useMemo, useRef } from "react";
import type { Block, Diagnostic, Finding, ListItemBlock, Span } from "@/lucid";
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
  onChangeMode: (mode: Mode) => void;
  onOpenDocument: (file: File) => void;
  importing: boolean;
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
  onLeaveDraft: () => void;
  onPasteDocument: (value: string, html: string | null) => void;
  onSelectFinding: (finding: Finding) => void;
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

interface ListNode {
  readonly item: ListItemBlock;
  readonly children: ListNode[];
}

function listTree(items: readonly ListItemBlock[]): ListNode[] {
  const roots: ListNode[] = [];
  const stack: ListNode[] = [];
  const base = items.reduce((n, item) => Math.min(n, item.level), Number.POSITIVE_INFINITY);

  for (const item of items) {
    const level = item.level - base;
    const node: ListNode = { item, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].item.level - base >= level) stack.pop();
    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1].children.push(node);
    stack.push(node);
  }

  return roots;
}

function LabelledList({
  items,
  ctx,
  diagnostic,
  occurrences,
}: {
  items: readonly ListItemBlock[];
  ctx: SegmentContext;
  diagnostic: Diagnostic;
  occurrences: readonly Span[];
}) {
  const base = items.reduce((n, item) => Math.min(n, item.level), Number.POSITIVE_INFINITY);

  return (
    <ol className="list-none space-y-1 pl-0">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2" style={{ marginLeft: `${(item.level - base) * 1.6}em` }}>
          <span className="shrink-0 tabular-nums text-ink-2">{item.marker}</span>
          <div className="min-w-0 flex-1">
            {item.blocks.map((paragraph, pi) => (
              <p key={pi} className={pi === 0 ? "" : "mt-1"}>
                <Segments
                  segments={segmentRange(
                    diagnostic.text,
                    diagnostic.findings,
                    paragraph.start,
                    paragraph.end,
                    occurrences,
                  )}
                  ctx={ctx}
                />
              </p>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ListLevel({
  nodes,
  ctx,
  diagnostic,
  occurrences,
}: {
  nodes: readonly ListNode[];
  ctx: SegmentContext;
  diagnostic: Diagnostic;
  occurrences: readonly Span[];
}) {
  if (nodes.length === 0) return null;
  const ordered = nodes[0].item.ordered;
  const labelled = nodes.every((node) => node.item.marker !== undefined);
  const ListTag = ordered ? "ol" : "ul";
  const style = labelled ? "list-none pl-0" : `${ordered ? "list-decimal" : "list-disc"} pl-[1.4em]`;

  return (
    <ListTag className={`${style} space-y-1 marker:text-ink-3`}>
      {nodes.map((node, index) => (
        <li key={index} className={labelled ? "flex gap-2" : "pl-1"}>
          {labelled && <span className="shrink-0 tabular-nums text-ink-2">{node.item.marker}</span>}
          <div className={labelled ? "min-w-0 flex-1" : "contents"}>
            {node.item.blocks.map((paragraph, pi) => (
              <p key={pi} className={pi === 0 ? "" : "mt-1"}>
                <Segments
                  segments={segmentRange(
                    diagnostic.text,
                    diagnostic.findings,
                    paragraph.start,
                    paragraph.end,
                    occurrences,
                  )}
                  ctx={ctx}
                />
              </p>
            ))}
            <ListLevel nodes={node.children} ctx={ctx} diagnostic={diagnostic} occurrences={occurrences} />
          </div>
        </li>
      ))}
    </ListTag>
  );
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
  if (level <= 1) return "1.85em";
  return `${Math.max(1.42 - (level - 2) * 0.13, 1.05).toFixed(2)}em`;
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
            <div
              key={bi}
              data-start={block.start}
              className={`relative ${bi === 0 ? "" : block.level <= 1 ? "mt-[2.4em]" : "mt-[1.9em]"} ${
                block.level <= 1 ? "pb-[0.55em]" : ""
              }`}
            >
              {tick}
              <div className="u-sublabel mb-1 text-ink-3">{c.documentView.headingLevel(block.level)}</div>
              <Tag
                className={`font-semibold leading-snug text-ink-0 ${block.level <= 1 ? "tracking-[-0.012em]" : ""}`}
                style={{ fontSize: headingSize(block.level) }}
              >
                <Segments
                  segments={segmentRange(diagnostic.text, diagnostic.findings, block.start, block.end, occurrences)}
                  ctx={ctx}
                />
              </Tag>
            </div>
          );
        }

        if (block.kind === "list") {
          const deepest = block.items.reduce((n, item) => Math.max(n, item.level), 0);
          return (
            <div key={bi} data-start={block.start} className={`relative ${bi === 0 ? "" : "mt-[1.55em]"}`}>
              {tick}
              <div className="u-sublabel mb-1.5 text-ink-3">
                {block.ordered ? c.documentView.orderedList : c.documentView.list}
                {c.documentView.listItems(block.items.length)}
                {deepest > 0 && c.documentView.listLevels(deepest + 1)}
              </div>
              {block.items.every((item) => item.marker !== undefined) ? (
                <LabelledList items={block.items} ctx={ctx} diagnostic={diagnostic} occurrences={occurrences} />
              ) : (
                <ListLevel nodes={listTree(block.items)} ctx={ctx} diagnostic={diagnostic} occurrences={occurrences} />
              )}
            </div>
          );
        }

        if (block.kind === "table") {
          return (
            <div key={bi} data-start={block.start} className={`relative ${bi === 0 ? "" : "mt-[1.55em]"}`}>
              {tick}
              <div className="u-sublabel mb-1.5 text-ink-3">
                {c.documentView.table}
                {c.documentView.tableShape(block.rows.length, block.columns)}
              </div>
              <div className="overflow-x-auto">
                <table
                  className="w-full border-collapse text-[0.94em] leading-snug"
                  aria-label={c.documentView.tableLabel}
                >
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.cells.map((cell, ci) => {
                          const Cell = cell.header ? "th" : "td";
                          return (
                            <Cell
                              key={ci}
                              colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                              rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                              scope={cell.header ? "col" : undefined}
                              className={`border border-rule-1 px-2.5 py-1.5 align-top ${
                                cell.header ? "bg-surface-2/60 font-semibold text-ink-0" : "text-left"
                              }`}
                            >
                              {cell.blocks.map((paragraph, pi) => (
                                <p key={pi} data-start={paragraph.start} className={pi === 0 ? "" : "mt-[0.5em]"}>
                                  <Segments
                                    segments={segmentRange(
                                      diagnostic.text,
                                      diagnostic.findings,
                                      paragraph.start,
                                      paragraph.end,
                                      occurrences,
                                    )}
                                    ctx={ctx}
                                  />
                                </p>
                              ))}
                            </Cell>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
    onChangeMode,
    onOpenDocument,
    importing,
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
    onLeaveDraft,
    onPasteDocument,
    onSelectFinding,
  },
  scrollRef,
) {
  const { c } = useCopy();
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
      className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-desk"
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
      <DocumentToolbar
        mode={mode}
        onChangeMode={onChangeMode}
        onOpenDocument={onOpenDocument}
        importing={importing}
        words={words}
        structured={structured}
      />
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-210 px-4 py-8 sm:px-8 sm:py-12 lg:py-14">
          <div className="overflow-hidden rounded-xl border border-rule-1 bg-sheet shadow-(--shadow-sheet)">
            {mode === "edit" ? (
              <div className="relative px-6 py-8 sm:px-14 sm:py-12">
                <textarea
                  value={text}
                  onPaste={(e) => {
                    const field = e.currentTarget;
                    if (field.selectionStart !== 0 || field.selectionEnd !== field.value.length) return;

                    const plain = e.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n");
                    if (plain === "") return;

                    e.preventDefault();
                    onPasteDocument(plain, e.clipboardData.getData("text/html") || null);
                  }}
                  onChange={(e) => onChangeText(e.target.value)}
                  onBlur={onLeaveDraft}
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

function DocumentToolbar({
  mode,
  onChangeMode,
  onOpenDocument,
  importing,
  words,
  structured,
}: {
  mode: Mode;
  onChangeMode: (mode: Mode) => void;
  onOpenDocument: (file: File) => void;
  importing: boolean;
  words: number;
  structured: boolean;
}) {
  const { c } = useCopy();
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-rule-1 bg-desk px-4 sm:px-6">
      <span className="hidden shrink-0 text-[12px] tabular-nums text-ink-3 sm:block">
        {words} {c.common.words}
      </span>
      {mode === "edit" ? (
        <span className="u-sublabel hidden min-w-0 truncate rounded-full border border-accent-line bg-accent-weak px-2 py-0.5 text-accent sm:block">
          {c.documentView.draft}
        </span>
      ) : (
        structured && (
          <span className="u-sublabel hidden min-w-0 truncate rounded-full border border-rule-2 px-2 py-0.5 text-ink-3 sm:block">
            {c.documentView.structured}
          </span>
        )
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div
          role="tablist"
          aria-label={c.masthead.workMode}
          className="flex items-center rounded-full border border-rule-2 bg-surface p-0.5"
        >
          {(
            [
              ["audit", c.masthead.review],
              ["edit", c.masthead.write],
            ] as const
          ).map(([m, labelText]) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => onChangeMode(m)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors duration-150 ${
                mode === m
                  ? "bg-sheet text-ink-0 shadow-[0_0_0_1px_rgb(31_29_24/0.05),0_1px_2px_rgb(31_29_24/0.1)]"
                  : "text-ink-2 hover:text-ink-0"
              }`}
            >
              {labelText}
            </button>
          ))}
        </div>

        <input
          ref={fileInput}
          type="file"
          accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onOpenDocument(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={importing}
          className="hidden items-center gap-1.5 rounded-full border border-rule-2 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-1 transition-colors duration-150 hover:bg-surface hover:text-ink-0 disabled:opacity-60 sm:inline-flex"
        >
          {importing ? c.masthead.opening : c.masthead.openDocument}
        </button>
      </div>
    </div>
  );
}
