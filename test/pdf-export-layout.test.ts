import { describe, expect, it } from "vitest";
import type { RawBlock } from "@/lucid";
import { A4, layout, type Draw, type LaidOutPage } from "@/exporters/pdf";
import type { Measure } from "@/exporters/pdf/wrap";

const measure: Measure = (text, _family, weight, size) => text.length * size * 0.5 * (weight === "bold" ? 1.1 : 1);

const texts = (pages: readonly LaidOutPage[]): string[] =>
  pages.flatMap((page) =>
    page.commands.filter((c): c is Extract<Draw, { kind: "text" }> => c.kind === "text").map((c) => c.text),
  );

const words = (value: string): string[] => value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

const LOREM =
  "O proponente deverá apresentar o plano de trabalho no prazo indicado, sob pena de perda da vaga e " +
  "convocação do suplente conforme a ordem de classificação divulgada pela comissão de seleção. ";

const longDocument = (paragraphs: number): RawBlock[] =>
  Array.from(
    { length: paragraphs },
    (_, at) => ({ kind: "paragraph", text: `${at + 1}. ${LOREM.repeat(3)}` }) as RawBlock,
  );

describe("the laid out page keeps everything inside the paper", () => {
  it("never writes a line below the bottom margin", () => {
    const pages = layout(longDocument(40), A4, measure);
    const bottom = A4.height - A4.margin.bottom;

    for (const page of pages) {
      for (const command of page.commands) {
        if (command.kind !== "text") continue;
        expect(command.y - command.size).toBeLessThanOrEqual(bottom);
      }
    }
  });

  it("never writes a line above the top margin", () => {
    const pages = layout(longDocument(40), A4, measure);

    for (const page of pages) {
      for (const command of page.commands) {
        if (command.kind !== "text") continue;
        expect(command.y - command.size).toBeGreaterThanOrEqual(A4.margin.top - 0.01);
      }
    }
  });

  it("uses more than one page when the text asks for it", () => {
    expect(layout(longDocument(40), A4, measure).length).toBeGreaterThan(1);
  });

  it("loses no word between the blocks it was given and the page it drew", () => {
    const blocks = longDocument(25);
    const pages = layout(blocks, A4, measure);

    const before = blocks.flatMap((block) => (block.kind === "paragraph" ? words(block.text) : []));
    const after = words(texts(pages).join(" "));
    const budget = new Map<string, number>();
    for (const word of after) budget.set(word, (budget.get(word) ?? 0) + 1);

    const missing = before.filter((word) => {
      const left = budget.get(word) ?? 0;
      if (left === 0) return true;
      budget.set(word, left - 1);
      return false;
    });

    expect(missing).toEqual([]);
  });

  it("numbers the pages when asked, and leaves them bare when not", () => {
    const withFooter = layout(longDocument(40), A4, measure, { footer: (p, t) => `${p} de ${t}` });
    const bare = layout(longDocument(40), A4, measure);

    expect(texts(withFooter)).toContain(`1 de ${withFooter.length}`);
    expect(texts(bare).some((t) => /^\d+ de \d+$/u.test(t))).toBe(false);
  });
});

describe("a heading does not end a page alone", () => {
  it("moves down with the text it introduces", () => {
    const blocks: RawBlock[] = [
      ...longDocument(11),
      { kind: "heading", level: 2, text: "DA HABILITAÇÃO" },
      { kind: "paragraph", text: LOREM },
    ];
    const pages = layout(blocks, A4, measure);

    for (const page of pages) {
      const written = page.commands.filter((c): c is Extract<Draw, { kind: "text" }> => c.kind === "text");
      const last = written[written.length - 1];
      if (last?.text !== "DA HABILITAÇÃO") continue;
      throw new Error("o título ficou sozinho no pé da página");
    }
  });
});

describe("a nested list keeps its levels", () => {
  const LIST: RawBlock = {
    kind: "list",
    ordered: true,
    items: [
      { blocks: ["Primeiro"], level: 0, ordered: true, marker: "2.1." },
      { blocks: ["Fundo"], level: 2, ordered: true, marker: "2.1.1.1." },
      { blocks: ["Sem rótulo"], level: 1, ordered: true },
    ],
  };

  it("indents each level further than the one above", () => {
    const [page] = layout([LIST], A4, measure);
    const at = (label: string) =>
      page.commands.find((c): c is Extract<Draw, { kind: "text" }> => c.kind === "text" && c.text === label)!.x;

    expect(at("2.1.")).toBeLessThan(at("2.1.1.1."));
    expect(at("Primeiro")).toBeLessThan(at("Fundo"));
  });

  it("prints the label the document wrote instead of counting again", () => {
    const written = texts(layout([LIST], A4, measure));

    expect(written).toContain("2.1.");
    expect(written).toContain("2.1.1.1.");
  });

  it("counts only where the document gave no label, starting that level at one", () => {
    const written = texts(layout([LIST], A4, measure));

    expect(written.filter((t) => t === "1.")).toHaveLength(1);
  });
});

describe("a table taller than the page is cut by line, not by content", () => {
  const tall: RawBlock = {
    kind: "table",
    rows: [
      {
        cells: [
          { blocks: ["Critério"], header: true },
          { blocks: ["Peso"], header: true },
        ],
      },
      { cells: [{ blocks: [LOREM.repeat(30)] }, { blocks: ["4"] }] },
    ],
  };

  it("spills onto more than one page instead of drawing past the paper", () => {
    const pages = layout([tall], A4, measure);
    const bottom = A4.height - A4.margin.bottom;

    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      for (const command of page.commands) {
        if (command.kind !== "text") continue;
        expect(command.y - command.size).toBeLessThanOrEqual(bottom);
      }
    }
  });

  it("repeats the header so the second page still says what the column is", () => {
    const pages = layout([tall], A4, measure);
    const headed = pages.filter((page) => page.commands.some((c) => c.kind === "text" && c.text === "Critério"));

    expect(headed.length).toBe(pages.length);
  });

  it("carries every word of the cell across the break", () => {
    const pages = layout([tall], A4, measure);
    const before = words(LOREM.repeat(30));
    const after = words(texts(pages).join(" "));

    expect(after.length).toBeGreaterThanOrEqual(before.length);
  });
});

describe("a table that fits does not break for no reason", () => {
  it("keeps a short table whole on one page", () => {
    const short: RawBlock = {
      kind: "table",
      rows: [
        {
          cells: [
            { blocks: ["Categoria"], header: true },
            { blocks: ["Vagas"], header: true },
          ],
        },
        { cells: [{ blocks: ["Cultura"] }, { blocks: ["4"] }] },
      ],
    };

    expect(layout([short], A4, measure)).toHaveLength(1);
  });

  it("draws the header background before the label, not over it", () => {
    const short: RawBlock = {
      kind: "table",
      rows: [
        {
          cells: [
            { blocks: ["Categoria"], header: true },
            { blocks: ["Vagas"], header: true },
          ],
        },
      ],
    };
    const [page] = layout([short], A4, measure);
    const fill = page.commands.findIndex((c) => c.kind === "rect" && c.color !== A4.sheet);
    const label = page.commands.findIndex((c) => c.kind === "text" && c.text === "Categoria");

    expect(fill).toBeGreaterThanOrEqual(0);
    expect(label).toBeGreaterThan(fill);
  });
});
