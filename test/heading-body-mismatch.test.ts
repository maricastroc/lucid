/**
 * `heading_body_mismatch` (5.1, Relevante) — o primeiro detector de Princípio 1: título e corpo da
 * seção não compartilham NENHUMA palavra de conteúdo (proxy fraco de "o título antecipa o que o
 * leitor vai encontrar?"). Só existe em documento estruturado — texto puro não tem título de verdade.
 */
import { describe, expect, it } from "vitest";
import { analyze, analyzeDocument, buildStructuredDocument, type Finding, type RawBlock } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { ptDocumentServices } from "../src/locales/pt-BR";

const H = (text: string, level = 1): RawBlock => ({ kind: "heading", level, text });
const P = (text: string): RawBlock => ({ kind: "paragraph", text });

function findingsFor(blocks: RawBlock[], config = DEFAULT_CONFIG): Finding[] {
  return analyzeDocument(buildStructuredDocument(blocks, ptDocumentServices), config).findings.filter(
    (f) => f.criterion === "heading_body_mismatch",
  );
}

describe("heading_body_mismatch", () => {
  it("corpo ecoa uma palavra do título (mesma forma exata) → não marca", () => {
    const found = findingsFor([
      H("Prazos e documentos"),
      P("Os documentos exigidos devem ser entregues na secretaria até sexta-feira."),
    ]);
    expect(found).toHaveLength(0);
  });

  it("zero palavra de conteúdo em comum, corpo com substância suficiente → marca (info, requiresHuman, sem sugestão)", () => {
    const titulo = "Prazos e documentos";
    const found = findingsFor([
      H(titulo),
      P("A comissão avaliará os pedidos recebidos na reunião de sexta-feira."),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].span.text).toBe(titulo);
    expect(found[0].principle).toBe("5.1");
    expect(found[0].category).toBe("structural");
    expect(found[0].severity).toBe("info");
    expect(found[0].requiresHuman).toBe(true);
    expect(found[0].suggestion).toBeUndefined();
    expect(found[0].meta?.headingContentWords).toBeGreaterThan(0);
    expect(found[0].meta?.bodyContentWords).toBeGreaterThanOrEqual(DEFAULT_CONFIG.headingBodyMismatch.minBodyContentWords);
  });

  it("corpo curto demais (abaixo do mínimo de palavras de conteúdo) → não marca, mesmo sem eco", () => {
    const found = findingsFor([H("Prazos e documentos"), P("Leia com atenção.")]);
    expect(found).toHaveLength(0);
  });

  it("título sem corpo (imediatamente seguido de outro título) → não marca — fora de escopo aqui", () => {
    const found = findingsFor([H("Introdução"), H("Regras gerais")]);
    expect(found).toHaveLength(0);
  });

  it("título composto só de palavras função → não marca (nada para comparar)", () => {
    const found = findingsFor([
      H("Isto ou aquilo"),
      P("A comissão avaliará os pedidos recebidos na reunião de sexta-feira."),
    ]);
    expect(found).toHaveLength(0);
  });

  it("título aninhado (H2) dentro da seção do H1 conta como eco do H1", () => {
    const found = findingsFor([
      H("Recurso administrativo", 1),
      P("Esta seção descreve as regras gerais do processo."),
      H("Recurso: forma e prazo", 2),
      P("O pedido deve ser protocolado em até dez dias, com a justificativa do requerente."),
    ]);
    // "recurso" no H2 ecoa "recurso" do H1 — nenhuma marca no H1.
    expect(found.find((f) => f.span.text === "Recurso administrativo")).toBeUndefined();
  });

  it("LIMITAÇÃO CONHECIDA: comparação exata (sem lemas) — singular/plural do mesmo termo não conta como eco", () => {
    // O corpo é claramente sobre "documento" (singular), mas o título usa "Documentos" (plural);
    // sem lematização, a ferramenta não reconhece a mesma raiz — marca mesmo sendo, na prática,
    // relevante. Comportamento aceito e documentado: o sinal já nasce fraco (severity "info").
    const found = findingsFor([
      H("Documentos necessários"),
      P("Você deve entregar o documento na secretaria até o fim do prazo estabelecido pelo edital."),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe("info");
  });

  it("kill switch", () => {
    const config = { ...DEFAULT_CONFIG, headingBodyMismatch: { enabled: false, minBodyContentWords: 6 } };
    const found = findingsFor(
      [H("Prazos e documentos"), P("A comissão avaliará os pedidos recebidos na reunião de sexta-feira.")],
      config,
    );
    expect(found).toHaveLength(0);
  });

  it("texto puro (sem títulos) nunca dispara", () => {
    const found = analyze(
      "A comissão avaliará os pedidos recebidos na reunião de sexta-feira. Outro parágrafo qualquer aqui.",
    ).findings.filter((f) => f.criterion === "heading_body_mismatch");
    expect(found).toHaveLength(0);
  });
});
