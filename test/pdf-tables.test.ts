import { describe, expect, it } from "vitest";
import type { PdfPageGeometry, PdfRule, PdfTextItem } from "@/importers/pdf/geometry";
import { findTables, insideTable, spliceTables } from "@/importers/pdf/tables";
import type { RawBlock } from "@/lucid";

const h = (y: number, left: number, right: number): PdfRule => ({
  left,
  right,
  top: y,
  bottom: y,
  direction: "horizontal",
});
const v = (x: number, top: number, bottom: number): PdfRule => ({
  left: x,
  right: x,
  top,
  bottom,
  direction: "vertical",
});

const at = (text: string, left: number, baseline: number): PdfTextItem => ({
  text,
  left,
  top: baseline,
  width: text.length * 5,
  height: 10,
});

const page = (rules: PdfRule[], items: PdfTextItem[]): PdfPageGeometry => ({
  width: 600,
  height: 800,
  items,
  images: 0,
  rules,
});

const GRID: PdfRule[] = [
  h(100, 50, 250),
  h(130, 50, 250),
  h(160, 50, 250),
  v(50, 100, 160),
  v(150, 100, 160),
  v(250, 100, 160),
];

const CELLS: PdfTextItem[] = [
  at("Categoria", 60, 125),
  at("Vagas", 160, 125),
  at("Cultura", 60, 155),
  at("4", 160, 155),
];

describe("a table drawn as a grid comes back as a table", () => {
  it("reads the columns off the vertical strokes and the rows off the horizontal ones", () => {
    const [table] = findTables([page(GRID, CELLS)]);

    expect(table.rows).toHaveLength(2);
    expect(table.rows[0].cells.map((cell) => cell.blocks.join(""))).toEqual(["Categoria", "Vagas"]);
    expect(table.rows[1].cells.map((cell) => cell.blocks.join(""))).toEqual(["Cultura", "4"]);
  });

  it("marks the first row as the header", () => {
    const [table] = findTables([page(GRID, CELLS)]);

    expect(table.rows[0].cells[0].header).toBe(true);
    expect(table.rows[1].cells[0].header).toBeUndefined();
  });

  it("puts the text in the row the reader sees it in, not one row below", () => {
    const [table] = findTables([page(GRID, CELLS)]);

    expect(table.rows[0].cells[0].blocks).toEqual(["Categoria"]);
  });

  it("reads a merged cell from the stroke that is missing, and spans it", () => {
    const merged: PdfRule[] = [
      h(100, 50, 250),
      h(130, 150, 250),
      h(160, 50, 250),
      v(50, 100, 160),
      v(150, 100, 160),
      v(250, 100, 160),
    ];
    const [table] = findTables([page(merged, CELLS)]);

    expect(table.rows[0].cells[0].rowSpan).toBe(2);
    expect(table.rows[1].cells).toHaveLength(1);
  });

  it("spans a column when no vertical stroke closes the cell", () => {
    const merged: PdfRule[] = [
      h(100, 50, 250),
      h(130, 50, 250),
      h(160, 50, 250),
      v(50, 100, 160),
      v(150, 100, 130),
      v(250, 100, 160),
    ];
    const [table] = findTables([page(merged, CELLS)]);

    expect(table.rows[1].cells[0].colSpan).toBe(2);
  });

  it("refuses a shape that is not a grid: four strokes going the same way are not a table", () => {
    expect(findTables([page([h(100, 50, 250), h(130, 50, 250), h(160, 50, 250), h(190, 50, 250)], CELLS)])).toEqual([]);
  });

  it("gives back nothing when the grid holds no text", () => {
    expect(findTables([page(GRID, [])])).toEqual([]);
  });
});

describe("the lines inside the grid leave the prose", () => {
  it("recognises a line that falls inside the table", () => {
    const [table] = findTables([page(GRID, CELLS)]);
    const line = { text: "Cultura", page: 1, top: 155, left: 60, right: 120, height: 10 };

    expect(insideTable(line, [table])).toBe(true);
  });

  it("leaves a line on another page alone", () => {
    const [table] = findTables([page(GRID, CELLS)]);
    const line = { text: "Cultura", page: 2, top: 155, left: 60, right: 120, height: 10 };

    expect(insideTable(line, [table])).toBe(false);
  });
});

describe("the table goes back where it was", () => {
  const TABLE = { page: 1, top: 100, bottom: 160, left: 50, right: 250, rows: [{ cells: [{ blocks: ["a"] }] }] };
  const BLOCKS: RawBlock[] = [
    { kind: "paragraph", text: "antes" },
    { kind: "paragraph", text: "depois" },
  ];

  it("lands before the first block that starts below it", () => {
    const spliced = spliceTables(
      BLOCKS,
      [
        { page: 1, top: 90 },
        { page: 1, top: 200 },
      ],
      [TABLE],
    );

    expect(spliced.map((block) => block.kind)).toEqual(["paragraph", "table", "paragraph"]);
  });

  it("goes to the end rather than disappearing when no block starts below it", () => {
    const spliced = spliceTables(
      BLOCKS,
      [
        { page: 1, top: 10 },
        { page: 1, top: 20 },
      ],
      [TABLE],
    );

    expect(spliced.map((block) => block.kind)).toEqual(["paragraph", "paragraph", "table"]);
  });

  it("changes nothing when there is no table", () => {
    expect(spliceTables(BLOCKS, [], [])).toEqual(BLOCKS);
  });
});
