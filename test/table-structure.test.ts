import { describe, expect, it } from "vitest";
import {
  analyzeDocument,
  buildStructuredDocument,
  isRawBlock,
  ptDocumentServices,
  resolveTableGrid,
  spliceStructuredDocument,
  toRawBlocks,
  type Document,
  type RawBlock,
  type TableBlock,
} from "@/lucid";
import { htmlToRawBlocks } from "@/importers/html-blocks";
import { documentToHtml, documentToMarkdown } from "@/app/lib/export-document";
import { blocksToDocx } from "@/exporters/docx";

const build = (blocks: readonly RawBlock[]): Document => buildStructuredDocument(blocks, ptDocumentServices);

const tableOf = (doc: Document): TableBlock => {
  const table = doc.blocks.find((block): block is TableBlock => block.kind === "table");
  if (table === undefined) throw new Error("no table in document");
  return table;
};

const cellText = (doc: Document, row: number, cell: number): string =>
  tableOf(doc)
    .rows[row].cells[cell].blocks.map((paragraph) => paragraph.text)
    .join("\n");

const COMPLEX: RawBlock[] = [
  { kind: "paragraph", text: "A tabela abaixo resume as condições de concessão do benefício." },
  {
    kind: "table",
    rows: [
      {
        cells: [
          { blocks: ["Situação"], header: true },
          { blocks: ["Condições e prazos"], header: true, colSpan: 2 },
        ],
      },
      {
        cells: [
          { blocks: ["Servidor efetivo"], rowSpan: 2 },
          { blocks: ["Até 30 dias."] },
          { blocks: ["A contagem começa na data do requerimento.", "O prazo não corre em recesso."] },
        ],
      },
      { cells: [{ blocks: ["Até 60 dias."] }, { blocks: ["Aplica-se a multa prevista no artigo 5."] }] },
    ],
  },
  { kind: "paragraph", text: "Procure a unidade de gestão de pessoas para pedir a concessão." },
];

const SIMPLE: RawBlock[] = [
  {
    kind: "table",
    rows: [
      {
        cells: [
          { blocks: ["Prazo"], header: true },
          { blocks: ["Valor"], header: true },
        ],
      },
      { cells: [{ blocks: ["30 dias"] }, { blocks: ["R$ 100"] }] },
    ],
  },
];

describe("the grid survives the round trip", () => {
  it("keeps every row, column, span and paragraph the document declared", () => {
    const doc = build(COMPLEX);
    const table = tableOf(doc);

    expect(table.rows).toHaveLength(3);
    expect(table.columns).toBe(3);
    expect(table.rows[0].cells[1].colSpan).toBe(2);
    expect(table.rows[1].cells[0].rowSpan).toBe(2);
    expect(table.rows[0].cells[0].header).toBe(true);
    expect(table.rows[1].cells[2].blocks).toHaveLength(2);
  });

  it("gives a cell that follows a merge its real column, not its position in the row", () => {
    const table = tableOf(build(COMPLEX));

    expect(table.rows[2].cells.map((cell) => cell.column)).toEqual([1, 2]);
    expect(table.rows[1].cells.map((cell) => cell.column)).toEqual([0, 1, 2]);
  });

  it("comes back byte-identical through toRawBlocks and back", () => {
    const doc = build(COMPLEX);
    const rebuilt = build(toRawBlocks(doc.blocks));
    expect(rebuilt.source).toBe(doc.source);
    expect(toRawBlocks(rebuilt.blocks)).toEqual(toRawBlocks(doc.blocks));
  });
});

describe("every stretch of text is addressed inside its own cell", () => {
  it("puts each cell paragraph at its own offsets, in reading order", () => {
    const doc = build(COMPLEX);
    const table = tableOf(doc);
    const paragraphs = table.rows.flatMap((row) => row.cells.flatMap((cell) => cell.blocks));

    for (let i = 1; i < paragraphs.length; i++) {
      expect(paragraphs[i].start).toBeGreaterThanOrEqual(paragraphs[i - 1].end);
    }
    for (const paragraph of paragraphs) {
      expect(doc.source.slice(paragraph.start, paragraph.end)).toBe(paragraph.text);
    }
  });

  it("lands a finding inside the cell that produced it and nowhere else", () => {
    const doc = build(COMPLEX);
    const diagnostic = analyzeDocument(doc);
    const passive = diagnostic.findings.filter((f) => f.criterion === "passiva_sintetica");

    expect(passive.length).toBeGreaterThan(0);
    const target = tableOf(doc).rows[2].cells[1].blocks[0];
    expect(passive[0].span.start).toBeGreaterThanOrEqual(target.start);
    expect(passive[0].span.end).toBeLessThanOrEqual(target.end);
  });
});

describe("editing one cell leaves the others exactly where they were", () => {
  const editCell = (doc: Document, from: string, to: string): Document => {
    const at = doc.source.indexOf(from);
    expect(at).toBeGreaterThan(-1);
    const next = doc.source.slice(0, at) + to + doc.source.slice(at + from.length);
    const result = spliceStructuredDocument(doc, next, ptDocumentServices);
    if (!result.ok) throw new Error(`splice refused: ${result.reason}`);
    return result.document;
  };

  it("applies a change to one cell without shifting or corrupting any other", () => {
    const doc = build(COMPLEX);
    const before = toRawBlocks(doc.blocks);
    const edited = editCell(doc, "Até 30 dias.", "Até 30 dias corridos.");
    const after = toRawBlocks(edited.blocks);

    expect(cellText(edited, 1, 1)).toBe("Até 30 dias corridos.");
    expect(after.filter((_, i) => i !== 1)).toEqual(before.filter((_, i) => i !== 1));
    expect(cellText(edited, 1, 2)).toBe(cellText(doc, 1, 2));
    expect(cellText(edited, 2, 1)).toBe(cellText(doc, 2, 1));
    expect(tableOf(edited).rows[1].cells[0].rowSpan).toBe(2);
    expect(tableOf(edited).columns).toBe(3);
  });

  it("edits the second paragraph of a cell without touching the first", () => {
    const doc = build(COMPLEX);
    const edited = editCell(doc, "O prazo não corre em recesso.", "O prazo para em recesso.");

    expect(cellText(edited, 1, 2)).toBe("A contagem começa na data do requerimento.\nO prazo para em recesso.");
  });

  it("undoes a cell edit back to the original text, byte for byte", () => {
    const doc = build(COMPLEX);
    const edited = editCell(doc, "Até 30 dias.", "Até 30 dias corridos.");
    const undone = spliceStructuredDocument(edited, doc.source, ptDocumentServices);

    expect(undone.ok).toBe(true);
    if (undone.ok) {
      expect(undone.document.source).toBe(doc.source);
      expect(toRawBlocks(undone.document.blocks)).toEqual(toRawBlocks(doc.blocks));
    }
  });

  it("empties a cell without removing it, so the column below stays where it belongs", () => {
    const doc = build(COMPLEX);
    const edited = editCell(doc, "Até 60 dias.", "");
    const table = tableOf(edited);

    expect(table.rows[2].cells).toHaveLength(2);
    expect(table.rows[2].cells[0].blocks).toEqual([]);
    expect(cellText(edited, 2, 1)).toBe("Aplica-se a multa prevista no artigo 5.");
    expect(table.columns).toBe(3);
  });

  it("refuses a change that would move text from one cell into another", () => {
    const doc = build(COMPLEX);
    const from = doc.source.indexOf("Até 30 dias.");
    const to = doc.source.indexOf("recesso.") + "recesso.".length;
    const next = doc.source.slice(0, from) + "Prazo único." + doc.source.slice(to);

    const result = spliceStructuredDocument(doc, next, ptDocumentServices);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("crosses_cells");
  });

  it("still edits the prose around the table the way it always did", () => {
    const doc = build(COMPLEX);
    const edited = editCell(doc, "Procure a unidade", "Vá à unidade");

    expect(edited.blocks[2].text).toBe("Vá à unidade de gestão de pessoas para pedir a concessão.");
    expect(toRawBlocks(edited.blocks)[1]).toEqual(toRawBlocks(doc.blocks)[1]);
  });
});

describe("the audit reads cells as text without pretending they are prose", () => {
  it("audits the text inside a cell", () => {
    const doc = build(SIMPLE);
    const withJargon = build([
      { kind: "table", rows: [{ cells: [{ blocks: ["Aplica-se o prazo supracitado ao servidor."] }] }] },
    ]);

    expect(analyzeDocument(doc).findings).toBeDefined();
    expect(analyzeDocument(withJargon).findings.some((f) => f.criterion === "jargon")).toBe(true);
  });

  it("keeps a cell's sentences inside the cell, never running one into the next", () => {
    const doc = build(SIMPLE);
    for (const sentence of doc.sentences) {
      expect(sentence.text).not.toContain("\t");
      expect(sentence.text).not.toContain("\n");
    }
  });

  it("leaves table words out of the readability numbers and counts them apart", () => {
    const prose = "A comissão analisou o pedido e concluiu que o prazo começa na data do requerimento.";
    const withoutTable = analyzeDocument(build([{ kind: "paragraph", text: prose }]));
    const withTable = analyzeDocument(build([{ kind: "paragraph", text: prose }, ...SIMPLE]));

    expect(withTable.metrics.fleschPt).toBe(withoutTable.metrics.fleschPt);
    expect(withTable.metrics.words).toBe(withoutTable.metrics.words);
    expect(withTable.metrics.sentences).toBe(withoutTable.metrics.sentences);

    const everyWord = build([{ kind: "paragraph", text: prose }, ...SIMPLE]).tokens.filter((t) => t.isWord).length;
    expect(withTable.metrics.tables).toMatchObject({ tables: 1, cells: 4, sentences: 4 });
    expect(withTable.metrics.tables!.words).toBe(everyWord - withTable.metrics.words);
    expect(withTable.metrics.tables!.words).toBeGreaterThan(0);
  });

  it("reports no table figure at all for a document that has none", () => {
    const diagnostic = analyzeDocument(build([{ kind: "paragraph", text: "Um parágrafo comum e curto." }]));
    expect("tables" in diagnostic.metrics).toBe(false);
  });
});

describe("the grid survives storage and every export", () => {
  it("comes back identical from the JSON a saved workspace would hold", () => {
    const blocks = toRawBlocks(build(COMPLEX).blocks);
    const reopened = build(JSON.parse(JSON.stringify(blocks)) as RawBlock[]);

    expect(toRawBlocks(reopened.blocks)).toEqual(blocks);
    expect(reopened.source).toBe(build(COMPLEX).source);
  });

  it("writes a real table into the .docx, with the merges Word understands", () => {
    const xml = new TextDecoder().decode(blocksToDocx(toRawBlocks(build(COMPLEX).blocks)));

    expect(xml).toContain("<w:tbl>");
    expect(xml).toContain('<w:gridSpan w:val="2"/>');
    expect(xml).toContain('<w:vMerge w:val="restart"/>');
    expect(xml).toContain('<w:vMerge w:val="continue"/>');
    expect(xml.match(/<w:tr>/g)).toHaveLength(3);
  });

  it("keeps the merges in the HTML export and says plainly what Markdown drops", () => {
    const blocks = toRawBlocks(build(COMPLEX).blocks);

    const html = documentToHtml(blocks);
    expect(html).toContain('<th colspan="2">');
    expect(html).toContain('<td rowspan="2">');

    const markdown = documentToMarkdown(blocks);
    expect(markdown).toContain("| Situação | Condições e prazos |  |");
    expect(markdown).toContain("| --- | --- | --- |");
  });

  it("reads the same grid back out of the HTML it exported", () => {
    const blocks = toRawBlocks(build(COMPLEX).blocks);
    const reimported = htmlToRawBlocks(documentToHtml(blocks));

    expect(reimported).toEqual(blocks);
  });
});

describe("what the importer reads from real markup", () => {
  it("recovers rows, spans, headers and multi-paragraph cells from pasted HTML", () => {
    const blocks = htmlToRawBlocks(
      "<table><tr><th>Situação</th><th colspan=2>Condições</th></tr>" +
        "<tr><td rowspan=2>Efetivo</td><td>30 dias</td><td><p>Conta do pedido.</p><p>Não corre em recesso.</p></td></tr>" +
        "<tr><td>60 dias</td><td>Multa</td></tr></table>",
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      kind: "table",
      rows: [
        {
          cells: [
            { blocks: ["Situação"], header: true, colSpan: undefined, rowSpan: undefined },
            { blocks: ["Condições"], header: true, colSpan: 2, rowSpan: undefined },
          ],
        },
        {
          cells: [
            { blocks: ["Efetivo"], header: undefined, colSpan: undefined, rowSpan: 2 },
            { blocks: ["30 dias"], header: undefined, colSpan: undefined, rowSpan: undefined },
            {
              blocks: ["Conta do pedido.", "Não corre em recesso."],
              header: undefined,
              colSpan: undefined,
              rowSpan: undefined,
            },
          ],
        },
        {
          cells: [
            { blocks: ["60 dias"], header: undefined, colSpan: undefined, rowSpan: undefined },
            { blocks: ["Multa"], header: undefined, colSpan: undefined, rowSpan: undefined },
          ],
        },
      ],
    });
  });

  it("does not mistake the paragraphs around a table for cells", () => {
    const blocks = htmlToRawBlocks("<p>Antes.</p><table><tr><td>Dentro.</td></tr></table><p>Depois.</p>");
    expect(blocks.map((block) => block.kind)).toEqual(["paragraph", "table", "paragraph"]);
  });

  it("resolves a staircase of merges the way a browser lays it out", () => {
    const grid = resolveTableGrid([
      { cells: [{ blocks: ["a"], rowSpan: 3 }, { blocks: ["b"] }] },
      { cells: [{ blocks: ["c"], rowSpan: 2 }] },
      { cells: [] },
    ]);

    expect(grid.columns).toBe(2);
    expect(grid.rows[1].map((slot) => [slot.column, slot.cell === null])).toEqual([
      [0, true],
      [1, false],
    ]);
    expect(grid.rows[2].map((slot) => [slot.column, slot.cell === null])).toEqual([
      [0, true],
      [1, true],
    ]);
  });
});

describe("the full cycle a document actually goes through", () => {
  const reimport = async (bytes: Uint8Array): Promise<RawBlock[]> => {
    const mammoth = (await import("mammoth")).default;
    const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
    return htmlToRawBlocks(html);
  };

  it("import → review → save → reopen → export keeps the same grid and the same edit", async () => {
    const imported = htmlToRawBlocks(
      "<p>Antes.</p>" +
        "<table><tr><th>Situação</th><th colspan=2>Condições</th></tr>" +
        "<tr><td rowspan=2>Efetivo</td><td>Até 30 dias.</td><td><p>Conta do pedido.</p><p>Não corre em recesso.</p></td></tr>" +
        "<tr><td>Até 60 dias.</td><td>Aplica-se a multa.</td></tr></table>" +
        "<p>Depois.</p>",
    );
    const doc = build(imported);

    const at = doc.source.indexOf("Até 30 dias.");
    const edit = spliceStructuredDocument(
      doc,
      `${doc.source.slice(0, at)}Até 30 dias corridos.${doc.source.slice(at + "Até 30 dias.".length)}`,
      ptDocumentServices,
    );
    expect(edit.ok).toBe(true);
    if (!edit.ok) return;

    const stored = JSON.stringify({ blocks: toRawBlocks(edit.document.blocks) });
    const read = JSON.parse(stored) as { blocks: unknown[] };
    expect(read.blocks.every(isRawBlock)).toBe(true);
    const reopened = build(read.blocks as RawBlock[]);

    expect(reopened.source).toBe(edit.document.source);
    expect(cellText(reopened, 1, 1)).toBe("Até 30 dias corridos.");
    expect(tableOf(reopened).rows[1].cells[0].rowSpan).toBe(2);
    expect(tableOf(reopened).columns).toBe(3);

    const roundTripped = await reimport(blocksToDocx(toRawBlocks(reopened.blocks)));
    const table = roundTripped.find((block) => block.kind === "table");
    expect(table).toBeDefined();
    if (table?.kind !== "table") return;

    expect(table.rows).toHaveLength(3);
    expect(resolveTableGrid(table.rows).columns).toBe(3);
    expect(table.rows[0].cells[1].colSpan).toBe(2);
    expect(table.rows[1].cells[0].rowSpan).toBe(2);
    expect(table.rows[1].cells[1].blocks).toEqual(["Até 30 dias corridos."]);
    expect(table.rows[1].cells[2].blocks).toEqual(["Conta do pedido.", "Não corre em recesso."]);
    expect(roundTripped.filter((block) => block.kind === "paragraph").map((block) => block.text)).toEqual([
      "Antes.",
      "Depois.",
    ]);
  });

  it("keeps a simple table intact through the same cycle", async () => {
    const roundTripped = await reimport(blocksToDocx(SIMPLE));
    expect(roundTripped).toEqual(SIMPLE);
  });
});

describe("what the .docx cannot carry is said, not hidden", () => {
  it("keeps a header row, and loses a header cell inside a mixed row", async () => {
    const mixed: RawBlock[] = [
      {
        kind: "table",
        rows: [
          {
            cells: [
              { blocks: ["Coluna A"], header: true },
              { blocks: ["Coluna B"], header: true },
            ],
          },
          { cells: [{ blocks: ["Rótulo"], header: true }, { blocks: ["Valor"] }] },
        ],
      },
    ];

    const mammoth = (await import("mammoth")).default;
    const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(blocksToDocx(mixed)) });
    const back = htmlToRawBlocks(html);
    if (back[0]?.kind !== "table") throw new Error("expected a table");

    expect(back[0].rows[0].cells.map((cell) => cell.header)).toEqual([true, true]);
    expect(back[0].rows[1].cells.map((cell) => cell.header)).toEqual([undefined, undefined]);
    expect(back[0].rows[1].cells.map((cell) => cell.blocks)).toEqual([["Rótulo"], ["Valor"]]);
  });
});
