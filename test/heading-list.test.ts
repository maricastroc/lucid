import { describe, expect, it } from "vitest";
import { analyze, analyzeDocument, buildStructuredDocument, type Finding, type RawBlock } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { ptDocumentServices } from "../src/locales/pt-BR";

const H = (text: string, level = 1): RawBlock => ({ kind: "heading", level, text });
const P = (text: string): RawBlock => ({ kind: "paragraph", text });
const L = (ordered: boolean, ...items: string[]): RawBlock => ({ kind: "list", ordered, items });

function findingsFor(blocks: RawBlock[], criterion: string, config = DEFAULT_CONFIG): Finding[] {
  return analyzeDocument(buildStructuredDocument(blocks, ptDocumentServices), config).findings.filter(
    (f) => f.criterion === criterion,
  );
}

describe("long_heading", () => {
  it("título acima do limite de palavras → marca (reason=length, warning, requiresHuman, sem sugestão)", () => {
    const longo =
      "Como solicitar o benefício por incapacidade permanente junto ao instituto nacional do seguro social responsável";
    const found = findingsFor([H(longo), P("Um parágrafo.")], "long_heading");
    expect(found).toHaveLength(1);
    expect(found[0].span.text).toBe(longo);
    expect(found[0].normativeReference?.section).toBe("5.2");
    expect(found[0].category).toBe("structural");
    expect(found[0].severity).toBe("warning");
    expect(found[0].requiresHuman).toBe(true);
    expect(found[0].suggestion).toBeUndefined();
    expect(found[0].meta).toMatchObject({ reason: "length" });
  });

  it("título curto que termina com ponto final → marca (reason=sentence)", () => {
    const found = findingsFor([H("Regras gerais do procedimento.")], "long_heading");
    expect(found).toHaveLength(1);
    expect(found[0].meta).toMatchObject({ reason: "sentence" });
  });

  it("título com duas frases → marca (reason=sentence)", () => {
    const found = findingsFor([H("Você tem direitos. Conheça-os aqui")], "long_heading");
    expect(found).toHaveLength(1);
    expect(found[0].meta).toMatchObject({ reason: "sentence", sentences: 2 });
  });

  it("título curto e sem ponto final → não marca", () => {
    expect(findingsFor([H("Prazos e documentos")], "long_heading")).toHaveLength(0);
  });

  it("título-pergunta (termina com “?”) é boa LS → não marca", () => {
    expect(findingsFor([H("O que muda para você?")], "long_heading")).toHaveLength(0);
  });

  it("comprimento tem prioridade — um título longo ganha uma marca só", () => {
    const longoEFrase =
      "Este título é deliberadamente longo o suficiente para ultrapassar com folga o limite configurado de palavras.";
    const found = findingsFor([H(longoEFrase)], "long_heading");
    expect(found).toHaveLength(1);
    expect(found[0].meta).toMatchObject({ reason: "length" });
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, longHeading: { enabled: false, maxWords: 12 } };
    expect(findingsFor([H("Regras gerais do procedimento.")], "long_heading", config)).toHaveLength(0);
  });

  it("texto puro (sem títulos) nunca dispara", () => {
    const found = analyze("Uma frase qualquer aqui. E outra ali.").findings.filter((f) => f.criterion === "long_heading");
    expect(found).toHaveLength(0);
  });
});

describe("single_item_list", () => {
  it("lista de um item → marca (info — higiene estrutural, requiresHuman, sem sugestão)", () => {
    const found = findingsFor([P("Intro."), L(false, "Único item da lista")], "single_item_list");
    expect(found).toHaveLength(1);
    expect(found[0].span.text).toBe("Único item da lista");
    expect(found[0].principleGroup).toBe("findable");
    expect(found[0].category).toBe("structural");
    expect(found[0].severity).toBe("info");
    expect(found[0].source).toBe("structural-heuristic");
    expect(found[0].requiresHuman).toBe(true);
    expect(found[0].suggestion).toBeUndefined();
    expect(found[0].meta).toMatchObject({ ordered: false });
  });

  it("lista com dois ou mais itens → não marca", () => {
    expect(findingsFor([L(true, "Primeiro", "Segundo")], "single_item_list")).toHaveLength(0);
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, singleItemList: { enabled: false } };
    expect(findingsFor([L(false, "Único")], "single_item_list", config)).toHaveLength(0);
  });

  it("texto puro (sem listas) nunca dispara", () => {
    const found = analyze("Primeiro isto. Depois aquilo.").findings.filter((f) => f.criterion === "single_item_list");
    expect(found).toHaveLength(0);
  });
});
