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
    expect(found[0].source).toBe("structural-heuristic");
    expect(found[0].principleGroup).toBe("findable");
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

    expect(found.find((f) => f.span.text === "Recurso administrativo")).toBeUndefined();
  });

  it("plural/singular do mesmo termo conta como eco (normalização de número — Etapa 1)", () => {
    const found = findingsFor([
      H("Documentos necessários"),
      P("Você deve entregar o documento na secretaria até o fim do prazo estabelecido pelo edital."),
    ]);
    expect(found).toHaveLength(0);
  });

  it("plural em -ções ecoa o singular em -ção (solicitações ≈ solicitação)", () => {
    const found = findingsFor([
      H("Solicitações de acesso"),
      P("Cada solicitação de acesso é analisada pela equipe responsável no prazo de cinco dias úteis."),
    ]);
    expect(found).toHaveLength(0);
  });

  it("caso do briefing: 'Solicitação de benefícios' × 'solicitar o benefício' não marca (eco via 'benefício')", () => {
    const found = findingsFor([
      H("Solicitação de benefícios"),
      P("Para solicitar o benefício, o interessado apresenta os documentos exigidos e aguarda a análise."),
    ]);
    expect(found).toHaveLength(0);
  });

  it("LIMITAÇÃO CONHECIDA: relação derivacional (substantivo × verbo) NÃO é reconhecida", () => {
    const found = findingsFor([
      H("Solicitação"),
      P("Para solicitar, o interessado comparece à unidade e aguarda o atendimento presencial da equipe."),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe("info");
  });

  it("títulos com raízes distintas NÃO são fundidos pela normalização (casamento ≠ casas)", () => {
    const found = findingsFor([
      H("Casamento civil"),
      P("As casas antigas do bairro foram tombadas pelo conselho municipal de patrimônio histórico."),
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
