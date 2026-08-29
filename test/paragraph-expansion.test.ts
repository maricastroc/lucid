import { describe, expect, it } from "vitest";
import {
  analyzeDocument,
  buildStructuredDocument,
  ptDocumentServices,
  spliceStructuredDocument,
  toRawBlocks,
  type Document,
  type RawBlock,
} from "@/lucid";
import { documentToDocx } from "../src/app/lib/export-document";

const PREAMBLE =
  "A Secretária torna público o edital com fundamento na Lei Federal nº 13.019/2014, na Lei Complementar " +
  "nº 119/2012, alterada pela Lei Complementar nº 178/2018, e no Decreto Estadual nº 32.810/2018.";

const BLOCKS: readonly RawBlock[] = [
  { kind: "heading", level: 1, text: "Edital de chamamento público" },
  { kind: "paragraph", text: PREAMBLE },
  { kind: "heading", level: 2, text: "Do objeto" },
  { kind: "paragraph", text: "Constitui o objeto deste edital o chamamento de organizações." },
  { kind: "list", ordered: false, items: ["Certidão do e-Parcerias", "Plano de trabalho assinado"] },
];

const build = (): Document => buildStructuredDocument(BLOCKS, ptDocumentServices);

const kinds = (doc: Document): string[] => doc.blocks.map((b) => (b.kind === "heading" ? `heading${b.level}` : b.kind));

function replacePreamble(doc: Document, next: string) {
  return spliceStructuredDocument(doc, doc.source.replace(PREAMBLE, next), ptDocumentServices);
}

const reason = (doc: Document, next: string): string | null => {
  const r = replacePreamble(doc, next);
  return r.ok ? null : r.reason;
};

const documentOf = (doc: Document, next: string): Document => {
  const r = replacePreamble(doc, next);
  if (!r.ok) throw new Error(`expected an accepted splice, got ${r.reason}`);
  return r.document;
};

describe("paragraph expansion — the shapes in scope", () => {
  it("paragraph → two paragraphs", () => {
    const next = documentOf(build(), "A Secretária torna público o edital.\n\nEle segue várias normas.");
    expect(kinds(next)).toEqual(["heading1", "paragraph", "paragraph", "heading2", "paragraph", "list"]);
  });

  it("paragraph → intro paragraph + list", () => {
    const next = documentOf(
      build(),
      "A Secretária torna público o edital, com base nestas normas:\n" +
        "- Lei Federal nº 13.019/2014.\n" +
        "- Lei Complementar nº 119/2012, alterada pela Lei Complementar nº 178/2018.\n" +
        "- Decreto Estadual nº 32.810/2018.",
    );
    expect(kinds(next)).toEqual(["heading1", "paragraph", "list", "heading2", "paragraph", "list"]);
  });

  it("paragraph → paragraph (a bare break is a soft break, never a list)", () => {
    const next = documentOf(build(), "A Secretária torna público o edital.\nEle segue várias normas.");
    expect(kinds(next)).toEqual(["heading1", "paragraph", "heading2", "paragraph", "list"]);
  });
});

describe("paragraph expansion — fidelity", () => {
  const LIST =
    "A Secretária torna público o edital, com base nestas normas:\n" +
    "- Lei Federal nº 13.019/2014.\n" +
    "- Lei Complementar nº 119/2012, alterada pela Lei Complementar nº 178/2018.\n" +
    "- Decreto Estadual nº 32.810/2018.";

  it("keeps every number, date, norm name and the 'alterada pela' relation", () => {
    const next = documentOf(build(), LIST);
    for (const token of [
      "13.019/2014",
      "119/2012",
      "178/2018",
      "32.810/2018",
      "alterada pela Lei Complementar nº 178/2018",
    ]) {
      expect(next.source).toContain(token);
    }
  });

  it("keeps the order of the items", () => {
    const next = documentOf(build(), LIST);
    const list = next.blocks.find((b, i) => b.kind === "list" && i < 3);
    expect(list?.kind).toBe("list");
    if (list?.kind === "list") {
      expect(list.items.map((i) => i.text)).toEqual([
        "Lei Federal nº 13.019/2014.",
        "Lei Complementar nº 119/2012, alterada pela Lei Complementar nº 178/2018.",
        "Decreto Estadual nº 32.810/2018.",
      ]);
    }
  });

  it("leaves every other block byte-identical", () => {
    const before = toRawBlocks(build().blocks);
    const after = toRawBlocks(documentOf(build(), LIST).blocks);
    expect(after[0]).toEqual(before[0]);
    expect(after.slice(3)).toEqual(before.slice(2));
  });

  it("the new list sits next to the pre-existing one without merging into it", () => {
    const next = documentOf(build(), LIST);
    const lists = next.blocks.filter((b) => b.kind === "list");
    expect(lists).toHaveLength(2);
    if (lists[1].kind === "list") {
      expect(lists[1].items.map((i) => i.text)).toEqual(["Certidão do e-Parcerias", "Plano de trabalho assinado"]);
    }
  });

  it("the list right after a heading keeps the heading intact", () => {
    const doc = build();
    const target = "Constitui o objeto deste edital o chamamento de organizações.";
    const r = spliceStructuredDocument(
      doc,
      doc.source.replace(
        target,
        "O objeto é o chamamento de:\n- organizações da sociedade civil.\n- entidades sem fins lucrativos.",
      ),
      ptDocumentServices,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(kinds(r.document)).toEqual(["heading1", "paragraph", "heading2", "paragraph", "list", "list"]);
      expect(r.document.blocks[2].kind).toBe("heading");
    }
  });
});

describe("paragraph expansion — what stays refused", () => {
  it("refuses to promote a paragraph into a heading", () => {
    expect(reason(build(), "## Fundamentos\n\nTexto do corpo.")).toBe("introduces_heading");
  });

  it("refuses a multiline edit inside a heading", () => {
    const doc = build();
    expect(
      spliceStructuredDocument(doc, doc.source.replace("Do objeto", "Do\nobjeto"), ptDocumentServices),
    ).toMatchObject({ ok: false, reason: "unsupported_unit" });
  });

  it("refuses a multiline edit inside an existing list item", () => {
    const doc = build();
    expect(
      spliceStructuredDocument(
        doc,
        doc.source.replace("Plano de trabalho assinado", "Plano\nassinado"),
        ptDocumentServices,
      ),
    ).toMatchObject({ ok: false, reason: "unsupported_unit" });
  });

  it("joins two units when the author deletes the boundary between them", () => {
    const doc = build();
    const crossing = doc.source.replace("Do objeto\n\nConstitui", "Do objeto — constitui");
    const result = spliceStructuredDocument(doc, crossing, ptDocumentServices);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(kinds(result.document)).toEqual(["heading1", "paragraph", "heading2", "list"]);
    expect(result.document.blocks[2].text).toBe("Do objeto — constitui o objeto deste edital o chamamento de organizações.");
  });

  it("empties the document when the author replaces everything with whitespace", () => {
    const result = spliceStructuredDocument(build(), "   ", ptDocumentServices);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.blocks).toEqual([]);
  });
});

describe("paragraph expansion — the document keeps working afterwards", () => {
  const LIST =
    "A Secretária torna público o edital, com base nestas normas:\n" +
    "- Lei Federal nº 13.019/2014.\n" +
    "- Lei Complementar nº 119/2012, alterada pela Lei Complementar nº 178/2018.";

  it("re-audits the new structure: the list block is analysed as a list", () => {
    const next = documentOf(build(), LIST);
    const diagnostic = analyzeDocument(next);
    expect(diagnostic.findings).toBeDefined();
    expect(next.blocks.filter((b) => b.kind === "heading")).toHaveLength(2);
  });

  it("offsets are recomputed from scratch and stay consistent with the source", () => {
    const next = documentOf(build(), LIST);
    for (const block of next.blocks) {
      expect(next.source.slice(block.start, block.end)).toBe(block.text);
      if (block.kind === "list") {
        for (const item of block.items) expect(next.source.slice(item.start, item.end)).toBe(item.text);
      }
    }
  });

  it("a later edit inside the new intro paragraph splices structurally", () => {
    const doc = documentOf(build(), LIST);
    const r = spliceStructuredDocument(doc, doc.source.replace("torna público", "publica"), ptDocumentServices);
    expect(r.ok).toBe(true);
    if (r.ok) expect(kinds(r.document)).toEqual(kinds(doc));
  });

  it("a later edit inside each new list item splices structurally", () => {
    const doc = documentOf(build(), LIST);
    for (const [from, to] of [
      ["Lei Federal nº 13.019/2014.", "Lei Federal nº 13.019/2014 (parcerias)."],
      ["alterada pela", "modificada pela"],
    ]) {
      const r = spliceStructuredDocument(doc, doc.source.replace(from, to), ptDocumentServices);
      expect(r.ok).toBe(true);
      if (r.ok) expect(kinds(r.document)).toEqual(kinds(doc));
    }
  });

  it("undo is a plain restore of the previous text and returns the original structure", () => {
    const original = build();
    const expanded = documentOf(original, LIST);
    expect(kinds(expanded)).not.toEqual(kinds(original));

    const back = spliceStructuredDocument(expanded, original.source, ptDocumentServices);

    expect(back.ok || back.reason === "crosses_units").toBe(true);
    expect(kinds(buildStructuredDocument(toRawBlocks(original.blocks), ptDocumentServices))).toEqual(kinds(original));
  });

  it("exports the expanded document to .docx with the new list as a list", async () => {
    const next = documentOf(build(), LIST);
    const raw = toRawBlocks(next.blocks);
    expect(raw.filter((b) => b.kind === "list")).toHaveLength(2);
    const bytes = await documentToDocx(raw);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });
});

describe("paragraph expansion — a refusal never costs the document", () => {
  it("a refused splice returns no document at all, so the caller has nothing to overwrite with", () => {
    const doc = build();
    const result = spliceStructuredDocument(doc, doc.source.replace("Do objeto", "Do\nobjeto"), ptDocumentServices);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty("document");
  });

  it("the original document is untouched after any refusal", () => {
    const doc = build();
    const snapshot = JSON.stringify(toRawBlocks(doc.blocks));
    for (const attempt of ["## Título\n\nCorpo.", "   ", doc.source.replace("Do objeto\n\nConstitui", "x")]) {
      spliceStructuredDocument(doc, doc.source.replace(PREAMBLE, attempt), ptDocumentServices);
    }
    expect(JSON.stringify(toRawBlocks(doc.blocks))).toBe(snapshot);
    expect(kinds(doc)).toEqual(["heading1", "paragraph", "heading2", "paragraph", "list"]);
  });
});
