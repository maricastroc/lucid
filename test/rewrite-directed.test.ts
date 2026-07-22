/**
 * Estratégia `directed@2` (ADR-000 · Etapa 4; requiresHuman-filtering do ADR-047/048) —
 * "a engine dirige, a IA executa" — só com o que é MECANICAMENTE PEDÍVEL.
 *
 * O prompt dirigido troca a dica genérica pelo BRIEFING dos findings REAIS que a engine achou no
 * trecho — mas só os `requiresHuman: false` (achado ao vivo de 2026-07-22: pedir pra IA "resolver"
 * um achado `requiresHuman` — passiva sem agente, frase longa, jargão ambíguo — colide direto com a
 * regra de não-invenção do mesmo prompt; um modelo bem-comportado recusa inventar e o verificador
 * antigo punia essa recusa correta). Aqui testamos o que é determinístico e byte-checável: a engine
 * encoda seus findings RESOLVÍVEIS no prompt corretamente. O VALOR (dirigir bate a dica estática) é
 * medido no benchmark de sistemas (`rewrite-benchmark.test.ts`, com rede) — por isso o default da UI
 * NÃO muda até a prova (deferral do ADR-000). Sem rede aqui: só a montagem do prompt.
 */
import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import type { Span } from "../src/lucid/core/types";
import { buildRewritePrompt, LlmRewriteProposer, STRATEGY_VERSION } from "../src/report/rewrite";
import type { ChatProvider } from "../src/llm";

const SAMPLE =
  "Foi realizada a análise do documento pela comissão competente em sede de procedimento " +
  "administrativo destinado à verificação das condições supracitadas exigidas para a concessão do " +
  "benefício, e a decisão foi comunicada ao interessado no processo.";

function targetAndFindings(text: string) {
  const d = analyze(text);
  const target: Span = { start: 0, end: d.text.length, text: d.text };
  const findings = d.findings.filter((f) => f.span.start < target.end && f.span.end > target.start);
  return { source: d.text, target, findings };
}

describe("directed@2 — a engine dirige a IA com seus findings reais (só os pedíveis)", () => {
  it("o prompt dirigido lista os problemas RESOLVÍVEIS que a engine achou no trecho", () => {
    const { source, target, findings } = targetAndFindings(SAMPLE);
    expect(findings.length).toBeGreaterThan(1);
    // Verificado empiricamente: no SAMPLE, passive_voice E long_sentence são AMBOS
    // requiresHuman:true (sem agente reconhecido / corte é sempre julgamento humano) — só jargão
    // sobra como pedível. O briefing reflete isso, não pede o que não pode pedir.
    expect(findings.every((f) => f.criterion !== "jargon" ? f.requiresHuman : !f.requiresHuman)).toBe(true);

    const prompt = buildRewritePrompt(source, target, { strategy: "directed", findings });

    expect(prompt).toContain("A engine determinística analisou o trecho e apontou os pontos abaixo");
    expect(prompt).toMatch(/palavras comuns/);
    expect(prompt).toContain('"em sede de"');
    // NÃO pede voz ativa nem frase-curta aqui — ambos requiresHuman neste texto específico.
    expect(prompt).not.toMatch(/voz ativa/);
    expect(prompt).toContain("NÃO invente quem praticou a ação");
    expect(prompt).toContain(target.text);
  });

  it("com uma passiva QUE TEM agente (requiresHuman: false), o hint de voz ativa aparece", () => {
    const text = "O documento foi analisado pela comissão.";
    const d = analyze(text);
    const target: Span = { start: 0, end: d.text.length, text: d.text };
    const findings = d.findings.filter((f) => f.criterion === "passive_voice");
    expect(findings.some((f) => !f.requiresHuman)).toBe(true);

    const prompt = buildRewritePrompt(d.text, target, { strategy: "directed", findings });
    expect(prompt).toMatch(/voz ativa/);
  });

  it("determinístico: mesmos findings → prompt byte-idêntico", () => {
    const a = targetAndFindings(SAMPLE);
    const b = targetAndFindings(SAMPLE);
    expect(buildRewritePrompt(a.source, a.target, { strategy: "directed", findings: a.findings })).toBe(
      buildRewritePrompt(b.source, b.target, { strategy: "directed", findings: b.findings }),
    );
  });

  it("difere do rewrite livre: o briefing é o que muda (mesmo trecho, mesma blindagem)", () => {
    const { source, target, findings } = targetAndFindings(SAMPLE);
    const directed = buildRewritePrompt(source, target, { strategy: "directed", findings });
    const free = buildRewritePrompt(source, target, { strategy: "rewrite" });
    expect(directed).not.toBe(free);
    expect(free).not.toContain("apontou os pontos abaixo");
  });

  it("sem findings → degrada para o formato livre (sem bloco de briefing vazio)", () => {
    const { source, target } = targetAndFindings(SAMPLE);
    const prompt = buildRewritePrompt(source, target, { strategy: "directed", findings: [] });
    expect(prompt).not.toContain("apontou os pontos abaixo");
    expect(prompt).toContain(target.text);
    expect(prompt).toContain("NÃO invente");
  });

  it("o id do proposer carrega `directed@2` (proveniência/benchmark)", () => {
    const mock = { id: "mock", models: ["m1"], complete: async () => "{}" } satisfies ChatProvider;
    expect(new LlmRewriteProposer(mock, "m1", "directed").id).toBe(`mock:m1+${STRATEGY_VERSION.directed}`);
    expect(STRATEGY_VERSION.directed).toBe("directed@2");
  });
});
