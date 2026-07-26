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
  it("the body echoes a word from the heading (same exact form) → no finding", () => {
    const found = findingsFor([
      H("Prazos e documentos"),
      P("Os documentos exigidos devem ser entregues na secretaria até sexta-feira."),
    ]);
    expect(found).toHaveLength(0);
  });

  it("zero content words in common, body with enough substance → marks (info, requiresHuman, no suggestion)", () => {
    const heading = "Prazos e documentos";
    const found = findingsFor([
      H(heading),
      P("A comissão avaliará os pedidos recebidos na reunião de sexta-feira."),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].span.text).toBe(heading);
    expect(found[0].source).toBe("structural-heuristic");
    expect(found[0].principleGroup).toBe("findable");
    expect(found[0].category).toBe("structural");
    expect(found[0].severity).toBe("info");
    expect(found[0].requiresHuman).toBe(true);
    expect(found[0].suggestion).toBeUndefined();
    expect(found[0].meta?.headingContentWords).toBeGreaterThan(0);
    expect(found[0].meta?.bodyContentWords).toBeGreaterThanOrEqual(DEFAULT_CONFIG.headingBodyMismatch.minBodyContentWords);
  });

  it("a body that is too short (below the content-word minimum) → no finding, even with no echo", () => {
    const found = findingsFor([H("Prazos e documentos"), P("Leia com atenção.")]);
    expect(found).toHaveLength(0);
  });

  it("a heading with no body (immediately followed by another heading) → no finding — out of scope here", () => {
    const found = findingsFor([H("Introdução"), H("Regras gerais")]);
    expect(found).toHaveLength(0);
  });

  it("a heading made only of function words → no finding (nothing to compare)", () => {
    const found = findingsFor([
      H("Isto ou aquilo"),
      P("A comissão avaliará os pedidos recebidos na reunião de sexta-feira."),
    ]);
    expect(found).toHaveLength(0);
  });

  it("a nested heading (H2) inside the H1 section counts as an echo of the H1", () => {
    const found = findingsFor([
      H("Recurso administrativo", 1),
      P("Esta seção descreve as regras gerais do processo."),
      H("Recurso: forma e prazo", 2),
      P("O pedido deve ser protocolado em até dez dias, com a justificativa do requerente."),
    ]);

    expect(found.find((f) => f.span.text === "Recurso administrativo")).toBeUndefined();
  });

  it("plural/singular of the same term counts as an echo (number normalization — Step 1)", () => {
    const found = findingsFor([
      H("Documentos necessários"),
      P("Você deve entregar o documento na secretaria até o fim do prazo estabelecido pelo edital."),
    ]);
    expect(found).toHaveLength(0);
  });

  it("a -ções plural echoes the -ção singular (solicitações ≈ solicitação)", () => {
    const found = findingsFor([
      H("Solicitações de acesso"),
      P("Cada solicitação de acesso é analisada pela equipe responsável no prazo de cinco dias úteis."),
    ]);
    expect(found).toHaveLength(0);
  });

  it("the briefing case: 'Solicitação de benefícios' × 'solicitar o benefício' does not mark (echo via 'benefício')", () => {
    const found = findingsFor([
      H("Solicitação de benefícios"),
      P("Para solicitar o benefício, o interessado apresenta os documentos exigidos e aguarda a análise."),
    ]);
    expect(found).toHaveLength(0);
  });

  it("a derivation in the CURATED glossary counts as an echo — noun in the heading, verb in the body (A7)", () => {
    expect(
      findingsFor([
        H("Solicitação"),
        P("Para solicitar, o interessado comparece à unidade e aguarda o atendimento presencial da equipe."),
      ]),
    ).toHaveLength(0);
  });

  it("the audit's case: 'Pagamento da taxa' × 'pagar' no longer mismatches", () => {
    expect(
      findingsFor([
        H("Pagamento da taxa"),
        P("Para pagar, use o boleto emitido pelo sistema depois que a inscrição for confirmada."),
      ]),
    ).toHaveLength(0);
  });

  it("the bridge works in either direction (verb in the heading, noun in the body)", () => {
    expect(
      findingsFor([
        H("Como verificar"),
        P("A verificação é feita pela equipe responsável no prazo de cinco dias úteis a contar do pedido."),
      ]),
    ).toHaveLength(0);
  });

  it("DECLARED LIMIT: a derivation OUTSIDE the curated glossary still reads as a mismatch", () => {
    const found = findingsFor([
      H("Prorrogação"),
      P("Para prorrogar, o interessado apresenta o pedido à unidade antes do fim do prazo original."),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe("info");
  });

  it("the bridge does not merge unrelated words that merely start alike", () => {
    const found = findingsFor([
      H("Pagamento"),
      P("A página inicial do sistema traz o painel com os pareceres publicados pela comissão nesta semana."),
    ]);
    expect(found).toHaveLength(1);
  });

  it("headings with distinct stems are NOT merged by normalization (casamento ≠ casas)", () => {
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

  it("plain text (no headings) never triggers", () => {
    const found = analyze(
      "A comissão avaliará os pedidos recebidos na reunião de sexta-feira. Outro parágrafo qualquer aqui.",
    ).findings.filter((f) => f.criterion === "heading_body_mismatch");
    expect(found).toHaveLength(0);
  });
});
