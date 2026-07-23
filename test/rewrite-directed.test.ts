/**
 * Estratégia `directed@3` (ADR-000 · Etapa 4; ADR-047/048/050) —
 * "a engine dirige, a IA executa" — em DOIS briefings.
 *
 * O prompt dirigido troca a dica genérica pelos findings REAIS que a engine achou no trecho, em
 * duas seções: MANDATÓRIO (`requiresHuman: false`, "Resolva TODOS") e BEST-EFFORT (`requiresHuman`
 * dentro do allowlist `BEST_EFFORT_CRITERIA` — hoje só `passive_voice`: "reformule se der SEM
 * inventar; senão mantenha"). O ADR-050 reabriu a passiva sem agente (que o ADR-047/048 excluía)
 * porque agora existe guard determinístico contra a única forma perigosa de "resolvê-la" — inventar
 * o agente — o `no_invented_first_person` (ADR-049). Aqui testamos o que é determinístico e
 * byte-checável: a engine encoda seus findings nas seções certas. O VALOR é medido no benchmark
 * (`rewrite-benchmark.test.ts`, com rede) — por isso o default da UI NÃO muda até a prova (deferral
 * do ADR-000). Sem rede aqui: só a montagem do prompt.
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

describe("directed@3 — a engine dirige a IA em dois briefings (mandatório + best-effort)", () => {
  it("separa o jargão pedível (mandatório) da passiva sem agente (best-effort)", () => {
    const { source, target, findings } = targetAndFindings(SAMPLE);
    expect(findings.length).toBeGreaterThan(1);
    // Verificado empiricamente: no SAMPLE, passive_voice E long_sentence são AMBOS
    // requiresHuman:true (sem agente reconhecido / corte é sempre julgamento humano); só jargão é
    // !requiresHuman. O prompt reflete isso nas seções certas.
    expect(findings.every((f) => f.criterion !== "jargon" ? f.requiresHuman : !f.requiresHuman)).toBe(true);

    const prompt = buildRewritePrompt(source, target, { strategy: "directed", findings });

    // MANDATÓRIO — jargão, "Resolva TODOS"
    expect(prompt).toContain("A engine determinística analisou o trecho e apontou os pontos abaixo");
    expect(prompt).toMatch(/palavras comuns/);
    expect(prompt).toContain('"em sede de"');
    // BEST-EFFORT — passiva sem agente volta ao prompt (ADR-050), com instrução de reformular sem inventar
    expect(prompt).toContain("Voz passiva sem agente explícito");
    expect(prompt).toContain("TENTE reformular SEM inventar o agente");
    expect(prompt).toContain("MANTENHA como está — não invente");
    // NÃO empurra pra voz ativa (que nudge à invenção) nesta passiva sem agente
    expect(prompt).not.toMatch(/voz ativa/);
    // long_sentence é requiresHuman mas NÃO está no allowlist best-effort — não entra em nenhuma seção
    expect(prompt).not.toMatch(/frases curtas/);
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

  it("o id do proposer carrega `directed@3` (proveniência/benchmark)", () => {
    const mock = { id: "mock", models: ["m1"], complete: async () => "{}" } satisfies ChatProvider;
    expect(new LlmRewriteProposer(mock, "m1", "directed").id).toBe(`mock:m1+${STRATEGY_VERSION.directed}`);
    expect(STRATEGY_VERSION.directed).toBe("directed@3");
  });

  it("trecho SÓ com passiva sem agente: seção best-effort SEM 'Resolva TODOS' (o caso do usuário)", () => {
    // impessoal, sem jargão nem frase longa — só a passiva sem agente
    const text = "Foi verificado se a documentação está em ordem.";
    const d = analyze(text);
    const target: Span = { start: 0, end: d.text.length, text: d.text };
    const findings = d.findings.filter((f) => f.criterion === "passive_voice");
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.requiresHuman)).toBe(true);

    const prompt = buildRewritePrompt(d.text, target, { strategy: "directed", findings });
    // NÃO é mandatório — a passiva sem agente não vira "Resolva TODOS"
    expect(prompt).not.toContain("Resolva TODOS");
    // mas AGORA aparece no prompt (ADR-050), na seção best-effort
    expect(prompt).toContain("Voz passiva sem agente explícito");
    expect(prompt).toContain("MANTENHA como está — não invente");
  });
});
