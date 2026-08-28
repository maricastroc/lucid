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
  const result = spliceStructuredDocument(doc, doc.source.replace(from, to), ptDocumentServices);
  return result.ok ? result.document : null;
}

function refusal(doc: Document, next: string): string | null {
  const result = spliceStructuredDocument(doc, next, ptDocumentServices);
  return result.ok ? null : result.reason;
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
    const result = spliceStructuredDocument(doc, doc.source, ptDocumentServices);
    expect(result.ok && result.document).toBe(doc);
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
    expect(refusal(doc, doc.source.replace("documentos\n\nFoi", "documentos. Foi"))).toBe("crosses_units");
  });

  it("ACCEPTS a line break inside a paragraph, keeping it one paragraph (ADR-088)", () => {
    const doc = build();
    const next = splice(doc, "análise", "análise\nnova");
    expect(next).not.toBeNull();
    expect(kinds(next!)).toEqual(["heading1", "paragraph", "heading2", "list"]);
  });

  it("still refuses a line break inside a HEADING — only paragraphs may expand", () => {
    const doc = build();
    expect(refusal(doc, doc.source.replace("Prazos e documentos", "Prazos\ne documentos"))).toBe("unsupported_unit");
  });

  it("still refuses a line break inside a LIST ITEM", () => {
    const doc = build();
    expect(refusal(doc, doc.source.replace("Servidor efetivo", "Servidor\nefetivo"))).toBe("unsupported_unit");
  });

  it("refuses an edit that would empty a block", () => {
    const doc = build();
    expect(splice(doc, "Prazos e documentos", "")).toBeNull();
  });

  it("refuses a wholesale rewrite of the text", () => {
    const doc = build();
    expect(refusal(doc, "Um texto completamente diferente.")).toBe("crosses_units");
  });

  it("never returns a document whose source disagrees with the requested text", () => {
    const doc = build();
    const cases = ["em sede de", "Prazos", "Servidor efetivo", "análise", "administrativo"];
    for (const from of cases) {
      const requested = doc.source.replace(from, `${from} X`);
      const result = spliceStructuredDocument(doc, requested, ptDocumentServices);
      if (result.ok) expect(result.document.source).toBe(requested);
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

    const result = spliceStructuredDocument(doc, doc.source.replace("em sede de", "no âmbito de"), ptDocumentServices);
    expect(result.ok).toBe(true);
    const after = analyzeDocument(result.ok ? result.document : doc).findings.filter(
      (f) => f.criterion === "salto_de_nivel_titulo",
    );
    expect(after).toHaveLength(1);
  });
});
