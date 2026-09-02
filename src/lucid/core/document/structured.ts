import type {
  Block,
  Document,
  ListItemBlock,
  ParagraphBlock,
  Sentence,
  TableCellBlock,
  TableRowBlock,
  Token,
} from "../types";
import type { DocumentBuildServices } from "./model";
import { normalize } from "./normalize";
import { cellPositions, resolveTableGrid } from "./table-grid";
import { buildTextDocument } from "./text-blocks";
import { attachTokens, tokenize } from "./tokenize";

export interface RawTableCell {
  readonly blocks: readonly string[];
  readonly colSpan?: number;
  readonly rowSpan?: number;
  readonly header?: boolean;
}

export interface RawTableRow {
  readonly cells: readonly RawTableCell[];
}

export interface RawListItem {
  readonly blocks: readonly string[];
  readonly level: number;
  readonly ordered: boolean;
  readonly marker?: string;
}

export type StoredListItem = string | RawListItem;

export function normalizeListItem(item: StoredListItem, listOrdered: boolean): RawListItem {
  if (typeof item === "string") return { blocks: [item], level: 0, ordered: listOrdered };
  return {
    blocks: item.blocks,
    level: Number.isFinite(item.level) ? Math.max(0, Math.trunc(item.level)) : 0,
    ordered: typeof item.ordered === "boolean" ? item.ordered : listOrdered,
    ...(typeof item.marker === "string" ? { marker: item.marker } : {}),
  };
}

export type RawBlock =
  | { readonly kind: "paragraph"; readonly text: string }
  | { readonly kind: "heading"; readonly level: number; readonly text: string }
  | { readonly kind: "list"; readonly ordered: boolean; readonly items: readonly StoredListItem[] }
  | { readonly kind: "table"; readonly rows: readonly RawTableRow[] };

export function toRawBlocks(blocks: readonly Block[]): RawBlock[] {
  return blocks.map((block) => {
    if (block.kind === "heading") return { kind: "heading", level: block.level, text: block.text };
    if (block.kind === "list") {
      return {
        kind: "list",
        ordered: block.ordered,
        items: block.items.map((item) => ({
          blocks: item.blocks.map((paragraph) => paragraph.text),
          level: item.level,
          ordered: item.ordered,
          ...(item.marker === undefined ? {} : { marker: item.marker }),
        })),
      };
    }
    if (block.kind === "table") {
      return {
        kind: "table",
        rows: block.rows.map((row) => ({
          cells: row.cells.map((cell) => ({
            blocks: cell.blocks.map((paragraph) => paragraph.text),
            colSpan: cell.colSpan > 1 ? cell.colSpan : undefined,
            rowSpan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
            header: cell.header ? true : undefined,
          })),
        })),
      };
    }
    return { kind: "paragraph", text: block.text };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRawTableCell(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.blocks) || !value.blocks.every((text) => typeof text === "string")) return false;
  for (const span of ["colSpan", "rowSpan"]) {
    if (value[span] !== undefined && typeof value[span] !== "number") return false;
  }
  return value.header === undefined || typeof value.header === "boolean";
}

function isStoredListItem(value: unknown): boolean {
  if (typeof value === "string") return true;
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.blocks) || !value.blocks.every((b) => typeof b === "string")) return false;
  if (value.level !== undefined && typeof value.level !== "number") return false;
  if (value.marker !== undefined && typeof value.marker !== "string") return false;
  return value.ordered === undefined || typeof value.ordered === "boolean";
}

export function isRawBlock(value: unknown): value is RawBlock {
  if (!isRecord(value)) return false;
  if (value.kind === "paragraph") return typeof value.text === "string";
  if (value.kind === "heading") return typeof value.level === "number" && typeof value.text === "string";
  if (value.kind === "list") {
    return typeof value.ordered === "boolean" && Array.isArray(value.items) && value.items.every(isStoredListItem);
  }
  if (value.kind === "table") {
    return (
      Array.isArray(value.rows) &&
      value.rows.every((row: unknown) => isRecord(row) && Array.isArray(row.cells) && row.cells.every(isRawTableCell))
    );
  }
  return false;
}

export function rawUnitTexts(block: RawBlock): string[] {
  if (block.kind === "list") {
    return block.items.flatMap((item) => [...normalizeListItem(item, block.ordered).blocks]);
  }
  if (block.kind === "table") {
    return block.rows.flatMap((row) => row.cells.flatMap((cell) => [...cell.blocks]));
  }
  return [block.text];
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
  readonly path: readonly number[];
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

function editableUnits(blocks: readonly Block[]): EditableUnit[] {
  const units: EditableUnit[] = [];
  blocks.forEach((block, blockIndex) => {
    if (block.kind === "list") {
      block.items.forEach((item, itemIndex) => {
        item.blocks.forEach((paragraph, paragraphIndex) => {
          units.push({
            path: [blockIndex, itemIndex, paragraphIndex],
            start: paragraph.start,
            end: paragraph.end,
            text: paragraph.text,
          });
        });
      });
      return;
    }
    if (block.kind === "table") {
      block.rows.forEach((row, rowIndex) => {
        row.cells.forEach((cell, cellIndex) => {
          cell.blocks.forEach((paragraph, paragraphIndex) => {
            units.push({
              path: [blockIndex, rowIndex, cellIndex, paragraphIndex],
              start: paragraph.start,
              end: paragraph.end,
              text: paragraph.text,
            });
          });
        });
      });
      return;
    }
    units.push({ path: [blockIndex], start: block.start, end: block.end, text: block.text });
  });
  return units;
}

function tableOf(unit: EditableUnit): number | null {
  return unit.path.length === 4 ? unit.path[0] : null;
}

export interface TextSplice {
  readonly start: number;
  readonly end: number;
  readonly replacement: string;
}

export function affixSplice(before: string, after: string): TextSplice {
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
  const [blockIndex, ...rest] = unit.path;
  return toRawBlocks(blocks).map((raw, index) => {
    if (index !== blockIndex) return raw;
    if (raw.kind === "list") {
      const [itemIndex, paragraphIndex] = rest;
      return {
        ...raw,
        items: raw.items.map((stored, i) => {
          const item = normalizeListItem(stored, raw.ordered);
          if (i !== itemIndex) return item;
          return { ...item, blocks: item.blocks.map((p, j) => (j === paragraphIndex ? text : p)) };
        }),
      };
    }
    if (raw.kind === "table") {
      const [rowIndex, cellIndex, paragraphIndex] = rest;
      return {
        ...raw,
        rows: raw.rows.map((row, r) =>
          r !== rowIndex
            ? row
            : {
                cells: row.cells.map((cell, c) =>
                  c !== cellIndex
                    ? cell
                    : { ...cell, blocks: cell.blocks.map((p, i) => (i === paragraphIndex ? text : p)) },
                ),
              },
        ),
      };
    }
    return { ...raw, text };
  });
}

export type SpliceRefusal =
  "crosses_units" | "crosses_cells" | "unsupported_unit" | "introduces_heading" | "rebuild_mismatch";

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
      const items: RawListItem[] = [];
      for (const item of block.items) {
        const blocks: string[] = [];
        for (let i = 0; i < item.blocks.length; i++) {
          const text = unitTexts[cursor++];
          if (text !== null) blocks.push(text);
        }
        if (blocks.length > 0) {
          items.push({
            blocks,
            level: item.level,
            ordered: item.ordered,
            ...(item.marker === undefined ? {} : { marker: item.marker }),
          });
        }
      }

      if (items.length > 0) raw.push({ kind: "list", ordered: block.ordered, items });
      continue;
    }

    if (block.kind === "table") {
      const rows: RawTableRow[] = block.rows.map((row) => ({
        cells: row.cells.map((cell) => {
          const blocks: string[] = [];
          for (let i = 0; i < cell.blocks.length; i++) {
            const text = unitTexts[cursor++];
            if (text !== null) blocks.push(text);
          }
          return {
            blocks,
            colSpan: cell.colSpan > 1 ? cell.colSpan : undefined,
            rowSpan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
            header: cell.header ? true : undefined,
          };
        }),
      }));
      raw.push({ kind: "table", rows });
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

  for (let i = firstIndex; i <= lastIndex; i++) {
    if (i !== firstIndex && tableOf(units[i]) === null && tableOf(units[firstIndex]) === null) continue;
    if (firstIndex !== lastIndex && tableOf(units[i]) !== null) return { ok: false, reason: "crosses_cells" };
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

  if (unit.path.length !== 1) return { ok: false, reason: "unsupported_unit" };
  const block = doc.blocks[unit.path[0]];
  if (block.kind !== "paragraph") return { ok: false, reason: "unsupported_unit" };

  const expanded = expandParagraph(local, services);
  if (expanded === null) return { ok: false, reason: "introduces_heading" };

  const before = toRawBlocks(doc.blocks);
  const nextBlocks = replaceBlockAt(doc.blocks, unit.path[0], expanded);
  const rebuilt = buildStructuredDocument(nextBlocks, services);

  if (!untouchedBlocksSurvived(before, toRawBlocks(rebuilt.blocks), unit.path[0], expanded.length)) {
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

  const segment = (start: number, end: number): { sentences: Sentence[]; wordCount: number } => {
    const seg = segmentAt(source.slice(start, end), start, services);
    sentences.push(...seg.sentences);
    tokens.push(...seg.tokens);
    return { sentences: seg.sentences, wordCount: seg.wordCount };
  };

  for (const rb of rawBlocks) {
    if (rb.kind === "paragraph" || rb.kind === "heading") {
      const { start, end } = place(rb.text, "\n\n");
      const seg = segment(start, end);
      const base = { start, end, text: source.slice(start, end), sentences: seg.sentences, wordCount: seg.wordCount };
      blocks.push(
        rb.kind === "heading" ? { kind: "heading", level: rb.level, ...base } : { kind: "paragraph", ...base },
      );
      continue;
    }

    if (rb.kind === "table") {
      blocks.push(...buildTable(rb, place, segment, () => source));
      continue;
    }

    const items: ListItemBlock[] = [];
    let listStart = -1;
    let placed = 0;
    rb.items.forEach((stored) => {
      const item = normalizeListItem(stored, rb.ordered);
      const paragraphs: ParagraphBlock[] = [];
      for (const text of item.blocks) {
        const { start, end } = place(text, placed === 0 ? "\n\n" : "\n");
        if (placed === 0) listStart = start;
        placed += 1;
        const seg = segment(start, end);
        paragraphs.push({
          kind: "paragraph",
          start,
          end,
          text: source.slice(start, end),
          sentences: seg.sentences,
          wordCount: seg.wordCount,
        });
      }
      if (paragraphs.length === 0) return;
      const start = paragraphs[0].start;
      const end = paragraphs[paragraphs.length - 1].end;
      items.push({
        kind: "listItem",
        start,
        end,
        text: source.slice(start, end),
        sentences: paragraphs.flatMap((p) => p.sentences),
        wordCount: paragraphs.reduce((n, p) => n + p.wordCount, 0),
        level: item.level,
        ordered: item.ordered,
        marker: item.marker,
        blocks: paragraphs,
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

function buildTable(
  rb: Extract<RawBlock, { kind: "table" }>,
  place: (text: string, separator: string) => { start: number; end: number },
  segment: (start: number, end: number) => { sentences: Sentence[]; wordCount: number },
  sourceNow: () => string,
): Block[] {
  const rows: TableRowBlock[] = [];
  let placedAny = false;
  const grid = resolveTableGrid(rb.rows);
  const positions = cellPositions(rb.rows);

  rb.rows.forEach((row, rowIndex) => {
    const cells: TableCellBlock[] = [];

    row.cells.forEach((cell, cellIndex) => {
      const paragraphs: ParagraphBlock[] = [];
      let wordCount = 0;

      cell.blocks.forEach((text, paragraphIndex) => {
        const separator = !placedAny ? "\n\n" : paragraphIndex > 0 ? "\n" : cellIndex > 0 ? "\t" : "\n";
        const { start, end } = place(text, separator);
        placedAny = true;
        const seg = segment(start, end);
        wordCount += seg.wordCount;
        paragraphs.push({
          kind: "paragraph",
          start,
          end,
          text: sourceNow().slice(start, end),
          sentences: seg.sentences,
          wordCount: seg.wordCount,
        });
      });

      const cellStart = paragraphs.length > 0 ? paragraphs[0].start : sourceNow().length;
      const cellEnd = paragraphs.length > 0 ? paragraphs[paragraphs.length - 1].end : cellStart;
      const colSpan = Math.max(1, cell.colSpan ?? 1);

      cells.push({
        kind: "tableCell",
        start: cellStart,
        end: cellEnd,
        text: sourceNow().slice(cellStart, cellEnd),
        blocks: paragraphs,
        colSpan,
        rowSpan: Math.max(1, cell.rowSpan ?? 1),
        header: cell.header === true,
        row: rowIndex,
        column: positions.get(`${rowIndex}:${cellIndex}`)?.column ?? cellIndex,
        wordCount,
      });
    });

    const rowStart = cells.length > 0 ? cells[0].start : sourceNow().length;
    const rowEnd = cells.length > 0 ? cells[cells.length - 1].end : rowStart;
    rows.push({
      kind: "tableRow",
      start: rowStart,
      end: rowEnd,
      text: sourceNow().slice(rowStart, rowEnd),
      cells,
    });
  });

  if (rows.length === 0) return [];
  const start = rows[0].start;
  const end = rows[rows.length - 1].end;
  return [{ kind: "table", start, end, text: sourceNow().slice(start, end), rows, columns: grid.columns }];
}
