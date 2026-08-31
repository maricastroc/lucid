import type { RawTableCell, RawTableRow } from "./structured";

export interface GridSlot {
  readonly cell: RawTableCell | null;
  readonly row: number;
  readonly column: number;
  readonly colSpan: number;
  readonly rowSpan: number;
}

export interface ResolvedGrid {
  readonly columns: number;
  readonly rows: readonly (readonly GridSlot[])[];
}

export function resolveTableGrid(rows: readonly RawTableRow[]): ResolvedGrid {
  const carry: { remaining: number; colSpan: number; rowSpan: number }[] = [];
  const resolved: GridSlot[][] = [];
  let columns = 0;

  rows.forEach((row, rowIndex) => {
    const slots: GridSlot[] = [];
    let column = 0;

    const occupied = (at: number): boolean => (carry[at]?.remaining ?? 0) > 0;

    for (const cell of row.cells) {
      while (occupied(column)) {
        const held = carry[column];
        slots.push({ cell: null, row: rowIndex, column, colSpan: held.colSpan, rowSpan: held.rowSpan });
        column += held.colSpan;
      }

      const colSpan = Math.max(1, Math.trunc(cell.colSpan ?? 1));
      const rowSpan = Math.max(1, Math.trunc(cell.rowSpan ?? 1));
      slots.push({ cell, row: rowIndex, column, colSpan, rowSpan });

      for (let c = column; c < column + colSpan; c++) {
        carry[c] = { remaining: rowSpan, colSpan, rowSpan };
      }
      column += colSpan;
    }

    while (occupied(column)) {
      const held = carry[column];
      slots.push({ cell: null, row: rowIndex, column, colSpan: held.colSpan, rowSpan: held.rowSpan });
      column += held.colSpan;
    }

    columns = Math.max(columns, column);
    resolved.push(slots);
    for (let c = 0; c < carry.length; c++) {
      if (carry[c] !== undefined && carry[c].remaining > 0)
        carry[c] = { ...carry[c], remaining: carry[c].remaining - 1 };
    }
  });

  return { columns, rows: resolved };
}

export function cellPositions(rows: readonly RawTableRow[]): Map<string, { row: number; column: number }> {
  const grid = resolveTableGrid(rows);
  const positions = new Map<string, { row: number; column: number }>();
  grid.rows.forEach((slots, rowIndex) => {
    let cellIndex = 0;
    for (const slot of slots) {
      if (slot.cell === null) continue;
      positions.set(`${rowIndex}:${cellIndex}`, { row: rowIndex, column: slot.column });
      cellIndex += 1;
    }
  });
  return positions;
}
