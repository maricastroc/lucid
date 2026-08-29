import { describe, expect, it } from "vitest";
import { ptDocumentServices } from "../src/locales/pt-BR";
import { importPdfPages, missingDigits, type PdfPageGeometry, type PdfTextItem } from "../src/importers/pdf";
import { cleanRunningLines, shapeOf } from "../src/importers/pdf/clean";
import { hasPersistentGutter } from "../src/importers/pdf/columns";
import { assembleLines } from "../src/importers/pdf/lines";
import { buildParagraphs, metricsOf } from "../src/importers/pdf/paragraphs";
import { isGlued, isScanned, qualityOf } from "../src/importers/pdf/quality";
import { countRuledRegions } from "../src/importers/pdf/ruled-regions";
import type { PdfLine, PdfRule } from "../src/importers/pdf/geometry";

const WIDTH = 600;
const HEIGHT = 800;
const LINE = 14;

function line(text: string, top: number, left = 60, width?: number): PdfTextItem {
  return { text, left, top, width: width ?? text.length * 5, height: LINE * 0.7 };
}

function page(items: PdfTextItem[], extra: Partial<PdfPageGeometry> = {}): PdfPageGeometry {
  return { width: WIDTH, height: HEIGHT, items, images: 0, rules: [], ...extra };
}

function prose(texts: string[], from = 100): PdfTextItem[] {
  return texts.map((text, i) => line(text, from + i * LINE, 60, 480));
}

const importOf = (pages: PdfPageGeometry[]) => importPdfPages(pages, ptDocumentServices);

describe("reading a page", () => {
  it("gathers items on the same baseline into one line, in reading order", () => {
    const lines = assembleLines(page([line("mundo", 100, 200), line("Olá", 100, 60)]), 1);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe("Olá mundo");
  });

  it("keeps separate baselines apart", () => {
    const lines = assembleLines(page([line("primeira", 100), line("segunda", 140)]), 1);
    expect(lines.map((l) => l.text)).toEqual(["primeira", "segunda"]);
  });
});

describe("what is furniture and what is text", () => {
  it("drops a header repeated in the same place across three pages", () => {
    const lines: PdfLine[] = [];
    for (let p = 1; p <= 3; p += 1) {
      lines.push({ text: "MINISTÉRIO DA FAZENDA", page: p, top: 40, left: 60, right: 300, height: 10 });
      lines.push({ text: `corpo da página ${p}`, page: p, top: 400, left: 60, right: 500, height: 10 });
    }

    const cleaned = cleanRunningLines(lines, HEIGHT);

    expect(cleaned.removed.header).toBe(3);
    expect(cleaned.lines.map((l) => l.text)).toEqual(["corpo da página 1", "corpo da página 2", "corpo da página 3"]);
  });

  it("recognises a page number by shape, not by its digits", () => {
    expect(shapeOf("Página 12 de 40")).toBe(shapeOf("Página 7 de 40"));
  });

  it("keeps a line that repeats only twice — two is a coincidence, not furniture", () => {
    const lines: PdfLine[] = [1, 2].map((p) => ({
      text: "Considerando o exposto",
      page: p,
      top: 40,
      left: 60,
      right: 300,
      height: 10,
    }));

    expect(cleanRunningLines(lines, HEIGHT).lines).toHaveLength(2);
  });
});

describe("refusals — what the importer will not pretend to read", () => {
  it("refuses a scan: an image with no text is not a document it can audit", () => {
    const scanned = [page([], { images: 3 }), page([], { images: 2 }), page([], { images: 4 })];
    expect(isScanned(scanned)).toBe(true);
    expect(importOf(scanned)).toEqual({ ok: false, refusal: "scanned" });
  });

  it("refuses two columns instead of interleaving them", () => {
    const columns = [1, 2, 3].map(() =>
      page(
        Array.from({ length: 40 }, (_, i) => [
          line("coluna esquerda com texto", 100 + i * LINE, 40, 220),
          line("coluna direita com texto", 100 + i * LINE, 340, 220),
        ]).flat(),
      ),
    );

    expect(hasPersistentGutter(columns)).toBe(true);
    expect(importOf(columns)).toEqual({ ok: false, refusal: "columns" });
  });

  it("refuses text that comes out glued, because that would measure the extraction", () => {
    const glued = "opedidofoiindeferidopelacomissaoporfaltadedocumentossupracitados";
    expect(isGlued(qualityOf(glued))).toBe(true);
    expect(importOf([page(prose([glued, glued, glued]))])).toEqual({ ok: false, refusal: "glued" });
  });

  it("refuses a file with no pages, and one with no text", () => {
    expect(importOf([])).toEqual({ ok: false, refusal: "unreadable" });
    expect(importOf([page([])])).toEqual({ ok: false, refusal: "no_readable_content" });
  });
});

describe("the digit invariant", () => {
  it("accounts for digits removed with the furniture", () => {
    expect(missingDigits(["12", "40", "10"], ["12", "40"], "prazo de 10 dias")).toEqual([]);
  });

  it("names a digit that vanished from the text without being removed", () => {
    expect(missingDigits(["10", "30"], [], "prazo de 10 dias")).toEqual(["30"]);
  });

  it("counts repeats — the same digit twice must survive twice", () => {
    expect(missingDigits(["10", "10"], [], "prazo de 10 dias")).toEqual(["10"]);
  });
});

describe("regions drawn as a grid", () => {
  const rule = (r: Partial<PdfRule>): PdfRule =>
    ({ left: 0, top: 0, right: 0, bottom: 0, direction: "horizontal", ...r }) as PdfRule;

  it("counts a closed grid once", () => {
    const grid = [
      rule({ left: 50, right: 400, top: 100, bottom: 101 }),
      rule({ left: 50, right: 400, top: 150, bottom: 151 }),
      rule({ left: 50, right: 51, top: 100, bottom: 151, direction: "vertical" }),
      rule({ left: 399, right: 400, top: 100, bottom: 151, direction: "vertical" }),
    ];
    expect(countRuledRegions([page([], { rules: grid })])).toBe(1);
  });

  it("does not count a lone rule under a heading", () => {
    expect(countRuledRegions([page([], { rules: [rule({ left: 50, right: 400, top: 100, bottom: 101 })] })])).toBe(0);
  });
});

describe("a document that reads clean", () => {
  const pages = [page(prose(["O pedido foi indeferido pela comissão", "por falta dos documentos supracitados."]))];

  it("turns the page into paragraphs the audit can read", () => {
    const result = importOf(pages);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.doc.source).toContain("O pedido foi indeferido pela comissão");
    expect(result.value.doc.blocks.every((b) => b.kind === "paragraph")).toBe(true);
  });

  it("declares no heading and no list, because a PDF does not say it has any", () => {
    const result = importOf(pages);
    if (!result.ok) throw new Error("esperava sucesso");

    expect(result.value.doc.blocks.some((b) => b.kind === "heading")).toBe(false);
    expect(result.value.doc.blocks.some((b) => b.kind === "list")).toBe(false);
  });

  it("reports what it had to do to the file", () => {
    const result = importOf(pages);
    if (!result.ok) throw new Error("esperava sucesso");

    expect(result.value.notes.pages).toBe(1);
    expect(result.value.notes.ruledRegions).toBe(0);
  });

  it("is deterministic: the same pages produce the same text", () => {
    const first = importOf(pages);
    const second = importOf(pages);
    if (!first.ok || !second.ok) throw new Error("esperava sucesso");
    expect(first.value.doc.source).toBe(second.value.doc.source);
  });
});

describe("paragraphs travel as paragraphs, not as a string to be re-read", () => {
  const PAGES = [
    page([
      ...prose([
        "A Secretaria torna público o edital de chamamento, com fundamento na Lei",
        "Estadual nº 13.811, de 16 de agosto de 2006, e demais normas aplicáveis.",
      ]),
      ...prose(["Constitui o objeto deste edital o fomento de bens culturais."], 200),
    ]),
  ];

  it("hands the blocks the importer assembled straight through", () => {
    const result = importOf(PAGES);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paragraphs = result.value.doc.blocks.map((b) => (b.kind === "list" ? "" : b.text));
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toContain("Lei Estadual nº 13.811");
    expect(paragraphs[1]).toBe("Constitui o objeto deste edital o fomento de bens culturais.");
  });

  it("keeps every block a paragraph, since the importer infers no headings", () => {
    const result = importOf(PAGES);
    if (!result.ok) return;
    expect(result.value.doc.blocks.every((b) => b.kind === "paragraph")).toBe(true);
  });
});

describe("buildParagraphs — the array is the result and the string is a view of it", () => {
  it("the text it reports is exactly its own paragraphs joined", () => {
    const lines = assembleLines(page(prose(["Primeira linha do parágrafo,", "que continua aqui."])), 1);
    const built = buildParagraphs(lines, metricsOf(lines, WIDTH));
    expect(built.text).toBe(built.paragraphs.join("\n\n"));
  });

  it("drops empty blocks in the array, not only in the string", () => {
    const lines = assembleLines(page(prose(["Uma linha só."])), 1);
    const built = buildParagraphs(lines, metricsOf(lines, WIDTH));
    expect(built.paragraphs).toEqual(["Uma linha só."]);
    expect(built.paragraphs.every((p) => p.trim() !== "")).toBe(true);
  });
});
