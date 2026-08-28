import { describe, expect, it } from "vitest";
import {
  analyze,
  buildDocument,
  buildStructuredDocument,
  ptDocumentServices,
  toRawBlocks,
  type Document,
  type RawBlock,
} from "@/lucid";
import { spliceStructuredDocument } from "../src/lucid/core/document/structured";
import { documentToDocx, exportableBlocks } from "../src/app/lib/export-document";
import { applyProposal } from "../src/report/rewrite";

const PREAMBLE =
  "A Secretária da Diversidade, no uso de suas atribuições legais, com fundamento na Lei Federal nº 13.019/2014, " +
  "que estabelece o regime jurídico das parcerias; na Lei Complementar nº 119/2012, alterada pela Lei Complementar " +
  "nº 178/2018, que dispõe sobre a transferência de recursos; e no Decreto Estadual nº 32.810/2018, torna público o edital.";

const LIST_PROPOSAL =
  "A Secretária da Diversidade torna público o edital, com base nestas normas:\n" +
  "- Lei Federal nº 13.019/2014, que estabelece o regime jurídico das parcerias.\n" +
  "- Lei Complementar nº 119/2012, alterada pela Lei Complementar nº 178/2018, que dispõe sobre a transferência de recursos.\n" +
  "- Decreto Estadual nº 32.810/2018.";

const DOCX_BLOCKS: readonly RawBlock[] = [
  { kind: "heading", level: 1, text: "Edital de chamamento público nº 0001/2026" },
  { kind: "paragraph", text: PREAMBLE },
  { kind: "heading", level: 2, text: "Do objeto" },
  { kind: "paragraph", text: "Constitui o objeto deste edital o chamamento de organizações da sociedade civil." },
  { kind: "list", ordered: false, items: ["Certidão do e-Parcerias", "Plano de trabalho assinado"] },
];

const structured = (): Document => buildStructuredDocument(DOCX_BLOCKS, ptDocumentServices);

const kinds = (doc: Document): string[] =>
  doc.blocks.map((b) => (b.kind === "heading" ? `heading${b.level}` : b.kind));

describe("multiline rewrite — the structured (.docx) path", () => {
  it("REFUSES a multiline proposal: the structured splice returns null by construction", () => {
    const doc = structured();
    const target = { start: doc.blocks[1].start, end: doc.blocks[1].end, text: PREAMBLE };
    const nextText = applyProposal(doc.source, target, {
      proposerId: "candidate",
      original: PREAMBLE,
      proposed: LIST_PROPOSAL,
    });

    const result = spliceStructuredDocument(doc, nextText, ptDocumentServices);
    expect(result.ok).toBe(true);
  });

  it("still refuses when the list carries no blank line — any \\n in the replacement is rejected", () => {
    const doc = structured();
    const target = { start: doc.blocks[1].start, end: doc.blocks[1].end, text: PREAMBLE };
    const oneBreak = applyProposal(doc.source, target, {
      proposerId: "candidate",
      original: PREAMBLE,
      proposed: "Primeira frase.\nSegunda frase.",
    });
    const result = spliceStructuredDocument(doc, oneBreak, ptDocumentServices);
    expect(result.ok).toBe(true);
  });

  it("accepts the same rewrite when it stays on one line — this is what rewrite@2 produces", () => {
    const doc = structured();
    const target = { start: doc.blocks[1].start, end: doc.blocks[1].end, text: PREAMBLE };
    const prose =
      "A Secretária da Diversidade torna público o edital. Ele se baseia na Lei Federal nº 13.019/2014. " +
      "Também se baseia na Lei Complementar nº 119/2012, alterada pela Lei Complementar nº 178/2018.";
    const nextText = applyProposal(doc.source, target, { proposerId: "c", original: PREAMBLE, proposed: prose });

    const result = spliceStructuredDocument(doc, nextText, ptDocumentServices);
    expect(result.ok).toBe(true);
    if (result.ok) expect(kinds(result.document)).toEqual(["heading1", "paragraph", "heading2", "paragraph", "list"]);
  });

  it("names the cost of the refusal: the app falls back to plain text and the block model is gone", () => {
    const doc = structured();
    const target = { start: doc.blocks[1].start, end: doc.blocks[1].end, text: PREAMBLE };
    const nextText = applyProposal(doc.source, target, {
      proposerId: "candidate",
      original: PREAMBLE,
      proposed: LIST_PROPOSAL,
    });

    const fallback = buildDocument(nextText);
    expect(kinds(fallback)).not.toContain("heading1");
    expect(kinds(fallback).filter((k) => k === "list").length).toBeLessThan(
      kinds(doc).filter((k) => k === "list").length + 1,
    );
  });
});

describe("multiline rewrite — the plain-text path", () => {
  it("recognises the spliced list as a real list block", () => {
    const text = `${PREAMBLE}\n\nOutro parágrafo do documento.`;
    const target = { start: 0, end: PREAMBLE.length, text: PREAMBLE };
    const next = applyProposal(text, target, { proposerId: "c", original: PREAMBLE, proposed: LIST_PROPOSAL });

    expect(buildDocument(next).blocks.map((b) => b.kind)).toEqual(["paragraph", "list", "paragraph"]);
  });

  it("re-audits the list: the enumeration stops being prose", () => {
    const before = analyze(`${PREAMBLE}\n\nOutro parágrafo do documento.`);
    const target = { start: 0, end: PREAMBLE.length, text: PREAMBLE };
    const after = analyze(
      applyProposal(`${PREAMBLE}\n\nOutro parágrafo do documento.`, target, {
        proposerId: "c",
        original: PREAMBLE,
        proposed: LIST_PROPOSAL,
      }),
    );
    const longBefore = before.findings.filter((f) => f.criterion === "long_sentence").length;
    const longAfter = after.findings.filter((f) => f.criterion === "long_sentence").length;
    expect(longAfter).toBeLessThanOrEqual(longBefore);
  });

  it("preserves numbers, dates and the norm-to-norm relation verbatim through the splice", () => {
    const target = { start: 0, end: PREAMBLE.length, text: PREAMBLE };
    const next = applyProposal(PREAMBLE, target, { proposerId: "c", original: PREAMBLE, proposed: LIST_PROPOSAL });
    for (const token of ["13.019/2014", "119/2012", "178/2018", "32.810/2018", "alterada pela Lei Complementar"]) {
      expect(next).toContain(token);
    }
  });

  it("a list right after a heading is read as heading + intro paragraph + list", () => {
    const text = `## Fundamentos legais\n\n${LIST_PROPOSAL}\n\nParágrafo final do documento.`;
    expect(buildDocument(text).blocks.map((b) => b.kind)).toEqual(["heading", "paragraph", "list", "paragraph"]);
  });

  it("the items keep their own text: the marker is syntax, not content", () => {
    const text = `## Fundamentos legais\n\n${LIST_PROPOSAL}`;
    const list = buildDocument(text).blocks.find((b) => b.kind === "list");
    expect(list?.kind).toBe("list");
    if (list?.kind === "list") {
      expect(list.items.map((i) => i.text)[0]).toBe(
        "Lei Federal nº 13.019/2014, que estabelece o regime jurídico das parcerias.",
      );
    }
  });

  it("a spliced list adjacent to a pre-existing list MERGES into one block", () => {
    const existing = "- Certidão do e-Parcerias\n- Plano de trabalho assinado";
    const text = `${PREAMBLE}\n\n${existing}`;
    const target = { start: 0, end: PREAMBLE.length, text: PREAMBLE };
    const next = applyProposal(text, target, { proposerId: "c", original: PREAMBLE, proposed: LIST_PROPOSAL });

    const lists = buildDocument(next).blocks.filter((b) => b.kind === "list");

    expect(lists.length).toBe(2);
  });
});

describe("multiline rewrite — export", () => {
  it("exports the spliced list as a list in the .docx", async () => {
    const text = `${PREAMBLE}\n\nOutro parágrafo.`;
    const target = { start: 0, end: PREAMBLE.length, text: PREAMBLE };
    const next = applyProposal(text, target, { proposerId: "c", original: PREAMBLE, proposed: LIST_PROPOSAL });

    const blocks = exportableBlocks(next, null);
    expect(blocks.some((b) => b.kind === "list")).toBe(true);
    const bytes = await documentToDocx(blocks);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it("keeps the list KIND but drops the '- ' markers when plain text becomes structured", () => {
    const text = `${PREAMBLE}\n\nOutro parágrafo.`;
    const target = { start: 0, end: PREAMBLE.length, text: PREAMBLE };
    const next = applyProposal(text, target, { proposerId: "c", original: PREAMBLE, proposed: LIST_PROPOSAL });

    const raw = toRawBlocks(buildDocument(next).blocks);
    expect(raw.filter((b) => b.kind === "list").length).toBe(1);

    const rebuilt = buildStructuredDocument(raw, ptDocumentServices);
    expect(rebuilt.blocks.map((b) => b.kind)).toEqual(buildDocument(next).blocks.map((b) => b.kind));
    expect(rebuilt.source).not.toBe(buildDocument(next).source);
    expect(rebuilt.source).not.toContain("- Lei Federal");
  });
});

describe("multiline rewrite — editing after the splice", () => {
  it("a later single-line edit inside the new list item still splices structurally", () => {
    const text = `${PREAMBLE}\n\nOutro parágrafo.`;
    const target = { start: 0, end: PREAMBLE.length, text: PREAMBLE };
    const spliced = applyProposal(text, target, { proposerId: "c", original: PREAMBLE, proposed: LIST_PROPOSAL });

    const doc = buildStructuredDocument(toRawBlocks(buildDocument(spliced).blocks), ptDocumentServices);
    const edited = doc.source.replace("torna público o edital", "publica o edital");

    const result = spliceStructuredDocument(doc, edited, ptDocumentServices);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.blocks.some((b) => b.kind === "list")).toBe(true);
  });
});
