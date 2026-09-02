import type { PdfLine, PdfPageGeometry, PdfRule, PdfTextItem } from "./geometry";
import { normalizeImported } from "./lines";
import type { RawBlock, RawTableCell, RawTableRow } from "@/lucid/core/document/structured";

const TOUCH = 2.5;
const MERGE = 4;
const MIN_RULES = 4;
const MIN_SIDE = 2;
const MIN_CELL_WIDTH = 8;
const MIN_CELL_HEIGHT = 6;

export interface PdfTable {
  readonly page: number;
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly rows: readonly RawTableRow[];
}

function touch(a: PdfRule, b: PdfRule): boolean {
  return (
    a.left - TOUCH <= b.right && b.left - TOUCH <= a.right && a.top - TOUCH <= b.bottom && b.top - TOUCH <= a.bottom
  );
}

export function components(rules: readonly PdfRule[]): PdfRule[][] {
  const seen = new Set<number>();
  const found: PdfRule[][] = [];

  for (let start = 0; start < rules.length; start += 1) {
    if (seen.has(start)) continue;

    const group: PdfRule[] = [];
    const queue = [start];
    seen.add(start);

    while (queue.length > 0) {
      const at = queue.pop() as number;
      group.push(rules[at]);
      for (let other = 0; other < rules.length; other += 1) {
        if (seen.has(other) || !touch(rules[at], rules[other])) continue;
        seen.add(other);
        queue.push(other);
      }
    }

    found.push(group);
  }

  return found;
}

export function isGrid(group: readonly PdfRule[]): boolean {
  if (group.length < MIN_RULES) return false;
  const horizontal = group.filter((rule) => rule.direction === "horizontal").length;
  return horizontal >= MIN_SIDE && group.length - horizontal >= MIN_SIDE;
}

function cluster(values: readonly number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const merged: number[] = [];
  for (const value of sorted) {
    const last = merged[merged.length - 1];
    if (last !== undefined && value - last <= MERGE) continue;
    merged.push(value);
  }
  return merged;
}

const centerX = (rule: PdfRule): number => (rule.left + rule.right) / 2;
const centerY = (rule: PdfRule): number => (rule.top + rule.bottom) / 2;

const PARAGRAPH_GAP = 1.6;

function cellText(items: readonly PdfTextItem[]): string[] {
  const sorted = [...items].sort((a, b) => (Math.abs(a.top - b.top) <= 2 ? a.left - b.left : a.top - b.top));

  const lines: { top: number; height: number; parts: string[] }[] = [];
  for (const item of sorted) {
    const open = lines[lines.length - 1];
    if (open !== undefined && Math.abs(item.top - open.top) <= 2) open.parts.push(item.text);
    else lines.push({ top: item.top, height: item.height, parts: [item.text] });
  }

  const leading = lines.length > 1 ? Math.min(...lines.slice(1).map((line, at) => line.top - lines[at].top)) : 0;

  const paragraphs: string[][] = [];
  for (const [at, line] of lines.entries()) {
    const text = line.parts.join(" ");
    const apart = at > 0 && leading > 0 && line.top - lines[at - 1].top > leading * PARAGRAPH_GAP;
    if (at === 0 || apart) paragraphs.push([text]);
    else paragraphs[paragraphs.length - 1].push(text);
  }

  return paragraphs
    .map((parts) => normalizeImported(parts.join(" ")).replace(/\s+/gu, " ").trim())
    .filter((text) => text !== "");
}

function coverage(segments: readonly [number, number][], from: number, to: number): number {
  const span = to - from;
  if (span <= 0) return 1;

  const sorted = [...segments].map(([a, b]) => [Math.max(a, from), Math.min(b, to)] as const).filter(([a, b]) => b > a);
  sorted.sort((a, b) => a[0] - b[0]);

  let total = 0;
  let reach = from;
  for (const [a, b] of sorted) {
    if (b <= reach) continue;
    total += b - Math.max(a, reach);
    reach = b;
  }

  return total / span;
}

const COVERED = 0.6;

function ruledAcross(group: readonly PdfRule[], y: number, x0: number, x1: number): boolean {
  const near = group
    .filter((rule) => rule.direction === "horizontal" && Math.abs(centerY(rule) - y) <= MERGE)
    .map((rule) => [rule.left, rule.right] as [number, number]);
  return coverage(near, x0, x1) >= COVERED;
}

function ruledDown(group: readonly PdfRule[], x: number, y0: number, y1: number): boolean {
  const near = group
    .filter((rule) => rule.direction === "vertical" && Math.abs(centerX(rule) - x) <= MERGE)
    .map((rule) => [rule.top, rule.bottom] as [number, number]);
  return coverage(near, y0, y1) >= COVERED;
}

const NUMERIC = /^[\d.,%R$\s—–-]+$/u;

function looksLikeHeader(row: RawTableRow): boolean {
  const filled = row.cells.filter((cell) => cell.blocks.join(" ").trim() !== "");
  if (filled.length < 2) return false;
  return filled.every((cell) => !NUMERIC.test(cell.blocks.join(" ")));
}

function buildTable(group: readonly PdfRule[], items: readonly PdfTextItem[], page: number): PdfTable | null {
  const columns = cluster(group.filter((rule) => rule.direction === "vertical").map(centerX));
  const rows = cluster(group.filter((rule) => rule.direction === "horizontal").map(centerY));
  if (columns.length < 2 || rows.length < 2) return null;

  const left = columns[0];
  const right = columns[columns.length - 1];
  const top = rows[0];
  const bottom = rows[rows.length - 1];
  if (right - left < MIN_CELL_WIDTH || bottom - top < MIN_CELL_HEIGHT) return null;

  const height = rows.length - 1;
  const width = columns.length - 1;

  const rowSpan: number[][] = [];
  const colSpan: number[][] = [];
  const taken: boolean[][] = [];
  for (let r = 0; r < height; r += 1) {
    rowSpan.push([]);
    colSpan.push([]);
    taken.push([]);
    for (let c = 0; c < width; c += 1) {
      let down = 1;
      while (r + down < height && !ruledAcross(group, rows[r + down], columns[c], columns[c + 1])) down += 1;
      let across = 1;
      while (across + c < width && !ruledDown(group, columns[c + across], rows[r], rows[r + 1])) across += 1;
      rowSpan[r].push(down);
      colSpan[r].push(across);
      taken[r].push(false);
    }
  }

  const origin: ([number, number] | null)[][] = rows.slice(0, -1).map(() => columns.slice(0, -1).map(() => null));
  for (let r = 0; r < height; r += 1) {
    for (let c = 0; c < width; c += 1) {
      if (origin[r][c] !== null) continue;
      for (let dr = 0; dr < rowSpan[r][c]; dr += 1) {
        for (let dc = 0; dc < colSpan[r][c]; dc += 1) {
          if (origin[r + dr]?.[c + dc] === null) origin[r + dr][c + dc] = [r, c];
          if (dr > 0 || dc > 0) taken[r + dr][c + dc] = true;
        }
      }
    }
  }

  const cells: PdfTextItem[][][] = rows.slice(0, -1).map(() => columns.slice(0, -1).map(() => []));

  for (const item of items) {
    const x = item.left + item.width / 2;
    const y = item.top - item.height / 2;
    if (x < left - TOUCH || x > right + TOUCH || y < top - TOUCH || y > bottom + TOUCH) continue;

    let column = -1;
    for (let at = 0; at < width; at += 1) if (x >= columns[at] - TOUCH) column = at;
    let row = -1;
    for (let at = 0; at < height; at += 1) if (y >= rows[at] - TOUCH) row = at;
    if (column < 0 || row < 0) continue;

    const at = origin[row][column] ?? [row, column];
    cells[at[0]][at[1]].push(item);
  }

  const built: RawTableRow[] = [];
  for (let r = 0; r < height; r += 1) {
    const line: RawTableCell[] = [];
    for (let c = 0; c < width; c += 1) {
      if (taken[r][c]) continue;
      line.push({
        blocks: cellText(cells[r][c]),
        ...(colSpan[r][c] > 1 ? { colSpan: colSpan[r][c] } : {}),
        ...(rowSpan[r][c] > 1 ? { rowSpan: rowSpan[r][c] } : {}),
      });
    }
    if (line.length > 0) built.push({ cells: line });
  }

  const filled = built.flatMap((row) => row.cells).filter((cell) => cell.blocks.length > 0).length;
  if (filled === 0) return null;

  const withHeader: RawTableRow[] =
    built.length > 0 && looksLikeHeader(built[0])
      ? [{ cells: built[0].cells.map((cell) => ({ ...cell, header: true })) }, ...built.slice(1)]
      : built;

  return { page, top, bottom, left, right, rows: withHeader };
}

export function findTables(pages: readonly PdfPageGeometry[]): PdfTable[] {
  const tables: PdfTable[] = [];

  for (const [index, page] of pages.entries()) {
    for (const group of components(page.rules)) {
      if (!isGrid(group)) continue;
      const table = buildTable(group, page.items, index + 1);
      if (table !== null) tables.push(table);
    }
  }

  return tables.sort((a, b) => (a.page === b.page ? a.top - b.top : a.page - b.page));
}

export function insideTable(line: PdfLine, tables: readonly PdfTable[]): boolean {
  return tables.some(
    (table) =>
      table.page === line.page &&
      line.top >= table.top - TOUCH &&
      line.top <= table.bottom + TOUCH &&
      line.right >= table.left - TOUCH &&
      line.left <= table.right + TOUCH,
  );
}

export function tableText(tables: readonly PdfTable[]): string {
  return tables.flatMap((table) => table.rows.flatMap((row) => row.cells.flatMap((cell) => cell.blocks))).join("\n");
}

export function spliceTables(
  blocks: readonly RawBlock[],
  anchors: readonly { readonly page: number; readonly top: number }[],
  tables: readonly PdfTable[],
): RawBlock[] {
  if (tables.length === 0) return [...blocks];

  const after = (at: number, table: PdfTable): boolean => {
    const anchor = anchors[at];
    if (anchor === undefined) return false;
    return anchor.page > table.page || (anchor.page === table.page && anchor.top >= table.bottom);
  };

  const out: RawBlock[] = [];
  let pending = 0;

  for (let at = 0; at < blocks.length; at += 1) {
    while (pending < tables.length && after(at, tables[pending])) {
      out.push({ kind: "table", rows: tables[pending].rows });
      pending += 1;
    }
    out.push(blocks[at]);
  }

  for (; pending < tables.length; pending += 1) out.push({ kind: "table", rows: tables[pending].rows });

  return out;
}
