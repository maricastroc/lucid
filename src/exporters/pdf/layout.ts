import type { RawBlock, RawTableCell, RawTableRow } from "@/lucid/core/document/structured";
import { normalizeListItem } from "@/lucid/core/document/structured";
import { columnWidths, placeRows, type Placed } from "../table-widths";
import {
  contentHeight,
  contentWidth,
  type FontFamily,
  type FontWeight,
  type PageTheme,
  type TypeStyle,
} from "../page-theme";
import { wrapText, type Measure } from "./wrap";

export interface DrawText {
  readonly kind: "text";
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly family: FontFamily;
  readonly weight: FontWeight;
  readonly size: number;
  readonly color: string;
}

export interface DrawLine {
  readonly kind: "line";
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly color: string;
  readonly width: number;
}

export interface DrawRect {
  readonly kind: "rect";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
}

export type Draw = DrawText | DrawLine | DrawRect;

export interface LaidOutPage {
  readonly commands: readonly Draw[];
}

export interface LayoutOptions {
  readonly footer?: (page: number, total: number) => string;
}

const MIN_ROW = 18;
const MIN_FRAGMENT = 46;

const cellStyle = (cell: RawTableCell, theme: PageTheme): TypeStyle =>
  cell.header === true ? theme.tableHeader : theme.tableCell;

interface CellLines {
  readonly spot: Placed;
  readonly lines: readonly string[][];
  readonly style: TypeStyle;
  readonly x: number;
  readonly width: number;
}

class Painter {
  private readonly pages: Draw[][] = [[]];
  private y: number;

  constructor(
    private readonly theme: PageTheme,
    private readonly measure: Measure,
  ) {
    this.y = theme.margin.top;
    this.background();
  }

  private background(): void {
    this.pages[this.pages.length - 1].push({
      kind: "rect",
      x: 0,
      y: 0,
      width: this.theme.width,
      height: this.theme.height,
      color: this.theme.sheet,
    });
  }

  get bottom(): number {
    return this.theme.margin.top + contentHeight(this.theme);
  }

  get cursor(): number {
    return this.y;
  }

  get pageCount(): number {
    return this.pages.length;
  }

  push(command: Draw): void {
    this.pages[this.pages.length - 1].push(command);
  }

  advance(by: number): void {
    this.y += by;
  }

  break(): void {
    this.pages.push([]);
    this.y = this.theme.margin.top;
    this.background();
  }

  need(height: number): boolean {
    if (this.y + height <= this.bottom) return false;
    this.break();
    return true;
  }

  line(text: string, style: TypeStyle, width: number): string[] {
    return wrapText(text, width, this.measure, style.family, style.weight, style.size);
  }

  write(text: string, x: number, style: TypeStyle): void {
    this.push({
      kind: "text",
      x,
      y: this.y + style.size,
      text,
      family: style.family,
      weight: style.weight,
      size: style.size,
      color: style.color,
    });
  }

  finish(options: LayoutOptions): LaidOutPage[] {
    const total = this.pages.length;
    if (options.footer !== undefined) {
      for (const [index, page] of this.pages.entries()) {
        const label = options.footer(index + 1, total);
        if (label === "") continue;
        page.push({
          kind: "text",
          x:
            this.theme.width - this.theme.margin.right - this.measure(label, "sans", "regular", this.theme.footer.size),
          y: this.theme.height - this.theme.margin.bottom + 26,
          text: label,
          family: this.theme.footer.family,
          weight: this.theme.footer.weight,
          size: this.theme.footer.size,
          color: this.theme.footer.color,
        });
      }
    }
    return this.pages.map((commands) => ({ commands }));
  }
}

function paragraph(painter: Painter, text: string, x: number, width: number, style: TypeStyle): void {
  const lines = painter.line(text, style, width);
  if (lines.length === 0) return;

  painter.advance(style.spaceBefore);

  for (const [at, line] of lines.entries()) {
    const paired = (at === 0 && lines.length > 1) || at === lines.length - 2;
    painter.need(paired ? style.leading * 2 : style.leading);
    painter.write(line, x, style);
    painter.advance(style.leading);
  }

  painter.advance(style.spaceAfter);
}

function headingStyle(theme: PageTheme, level: number): TypeStyle {
  return theme.headings[Math.min(theme.headings.length, Math.max(1, level)) - 1];
}

function generatedMarker(counters: number[], level: number, ordered: boolean): string {
  if (!ordered) return "•";
  return `${counters[level]}.`;
}

interface CellEntry {
  readonly text: string;
  readonly leading: number;
}

function entriesOf(cell: CellLines): CellEntry[] {
  const out: CellEntry[] = [];
  for (const [at, block] of cell.lines.entries()) {
    for (const line of block) out.push({ text: line, leading: cell.style.leading });
    if (block.length > 0 && at < cell.lines.length - 1) out.push({ text: "", leading: cell.style.spaceAfter });
  }
  return out;
}

function drawTable(
  painter: Painter,
  rows: readonly RawTableRow[],
  left: number,
  available: number,
  theme: PageTheme,
  measure: Measure,
): void {
  const { placed, columns } = placeRows(rows);
  if (columns === 0) return;

  const pad = theme.cellPadding.x * 2;
  const widths = columnWidths(
    placed,
    columns,
    available,
    (cell) => {
      const style = cellStyle(cell, theme);
      return measure(cell.blocks.join(" "), style.family, style.weight, style.size) + pad;
    },
    (cell) => {
      const style = cellStyle(cell, theme);
      const words = cell.blocks
        .join(" ")
        .split(/\s+/u)
        .filter((word) => word !== "");
      const longest = words.reduce(
        (at, word) => Math.max(at, measure(word, style.family, style.weight, style.size)),
        0,
      );
      return longest + pad;
    },
  );
  const offset = (column: number): number => left + widths.slice(0, column).reduce((sum, value) => sum + value, 0);
  const spanWidth = (spot: Placed): number =>
    widths.slice(spot.column, spot.column + spot.columns).reduce((sum, value) => sum + value, 0);

  const prepared: CellLines[][] = placed.map((row) =>
    row.map((spot) => {
      const style = cellStyle(spot.cell, theme);
      const width = spanWidth(spot) - theme.cellPadding.x * 2;
      return {
        spot,
        style,
        x: offset(spot.column) + theme.cellPadding.x,
        width,
        lines: spot.cell.blocks.map((text) => wrapText(text, width, measure, style.family, style.weight, style.size)),
      };
    }),
  );

  const queues: CellEntry[][][] = prepared.map((row) => row.map(entriesOf));
  const contentHeightOf = (entries: readonly CellEntry[], from = 0): number =>
    entries.slice(from).reduce((sum, entry) => sum + entry.leading, 0);

  const rowHeights = prepared.map((row, r) =>
    row.reduce(
      (tallest, cell, c) =>
        cell.spot.rows === 1 ? Math.max(tallest, contentHeightOf(queues[r][c]) + theme.cellPadding.y * 2) : tallest,
      MIN_ROW,
    ),
  );

  for (const [r, row] of prepared.entries()) {
    for (const [c, cell] of row.entries()) {
      if (cell.spot.rows === 1) continue;
      const reach = rowHeights.slice(r, r + cell.spot.rows);
      const have = reach.reduce((sum, value) => sum + value, 0);
      const want = contentHeightOf(queues[r][c]) + theme.cellPadding.y * 2;
      if (want <= have) continue;
      const extra = (want - have) / reach.length;
      for (let at = r; at < r + cell.spot.rows && at < rowHeights.length; at += 1) rowHeights[at] += extra;
    }
  }

  const hasHeader = prepared[0] !== undefined && prepared[0].every((cell) => cell.spot.cell.header === true);

  const border = (x1: number, y1: number, x2: number, y2: number): void => {
    painter.push({ kind: "line", x1, y1, x2, y2, color: theme.rule, width: 0.6 });
  };

  const drawBand = (index: number, cursors: number[], budget: number, whole: boolean): number => {
    const top = painter.cursor;
    const room = budget - theme.cellPadding.y * 2;
    let used = 0;
    const written: Draw[] = [];

    for (const [c, cell] of prepared[index].entries()) {
      const queue = queues[index][c];
      let y = top + theme.cellPadding.y;
      let taken = 0;

      while (cursors[c] < queue.length) {
        const entry = queue[cursors[c]];
        if (!whole && taken + entry.leading > room) break;
        if (entry.text !== "") {
          written.push({
            kind: "text",
            x: cell.x,
            y: y + cell.style.size,
            text: entry.text,
            family: cell.style.family,
            weight: cell.style.weight,
            size: cell.style.size,
            color: cell.style.color,
          });
        }
        y += entry.leading;
        taken += entry.leading;
        cursors[c] += 1;
      }

      used = Math.max(used, taken);
    }

    const height = whole ? budget : Math.min(budget, used + theme.cellPadding.y * 2);

    for (const cell of prepared[index]) {
      const box = whole
        ? rowHeights.slice(index, index + cell.spot.rows).reduce((sum, value) => sum + value, 0)
        : height;
      if (cell.spot.cell.header === true) {
        painter.push({
          kind: "rect",
          x: offset(cell.spot.column),
          y: top,
          width: spanWidth(cell.spot),
          height: box,
          color: theme.headerFill,
        });
      }
      border(offset(cell.spot.column), top, offset(cell.spot.column) + spanWidth(cell.spot), top);
      border(offset(cell.spot.column), top, offset(cell.spot.column), top + box);
    }

    for (const command of written) painter.push(command);

    return height;
  };

  const redrawHeader = (): void => {
    if (!hasHeader) return;
    const cursors = new Array<number>(prepared[0].length).fill(0);
    drawBand(0, cursors, rowHeights[0], true);
    painter.advance(rowHeights[0]);
  };

  let opened = painter.cursor;
  const closeRight = (): void => {
    border(left + available, opened, left + available, painter.cursor);
  };
  const closeBottom = (): void => {
    border(left, painter.cursor, left + available, painter.cursor);
  };
  const nextPage = (): void => {
    closeRight();
    closeBottom();
    painter.break();
    opened = painter.cursor;
    redrawHeader();
  };

  for (const [index, height] of rowHeights.entries()) {
    const cursors = new Array<number>(prepared[index].length).fill(0);

    if (height <= contentHeight(theme) - (hasHeader ? rowHeights[0] : 0)) {
      if (painter.cursor + height > painter.bottom) nextPage();
      const drawn = drawBand(index, cursors, height, true);
      painter.advance(drawn);
      continue;
    }

    while (true) {
      const room = painter.bottom - painter.cursor;
      if (room < MIN_FRAGMENT) {
        nextPage();
        continue;
      }
      const drawn = drawBand(index, cursors, room, false);
      painter.advance(drawn);
      if (cursors.every((at, c) => at >= queues[index][c].length)) break;
      nextPage();
    }
  }

  closeRight();
  closeBottom();
}

export function layout(
  blocks: readonly RawBlock[],
  theme: PageTheme,
  measure: Measure,
  options: LayoutOptions = {},
): LaidOutPage[] {
  const painter = new Painter(theme, measure);
  const left = theme.margin.left;
  const available = contentWidth(theme);

  for (const block of blocks) {
    if (block.kind === "heading") {
      const style = headingStyle(theme, block.level);
      painter.advance(style.spaceBefore);
      painter.need(style.leading + theme.body.leading + style.spaceAfter);
      for (const line of painter.line(block.text, style, available)) {
        painter.need(style.leading);
        painter.write(line, left, style);
        painter.advance(style.leading);
      }
      painter.advance(style.spaceAfter);
      continue;
    }

    if (block.kind === "list") {
      const counters: number[] = [];
      let previous = -1;
      for (const stored of block.items) {
        const item = normalizeListItem(stored, block.ordered);
        if (item.level > previous) counters[item.level] = 0;
        counters[item.level] = (counters[item.level] ?? 0) + 1;
        previous = item.level;

        const marker = item.marker ?? generatedMarker(counters, item.level, item.ordered);
        const indent = left + item.level * theme.indentPerLevel;
        const markerWidth = Math.max(
          measure(marker, theme.listMarker.family, theme.listMarker.weight, theme.listMarker.size) + theme.markerGap,
          theme.markerGap * 2,
        );
        const body = indent + markerWidth;
        const width = available - (body - left);

        for (const [at, text] of item.blocks.entries()) {
          const lines = wrapText(text, width, measure, theme.body.family, theme.body.weight, theme.body.size);
          for (const [li, line] of lines.entries()) {
            painter.need(theme.body.leading);
            if (at === 0 && li === 0) painter.write(marker, indent, theme.listMarker);
            painter.write(line, body, theme.body);
            painter.advance(theme.body.leading);
          }
          if (at < item.blocks.length - 1) painter.advance(theme.body.spaceAfter * 0.6);
        }
        painter.advance(theme.body.spaceAfter * 0.55);
      }
      painter.advance(theme.body.spaceAfter);
      continue;
    }

    if (block.kind === "table") {
      painter.advance(theme.body.spaceAfter);
      painter.need(60);
      drawTable(painter, block.rows, left, available, theme, measure);
      painter.advance(theme.body.spaceAfter * 1.6);
      continue;
    }

    paragraph(painter, block.text, left, available, theme.body);
  }

  return painter.finish(options);
}
