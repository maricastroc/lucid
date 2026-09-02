import type { RawTableCell, RawTableRow } from "@/lucid";

export interface Placed {
  readonly cell: RawTableCell;
  readonly column: number;
  readonly columns: number;
  readonly rows: number;
}

export function placeRows(rows: readonly RawTableRow[]): { placed: Placed[][]; columns: number } {
  const covered: number[][] = rows.map(() => []);
  const placed: Placed[][] = rows.map(() => []);
  let columns = 0;

  for (const [r, row] of rows.entries()) {
    let at = 0;
    for (const cell of row.cells) {
      while (covered[r][at] === 1) at += 1;
      const across = Math.max(1, cell.colSpan ?? 1);
      const down = Math.max(1, cell.rowSpan ?? 1);
      placed[r].push({ cell, column: at, columns: across, rows: down });
      for (let dr = 0; dr < down; dr += 1) {
        for (let dc = 0; dc < across; dc += 1) {
          if (covered[r + dr] !== undefined) covered[r + dr][at + dc] = 1;
        }
      }
      at += across;
    }
    columns = Math.max(columns, at);
  }

  return { placed, columns };
}

export type CellMeasure = (cell: RawTableCell) => number;

export function columnWidths(
  placed: readonly Placed[][],
  columns: number,
  available: number,
  measure: CellMeasure,
  floorOf: CellMeasure,
): number[] {
  if (columns === 0) return [];

  const natural = new Array<number>(columns).fill(0);
  const floors = new Array<number>(columns).fill(0);

  for (const row of placed) {
    for (const spot of row) {
      if (spot.columns !== 1) continue;
      natural[spot.column] = Math.max(natural[spot.column], measure(spot.cell));
      floors[spot.column] = Math.max(floors[spot.column], floorOf(spot.cell));
    }
  }

  for (let c = 0; c < columns; c += 1) {
    floors[c] *= 1.02;
    natural[c] = Math.max(natural[c], floors[c]);
  }

  const needed = floors.reduce((sum, value) => sum + value, 0);
  if (needed > available) {
    const scale = available / needed;
    return floors.map((value) => value * scale);
  }

  const width = new Array<number>(columns).fill(0);
  const open = new Set<number>(Array.from({ length: columns }, (_, c) => c));
  let room = available;

  while (open.size > 0) {
    const share = room / open.size;

    const modest = [...open].filter((c) => natural[c] <= share);
    if (modest.length > 0) {
      for (const c of modest) {
        width[c] = natural[c];
        room -= natural[c];
        open.delete(c);
      }
      continue;
    }

    const starved = [...open].filter((c) => floors[c] > share);
    if (starved.length > 0) {
      for (const c of starved) {
        width[c] = floors[c];
        room -= floors[c];
        open.delete(c);
      }
      continue;
    }

    for (const c of open) width[c] = share;
    break;
  }

  const used = width.reduce((sum, value) => sum + value, 0);
  const slack = available - used;
  if (slack > 0.5) {
    const total = natural.reduce((sum, value) => sum + value, 0);
    if (total > 0) for (let c = 0; c < columns; c += 1) width[c] += (natural[c] / total) * slack;
  }

  return width;
}
