import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { buildDocument } from "../src/locales/pt-BR";

const structuralSpans = (text: string, criterion: string): string[] =>
  analyze(text)
    .findings.filter((f) => f.criterion === criterion)
    .map((f) => f.span.text);

const blockKinds = (text: string): string[] => buildDocument(text).blocks.map((b) => b.kind);

describe("estrutura em texto colado/Markdown (F4) — títulos ATX", () => {
  it("título ATX longo (> limite) dispara long_heading no caminho de texto", () => {
    const text =
      "# Prazos e documentos necessários para o requerimento formal do benefício social concedido pela autoridade\n\n" +
      "O prazo é de trinta dias corridos.";
    expect(structuralSpans(text, "long_heading").length).toBe(1);
  });

  it("salto de nível de título (h1 → h3) dispara salto_de_nivel_titulo", () => {
    const text =
      "# Introducao\n\nTexto de abertura com algum conteudo.\n\n" +
      "### Subsecao\n\nDetalhamento de um outro assunto distinto.";
    expect(structuralSpans(text, "salto_de_nivel_titulo")).toEqual(["Subsecao"]);
  });

  it("título sem eco no corpo dispara heading_body_mismatch", () => {
    const text = "## Documentacao\n\nO interessado tem trinta dias para responder ao pedido enviado.";
    expect(structuralSpans(text, "heading_body_mismatch")).toEqual(["Documentacao"]);
  });

  it("níveis de # viram o nível do bloco (##### = 5)", () => {
    const doc = buildDocument("##### Titulo bem fundo aqui\n\nCorpo.");
    const heading = doc.blocks.find((b) => b.kind === "heading");
    expect(heading && heading.kind === "heading" ? heading.level : null).toBe(5);
  });

  it("'#hashtag' (sem espaço) NÃO é título — evita falso positivo", () => {
    expect(blockKinds("#hashtag no meio do texto corrido aqui.")).toEqual(["paragraph"]);
  });
});

describe("estrutura em texto colado/Markdown (F4) — listas", () => {
  it("lista de um item dispara single_item_list", () => {
    const text = "Introducao ao tema.\n\n- Unico item solitario da lista";
    expect(structuralSpans(text, "single_item_list")).toEqual(["Unico item solitario da lista"]);
  });

  it("lista de dois ou mais itens NÃO dispara single_item_list", () => {
    expect(structuralSpans("Intro do assunto.\n\n- primeiro item\n- segundo item", "single_item_list")).toEqual([]);
  });

  it("marcador numérico é reconhecido como lista ordenada", () => {
    const doc = buildDocument("Intro.\n\n1. primeiro\n2. segundo");
    const list = doc.blocks.find((b) => b.kind === "list");
    expect(list && list.kind === "list" ? list.ordered : null).toBe(true);
    expect(list && list.kind === "list" ? list.items.length : null).toBe(2);
  });
});

describe("estrutura em texto colado (F4) — invariantes de offset e segmentação", () => {
  it("o source continua sendo o texto original normalizado (offsets alinhados à UI)", () => {
    const text = "# Titulo\n\nCorpo do texto.";
    const d = analyze(text);
    expect(d.text).toBe(text.normalize("NFC"));
    for (const f of d.findings) {
      expect(d.text.slice(f.span.start, f.span.end)).toBe(f.span.text);
    }
  });

  it("título sem pontuação NÃO se funde com o corpo (segmentação por bloco)", () => {
    // Sem o reconhecimento de bloco, "# Titulo ... Corpo." vira UMA frase só.
    const doc = buildDocument("# Titulo\n\nCorpo do texto aqui.");
    const heading = doc.blocks.find((b) => b.kind === "heading");
    expect(heading?.sentences.map((s) => s.text)).toEqual(["Titulo"]);
    expect(doc.sentences.map((s) => s.text)).toEqual(["Titulo", "Corpo do texto aqui."]);
  });
});

describe("estrutura em texto colado (F4) — prosa sem marcação fica intacta", () => {
  it("texto de prosa (sem # nem marcadores) produz só parágrafos e nenhum finding estrutural", () => {
    const text = "Foi realizada a analise do pedido. O prazo e valido e o documento tramita.\n\nOutro paragrafo aqui.";
    expect(blockKinds(text)).toEqual(["paragraph", "paragraph"]);
    for (const c of ["long_heading", "salto_de_nivel_titulo", "heading_body_mismatch", "single_item_list"]) {
      expect(structuralSpans(text, c)).toEqual([]);
    }
  });

  it("caminho de prosa é byte-idêntico ao anterior (mesmos parágrafos por frase)", () => {
    // Regressão: sem marcadores, o resultado tem de bater com a segmentação por parágrafo antiga.
    const text = "Primeira frase. Segunda frase.\n\nTerceira, num novo bloco.";
    const doc = buildDocument(text);
    expect(doc.blocks.map((b) => b.kind)).toEqual(["paragraph", "paragraph"]);
    expect(doc.blocks[0].text).toBe("Primeira frase. Segunda frase.");
    expect(doc.blocks[1].text).toBe("Terceira, num novo bloco.");
  });
});
