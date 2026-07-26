import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { buildDocument } from "../src/locales/pt-BR";

const structuralSpans = (text: string, criterion: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === criterion)
    .map((f) => f.span.text);

const blockKinds = (text: string): string[] => buildDocument(text).blocks.map((b) => b.kind);

describe("structure in pasted text/Markdown (F4) — ATX headings", () => {
  it("a long ATX heading (> limit) triggers long_heading on the plain-text path", () => {
    const text =
      "# Prazos e documentos necessários para o requerimento formal do benefício social concedido pela autoridade\n\n" +
      "O prazo é de trinta dias corridos.";
    expect(structuralSpans(text, "long_heading").length).toBe(1);
  });

  it("a heading level jump (h1 → h3) triggers salto_de_nivel_titulo", () => {
    const text =
      "# Introducao\n\nTexto de abertura com algum conteudo.\n\n" +
      "### Subsecao\n\nDetalhamento de um outro assunto distinto.";
    expect(structuralSpans(text, "salto_de_nivel_titulo")).toEqual(["Subsecao"]);
  });

  it("a heading with no echo in the body triggers heading_body_mismatch", () => {
    const text = "## Documentacao\n\nO interessado tem trinta dias para responder ao pedido enviado.";
    expect(structuralSpans(text, "heading_body_mismatch")).toEqual(["Documentacao"]);
  });

  it("# levels become the block level (##### = 5)", () => {
    const doc = buildDocument("##### Titulo bem fundo aqui\n\nCorpo.");
    const heading = doc.blocks.find((b) => b.kind === "heading");
    expect(heading && heading.kind === "heading" ? heading.level : null).toBe(5);
  });

  it("'#hashtag' (no space) is NOT a heading — avoids a false positive", () => {
    expect(blockKinds("#hashtag no meio do texto corrido aqui.")).toEqual(["paragraph"]);
  });
});

describe("structure in pasted text/Markdown (F4) — lists", () => {
  it("a one-item list triggers single_item_list", () => {
    const text = "Introducao ao tema.\n\n- Unico item solitario da lista";
    expect(structuralSpans(text, "single_item_list")).toEqual(["Unico item solitario da lista"]);
  });

  it("a list with two or more items does NOT trigger single_item_list", () => {
    expect(structuralSpans("Intro do assunto.\n\n- primeiro item\n- segundo item", "single_item_list")).toEqual([]);
  });

  it("a numeric marker is recognized as an ordered list", () => {
    const doc = buildDocument("Intro.\n\n1. primeiro\n2. segundo");
    const list = doc.blocks.find((b) => b.kind === "list");
    expect(list && list.kind === "list" ? list.ordered : null).toBe(true);
    expect(list && list.kind === "list" ? list.items.length : null).toBe(2);
  });
});

describe("structure in pasted text (F4) — offset and segmentation invariants", () => {
  it("the source stays the normalized original text (offsets aligned with the UI)", () => {
    const text = "# Titulo\n\nCorpo do texto.";
    const d = analyze(text);
    expect(d.text).toBe(text.normalize("NFC"));
    for (const f of d.findings) {
      expect(d.text.slice(f.span.start, f.span.end)).toBe(f.span.text);
    }
  });

  it("a heading with no punctuation does NOT merge into the body (per-block segmentation)", () => {
    const doc = buildDocument("# Titulo\n\nCorpo do texto aqui.");
    const heading = doc.blocks.find((b) => b.kind === "heading");
    expect(heading?.sentences.map((s) => s.text)).toEqual(["Titulo"]);
    expect(doc.sentences.map((s) => s.text)).toEqual(["Titulo", "Corpo do texto aqui."]);
  });
});

describe("structure in pasted text (F4) — unmarked prose stays intact", () => {
  it("prose text (no # and no markers) yields only paragraphs and no structural finding", () => {
    const text = "Foi realizada a analise do pedido. O prazo e valido e o documento tramita.\n\nOutro paragrafo aqui.";
    expect(blockKinds(text)).toEqual(["paragraph", "paragraph"]);
    for (const c of ["long_heading", "salto_de_nivel_titulo", "heading_body_mismatch", "single_item_list"]) {
      expect(structuralSpans(text, c)).toEqual([]);
    }
  });

  it("a blank line separates paragraphs even with nothing punctuated (ADR-073)", () => {
    const doc = buildDocument("Prazos e documentos\n\nO interessado deve entregar os documentos.");
    expect(doc.blocks.map((b) => b.kind)).toEqual(["paragraph", "paragraph"]);
    expect(doc.sentences.map((s) => s.wordCount)).toEqual([3, 6]);
  });

  it("the prose path is byte-identical to the previous one (same paragraphs per sentence)", () => {
    const text = "Primeira frase. Segunda frase.\n\nTerceira, num novo bloco.";
    const doc = buildDocument(text);
    expect(doc.blocks.map((b) => b.kind)).toEqual(["paragraph", "paragraph"]);
    expect(doc.blocks[0].text).toBe("Primeira frase. Segunda frase.");
    expect(doc.blocks[1].text).toBe("Terceira, num novo bloco.");
  });
});

describe("structure in pasted text (A10) — a marker in one place does not re-read the rest", () => {
  const BASES = [
    "Prazos e documentos\n\nO interessado deve entregar os documentos ate sexta.",
    "Primeira frase. Segunda frase.\n\nOutro paragrafo aqui.",
    "Isso é uma frase\nque continua na linha de baixo.",
    "Foi realizada a analise do pedido pela comissao.\n\nO prazo e de dez dias.",
  ];
  const sentencesOf = (source: string): string[] => buildDocument(source).sentences.map((s) => s.text);

  it.each(BASES)("appending a list leaves the sentences before it untouched: %s", (base) => {
    const before = sentencesOf(base);
    expect(sentencesOf(`${base}\n\n- item da lista`).slice(0, before.length)).toEqual(before);
  });

  it.each(BASES)("prepending an ATX heading leaves the sentences after it untouched: %s", (base) => {
    const before = sentencesOf(base);
    expect(sentencesOf(`# Aviso\n\n${base}`).slice(1)).toEqual(before);
  });
});
