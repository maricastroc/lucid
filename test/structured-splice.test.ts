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
  it("joins two blocks when the author deletes the boundary between them", () => {
    const doc = build();
    const next = splice(doc, "documentos\n\nFoi", "documentos. Foi");
    expect(next).not.toBeNull();
    expect(kinds(next!)).toEqual(["heading1", "heading2", "list"]);
    expect(next!.blocks[0].text).toBe(
      "Prazos e documentos. Foi realizada a análise em sede de procedimento administrativo.",
    );
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

  it("removes the block the author emptied, instead of discarding the edit", () => {
    const doc = build();
    const next = splice(doc, "Prazos e documentos", "");
    expect(next).not.toBeNull();
    expect(kinds(next!)).toEqual(["paragraph", "heading2", "list"]);
  });

  it("still refuses a wholesale rewrite, where no structure can be derived", () => {
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

describe("spliceStructuredDocument — deleting is editing, not an error (ADR-080)", () => {
  const texts = (doc: Document): string[] =>
    doc.blocks.flatMap((b) => (b.kind === "list" ? b.items.map((i) => i.text) : [b.text]));

  it("removes the paragraph the author emptied, and leaves the rest where it was", () => {
    const doc = build();
    const next = splice(doc, "Foi realizada a análise em sede de procedimento administrativo.\n\n", "");
    expect(next).not.toBeNull();
    expect(kinds(next!)).toEqual(["heading1", "heading2", "list"]);
  });

  it("removes it too when the selection left the blank line behind", () => {
    const doc = build();

    const next = splice(doc, "Foi realizada a análise em sede de procedimento administrativo.", "");
    expect(next).not.toBeNull();
    expect(kinds(next!)).toEqual(["heading1", "heading2", "list"]);
  });

  it("removes one list item and keeps the list", () => {
    const doc = build();
    const next = splice(doc, "\nServidor cedido", "");
    expect(next).not.toBeNull();
    expect(kinds(next!)).toEqual(["heading1", "paragraph", "heading2", "list"]);
    expect(texts(next!)).toEqual([
      "Prazos e documentos",
      "Foi realizada a análise em sede de procedimento administrativo.",
      "Quem pode pedir",
      "Servidor efetivo",
    ]);
  });

  it("removes the list itself once its last item is gone", () => {
    const doc = build();
    const next = splice(doc, "\n\nServidor efetivo\nServidor cedido", "");
    expect(next).not.toBeNull();
    expect(kinds(next!)).toEqual(["heading1", "paragraph", "heading2"]);
  });

  it("removes several blocks in one deletion", () => {
    const doc = build();
    const next = splice(
      doc,
      "Foi realizada a análise em sede de procedimento administrativo.\n\nQuem pode pedir\n\n",
      "",
    );
    expect(next).not.toBeNull();
    expect(kinds(next!)).toEqual(["heading1", "list"]);
  });

  it("empties the document when everything is deleted", () => {
    const doc = build();
    const result = spliceStructuredDocument(doc, "", ptDocumentServices);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.blocks).toEqual([]);
  });

  it("keeps the kind of the end that survived, so deleting a heading does not promote a paragraph", () => {
    const doc = build();
    const next = splice(doc, "Prazos e documentos\n\n", "");
    expect(next).not.toBeNull();
    expect(kinds(next!)).toEqual(["paragraph", "heading2", "list"]);
  });

  it("joins a partial block to the partial block after it", () => {
    const doc = build();
    const next = splice(doc, "documentos\n\nFoi realizada", "documentos e foi realizada");
    expect(next).not.toBeNull();
    expect(kinds(next!)).toEqual(["heading1", "heading2", "list"]);
    expect(next!.blocks[0].text).toBe(
      "Prazos e documentos e foi realizada a análise em sede de procedimento administrativo.",
    );
  });

  it("refuses to invent a structure for text that replaced every block", () => {
    const doc = build();
    expect(refusal(doc, "Um texto completamente diferente que tomou o lugar de tudo.")).toBe("crosses_units");
  });

  it("refuses a line break typed into a selection that already spans blocks", () => {
    const doc = build();
    const next = doc.source.replace("documentos\n\nFoi realizada", "documentos ZZZ\nWWW realizada");
    expect(refusal(doc, next)).toBe("unsupported_unit");
  });

  it("refuses to turn a paragraph break into a line break, which the structure cannot express", () => {
    const doc = build();
    expect(refusal(doc, doc.source.replace("documentos\n\nFoi", "documentos\ne foi"))).not.toBeNull();
  });

  it("offsets still slice back to their own text after a removal", () => {
    const doc = build();
    const next = splice(doc, "Foi realizada a análise em sede de procedimento administrativo.\n\n", "")!;
    for (const block of next.blocks) expect(next.source.slice(block.start, block.end)).toBe(block.text);
    for (const sentence of next.sentences) expect(next.source.slice(sentence.start, sentence.end)).toBe(sentence.text);
  });

  it("is deterministic", () => {
    const doc = build();
    const once = JSON.stringify(splice(doc, "Prazos e documentos\n\n", ""));
    expect(JSON.stringify(splice(doc, "Prazos e documentos\n\n", ""))).toBe(once);
  });
});
