import type { Block, Document, ListItemBlock, Sentence, Token } from "../types";
import type { DocumentBuildServices } from "./model";
import { normalize } from "./normalize";
import { buildTextDocument } from "./text-blocks";
import { attachTokens, tokenize } from "./tokenize";

export type RawBlock =
  | { readonly kind: "paragraph"; readonly text: string }
  | { readonly kind: "heading"; readonly level: number; readonly text: string }
  | { readonly kind: "list"; readonly ordered: boolean; readonly items: readonly string[] };

export function toRawBlocks(blocks: readonly Block[]): RawBlock[] {
  return blocks.map((block) => {
    if (block.kind === "heading") return { kind: "heading", level: block.level, text: block.text };
    if (block.kind === "list") {
      return { kind: "list", ordered: block.ordered, items: block.items.map((item) => item.text) };
    }
    return { kind: "paragraph", text: block.text };
  });
}

function shiftToken(t: Token, off: number): Token {
  return { ...t, start: t.start + off, end: t.end + off };
}
function shiftSentence(s: Sentence, off: number): Sentence {
  return { ...s, start: s.start + off, end: s.end + off, tokens: s.tokens.map((t) => shiftToken(t, off)) };
}

export function segmentAt(
  text: string,
  offset: number,
  services: DocumentBuildServices,
): { sentences: Sentence[]; tokens: Token[]; wordCount: number } {
  const localTokens = tokenize(text);
  const localSents = attachTokens(services.segmentSentences(text, services.abbreviations), localTokens);
  const tokens = localTokens.map((t) => shiftToken(t, offset));
  const sentences = localSents.map((s) => shiftSentence(s, offset));
  const wordCount = sentences.reduce((n, s) => n + s.wordCount, 0);
  return { sentences, tokens, wordCount };
}

interface EditableUnit {
  readonly blockIndex: number;
  readonly itemIndex: number | null;
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

function editableUnits(blocks: readonly Block[]): EditableUnit[] {
  const units: EditableUnit[] = [];
  blocks.forEach((block, blockIndex) => {
    if (block.kind === "list") {
      block.items.forEach((item, itemIndex) =>
        units.push({ blockIndex, itemIndex, start: item.start, end: item.end, text: item.text }),
      );
      return;
    }
    units.push({ blockIndex, itemIndex: null, start: block.start, end: block.end, text: block.text });
  });
  return units;
}

function affixSplice(before: string, after: string): { start: number; end: number; replacement: string } {
  const max = Math.min(before.length, after.length);
  let prefix = 0;
  while (prefix < max && before[prefix] === after[prefix]) prefix++;

  let suffix = 0;
  while (suffix < max - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;

  return {
    start: prefix,
    end: before.length - suffix,
    replacement: after.slice(prefix, after.length - suffix),
  };
}

function withUnitText(blocks: readonly Block[], unit: EditableUnit, text: string): RawBlock[] {
  return toRawBlocks(blocks).map((raw, index) => {
    if (index !== unit.blockIndex) return raw;
    if (raw.kind === "list" && unit.itemIndex !== null) {
      return { ...raw, items: raw.items.map((item, i) => (i === unit.itemIndex ? text : item)) };
    }
    if (raw.kind === "heading") return { ...raw, text };
    if (raw.kind === "paragraph") return { ...raw, text };
    return raw;
  });
}

export type SpliceRefusal = "crosses_units" | "unsupported_unit" | "introduces_heading" | "rebuild_mismatch";

export type StructuredSplice =
  { readonly ok: true; readonly document: Document } | { readonly ok: false; readonly reason: SpliceRefusal };

function expandParagraph(local: string, services: DocumentBuildServices): RawBlock[] | null {
  const raw = toRawBlocks(buildTextDocument(normalize(local), services).blocks);
  if (raw.length === 0) return null;
  if (raw.some((block) => block.kind === "heading")) return null;
  return raw;
}

function replaceBlockAt(blocks: readonly Block[], index: number, replacement: readonly RawBlock[]): RawBlock[] {
  const raw = toRawBlocks(blocks);
  return [...raw.slice(0, index), ...replacement, ...raw.slice(index + 1)];
}

function untouchedBlocksSurvived(
  before: readonly RawBlock[],
  after: readonly RawBlock[],
  index: number,
  grownBy: number,
): boolean {
  const same = (a: RawBlock, b: RawBlock): boolean => JSON.stringify(a) === JSON.stringify(b);
  if (after.length !== before.length - 1 + grownBy) return false;
  for (let i = 0; i < index; i++) if (!same(before[i], after[i])) return false;
  for (let i = index + 1; i < before.length; i++) {
    if (!same(before[i], after[i - 1 + grownBy])) return false;
  }
  return true;
}

function sameWords(a: string, b: string): boolean {
  const words = (text: string): string => text.replace(/\s+/g, " ").trim();
  return words(a) === words(b);
}

function rebuildFromUnits(
  doc: Document,
  unitTexts: readonly (string | null)[],
  services: DocumentBuildServices,
): Document {
  const raw: RawBlock[] = [];
  let cursor = 0;

  for (const block of doc.blocks) {
    if (block.kind === "list") {
      const items: string[] = [];
      for (let i = 0; i < block.items.length; i++) {
        const text = unitTexts[cursor++];
        if (text !== null) items.push(text);
      }

      if (items.length > 0) raw.push({ kind: "list", ordered: block.ordered, items });
      continue;
    }

    const text = unitTexts[cursor++];
    if (text === null) continue;
    raw.push(block.kind === "heading" ? { kind: "heading", level: block.level, text } : { kind: "paragraph", text });
  }

  return buildStructuredDocument(raw, services);
}

function spliceAcrossUnits(
  doc: Document,
  target: string,
  start: number,
  end: number,
  replacement: string,
  services: DocumentBuildServices,
): StructuredSplice {
  if (replacement.includes("\n")) return { ok: false, reason: "unsupported_unit" };

  const units = editableUnits(doc.blocks);
  if (units.length === 0) return { ok: false, reason: "crosses_units" };

  let firstIndex = -1;
  for (let i = 0; i < units.length; i++) if (units[i].start <= start) firstIndex = i;
  let lastIndex = -1;
  for (let i = units.length - 1; i >= 0; i--) if (units[i].end >= end) lastIndex = i;
  if (firstIndex === -1 || lastIndex === -1 || lastIndex < firstIndex) {
    return { ok: false, reason: "crosses_units" };
  }

  const first = units[firstIndex];
  const last = units[lastIndex];
  const head = first.text.slice(0, Math.max(0, start - first.start));
  const tail = last.text.slice(Math.max(0, end - last.start));
  const merged = head + replacement + tail;

  const coversEveryUnit = firstIndex === 0 && lastIndex === units.length - 1;
  if (replacement.trim() !== "" && (coversEveryUnit || (head === "" && tail === ""))) {
    return { ok: false, reason: "crosses_units" };
  }

  const survivor = head.trim() !== "" ? firstIndex : lastIndex;
  const unitTexts = units.map((unit, index) => {
    if (index < firstIndex || index > lastIndex) return unit.text;
    if (index !== survivor) return null;
    return merged.trim() === "" ? null : merged;
  });

  const rebuilt = rebuildFromUnits(doc, unitTexts, services);
  return sameWords(rebuilt.source, target)
    ? { ok: true, document: rebuilt }
    : { ok: false, reason: "rebuild_mismatch" };
}

export function spliceStructuredDocument(
  doc: Document,
  nextText: string,
  services: DocumentBuildServices,
): StructuredSplice {
  const target = normalize(nextText);
  if (target === doc.source) return { ok: true, document: doc };

  const { start, end, replacement } = affixSplice(doc.source, target);

  const units = editableUnits(doc.blocks);
  const unitIndex = units.findIndex((candidate) => candidate.start <= start && end <= candidate.end);
  if (unitIndex === -1) return spliceAcrossUnits(doc, target, start, end, replacement, services);
  const unit = units[unitIndex];

  const local = unit.text.slice(0, start - unit.start) + replacement + unit.text.slice(end - unit.start);

  if (local.trim() === "") {
    const rebuilt = rebuildFromUnits(
      doc,
      units.map((_, index) => (index === unitIndex ? null : units[index].text)),
      services,
    );
    return sameWords(rebuilt.source, target)
      ? { ok: true, document: rebuilt }
      : { ok: false, reason: "rebuild_mismatch" };
  }

  if (!replacement.includes("\n")) {
    const rebuilt = buildStructuredDocument(withUnitText(doc.blocks, unit, local), services);
    return rebuilt.source === target ? { ok: true, document: rebuilt } : { ok: false, reason: "rebuild_mismatch" };
  }

  const block = doc.blocks[unit.blockIndex];
  if (unit.itemIndex !== null || block.kind !== "paragraph") {
    return { ok: false, reason: "unsupported_unit" };
  }

  const expanded = expandParagraph(local, services);
  if (expanded === null) return { ok: false, reason: "introduces_heading" };

  const before = toRawBlocks(doc.blocks);
  const nextBlocks = replaceBlockAt(doc.blocks, unit.blockIndex, expanded);
  const rebuilt = buildStructuredDocument(nextBlocks, services);

  if (!untouchedBlocksSurvived(before, toRawBlocks(rebuilt.blocks), unit.blockIndex, expanded.length)) {
    return { ok: false, reason: "rebuild_mismatch" };
  }
  return { ok: true, document: rebuilt };
}

export function buildStructuredDocument(rawBlocks: readonly RawBlock[], services: DocumentBuildServices): Document {
  let source = "";
  const blocks: Block[] = [];
  const sentences: Sentence[] = [];
  const tokens: Token[] = [];

  const place = (text: string, separator: string): { start: number; end: number } => {
    if (source.length > 0) source += separator;
    const start = source.length;
    source += normalize(text);
    return { start, end: source.length };
  };

  for (const rb of rawBlocks) {
    if (rb.kind === "paragraph" || rb.kind === "heading") {
      const { start, end } = place(rb.text, "\n\n");
      const seg = segmentAt(source.slice(start, end), start, services);
      sentences.push(...seg.sentences);
      tokens.push(...seg.tokens);
      const base = { start, end, text: source.slice(start, end), sentences: seg.sentences, wordCount: seg.wordCount };
      blocks.push(
        rb.kind === "heading" ? { kind: "heading", level: rb.level, ...base } : { kind: "paragraph", ...base },
      );
      continue;
    }

    const items: ListItemBlock[] = [];
    let listStart = -1;
    rb.items.forEach((itemText, idx) => {
      const { start, end } = place(itemText, idx === 0 ? "\n\n" : "\n");
      if (idx === 0) listStart = start;
      const seg = segmentAt(source.slice(start, end), start, services);
      sentences.push(...seg.sentences);
      tokens.push(...seg.tokens);
      items.push({
        kind: "listItem",
        start,
        end,
        text: source.slice(start, end),
        sentences: seg.sentences,
        wordCount: seg.wordCount,
      });
    });
    if (items.length > 0) {
      const listEnd = items[items.length - 1].end;
      blocks.push({
        kind: "list",
        ordered: rb.ordered,
        start: listStart,
        end: listEnd,
        text: source.slice(listStart, listEnd),
        items,
      });
    }
  }

  return { source, sentences, tokens, blocks };
}
