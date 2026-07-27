import { describe, expect, it } from "vitest";
import { buildStructuredDocument, ptDocumentServices, type Document, type RawBlock } from "@/lucid";
import { spliceStructuredDocument } from "../src/lucid/core/document/structured";

const BLOCKS: RawBlock[] = [
  { kind: "heading", level: 1, text: "Prazos e documentos" },
  { kind: "paragraph", text: "Foi realizada a análise em sede de procedimento administrativo." },
  { kind: "heading", level: 2, text: "Quem pode pedir" },
  { kind: "list", ordered: false, items: ["Servidor efetivo", "Servidor cedido"] },
];

function build(): Document {
  return buildStructuredDocument(BLOCKS, ptDocumentServices);
}

function splice(doc: Document, from: string, to: string): Document | null {
  return spliceStructuredDocument(doc, doc.source.replace(from, to), ptDocumentServices);
}

function kinds(doc: Document): string[] {
  return doc.blocks.map((b) => (b.kind === "heading" ? `heading${b.level}` : b.kind));
}

describe("spliceStructuredDocument — the structure survives an edit", () => {
  it("keeps headings and lists after editing inside a paragraph", () => {
    const doc = build();
    const next = splice(doc, "em sede de", "no âmbito de");

    expect(next).not.toBeNull();
    expect(kinds(next!)).toEqual(["heading1", "paragraph", "heading2", "list"]);
    expect(next!.source).toContain("no âmbito de");
  });

  it("keeps the structure after editing inside a heading", () => {
    const doc = build();
    const next = splice(doc, "Prazos e documentos", "Prazos e papéis");

    expect(next).not.toBeNull();
    expect(kinds(next!)).toEqual(["heading1", "paragraph", "heading2", "list"]);
    expect(next!.blocks[0].text).toBe("Prazos e papéis");
  });

  it("keeps the structure after editing inside a list item", () => {
    const doc = build();
    const next = splice(doc, "Servidor cedido", "Servidor cedido de outro órgão");

    expect(next).not.toBeNull();
    const list = next!.blocks[3];
    expect(list.kind).toBe("list");
    if (list.kind === "list") {
      expect(list.items.map((i) => i.text)).toEqual(["Servidor efetivo", "Servidor cedido de outro órgão"]);
    }
  });

  it("handles a pure insertion and a pure deletion", () => {
    const doc = build();
    expect(splice(doc, "análise", "análise completa")).not.toBeNull();
    expect(splice(doc, " administrativo", "")).not.toBeNull();
  });

  it("returns the same document when nothing changed", () => {
    const doc = build();
    expect(spliceStructuredDocument(doc, doc.source, ptDocumentServices)).toBe(doc);
  });

  it("rebuilds offsets that still slice back to their own text", () => {
    const doc = build();
    const next = splice(doc, "em sede de", "no âmbito de")!;
    for (const sentence of next.sentences) {
      expect(next.source.slice(sentence.start, sentence.end)).toBe(sentence.text);
    }
    for (const block of next.blocks) {
      expect(next.source.slice(block.start, block.end)).toBe(block.text);
    }
  });

  it("is deterministic", () => {
    const doc = build();
    const a = JSON.stringify(splice(doc, "em sede de", "no âmbito de"));
    const b = JSON.stringify(splice(doc, "em sede de", "no âmbito de"));
    expect(b).toBe(a);
  });
});

describe("spliceStructuredDocument — it gives up instead of guessing", () => {
  it("refuses an edit that crosses a block boundary", () => {
    const doc = build();
    const next = spliceStructuredDocument(doc, doc.source.replace("documentos\n\nFoi", "documentos. Foi"), ptDocumentServices);
    expect(next).toBeNull();
  });

  it("refuses a replacement that introduces a line break", () => {
    const doc = build();
    expect(splice(doc, "análise", "análise\nnova")).toBeNull();
  });

  it("refuses an edit that would empty a block", () => {
    const doc = build();
    expect(splice(doc, "Prazos e documentos", "")).toBeNull();
  });

  it("refuses a wholesale rewrite of the text", () => {
    const doc = build();
    expect(spliceStructuredDocument(doc, "Um texto completamente diferente.", ptDocumentServices)).toBeNull();
  });

  it("never returns a document whose source disagrees with the requested text", () => {
    const doc = build();
    const cases = ["em sede de", "Prazos", "Servidor efetivo", "análise", "administrativo"];
    for (const from of cases) {
      const requested = doc.source.replace(from, `${from} X`);
      const next = spliceStructuredDocument(doc, requested, ptDocumentServices);
      if (next !== null) expect(next.source).toBe(requested);
    }
  });
});

describe("spliceStructuredDocument — the Principle 2 criteria stop going silent (ADR-080)", () => {
  it("a heading-level jump is still detected after the body is edited", async () => {
    const { analyzeDocument } = await import("@/lucid");
    const jumpy: RawBlock[] = [
      { kind: "heading", level: 1, text: "Título principal" },
      { kind: "heading", level: 3, text: "Subtítulo que pula um nível" },
      { kind: "paragraph", text: "Foi realizada a análise em sede de procedimento." },
    ];
    const doc = buildStructuredDocument(jumpy, ptDocumentServices);
    const before = analyzeDocument(doc).findings.filter((f) => f.criterion === "salto_de_nivel_titulo");
    expect(before).toHaveLength(1);

    const next = spliceStructuredDocument(doc, doc.source.replace("em sede de", "no âmbito de"), ptDocumentServices);
    const after = analyzeDocument(next!).findings.filter((f) => f.criterion === "salto_de_nivel_titulo");
    expect(after).toHaveLength(1);
  });
});
