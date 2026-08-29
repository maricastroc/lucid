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

describe("directed@4 — the engine directs the AI through two briefings (mandatory + best-effort)", () => {
  it("separates askable jargon (mandatory) from an agentless passive (best-effort)", () => {
    const { source, target, findings } = targetAndFindings(SAMPLE);
    expect(findings.length).toBeGreaterThan(1);
    expect(findings.every((f) => (f.criterion !== "jargon" ? f.requiresHuman : !f.requiresHuman))).toBe(true);

    const prompt = buildRewritePrompt(source, target, { strategy: "directed", findings });

    expect(prompt).toContain("A engine determinística analisou o trecho e apontou os pontos abaixo");
    expect(prompt).toMatch(/palavras comuns/);
    expect(prompt).toContain('"em sede de"');
    expect(prompt).toContain("Voz passiva sem agente explícito");
    expect(prompt).toContain("TENTE reformular SEM inventar o agente");
    expect(prompt).toContain("MANTENHA como está — não invente");
    expect(prompt).not.toMatch(/voz ativa/);
    expect(prompt).not.toMatch(/frases curtas/);
    expect(prompt).toContain("NÃO invente quem praticou a ação");
    expect(prompt).toContain(target.text);
  });

  it("with a passive that HAS an agent (requiresHuman: false), the active-voice hint shows up", () => {
    const text = "O documento foi analisado pela comissão.";
    const d = analyze(text);
    const target: Span = { start: 0, end: d.text.length, text: d.text };
    const findings = d.findings.filter((f) => f.criterion === "passive_voice");
    expect(findings.some((f) => !f.requiresHuman)).toBe(true);

    const prompt = buildRewritePrompt(d.text, target, { strategy: "directed", findings });
    expect(prompt).toMatch(/voz ativa/);
  });

  it("deterministic: same findings → byte-identical prompt", () => {
    const a = targetAndFindings(SAMPLE);
    const b = targetAndFindings(SAMPLE);
    expect(buildRewritePrompt(a.source, a.target, { strategy: "directed", findings: a.findings })).toBe(
      buildRewritePrompt(b.source, b.target, { strategy: "directed", findings: b.findings }),
    );
  });

  it("differs from the free rewrite: the briefing is what changes (same excerpt, same shielding)", () => {
    const { source, target, findings } = targetAndFindings(SAMPLE);
    const directed = buildRewritePrompt(source, target, { strategy: "directed", findings });
    const free = buildRewritePrompt(source, target, { strategy: "rewrite" });
    expect(directed).not.toBe(free);
    expect(free).not.toContain("apontou os pontos abaixo");
  });

  it("with no findings → degrades to the free format (no empty briefing block)", () => {
    const { source, target } = targetAndFindings(SAMPLE);
    const prompt = buildRewritePrompt(source, target, { strategy: "directed", findings: [] });
    expect(prompt).not.toContain("apontou os pontos abaixo");
    expect(prompt).toContain(target.text);
    expect(prompt).toContain("NÃO invente");
  });

  it("the proposer id carries `directed@4` (provenance/benchmark)", () => {
    const mock = { id: "mock", models: ["m1"], complete: async () => "{}" } satisfies ChatProvider;
    expect(new LlmRewriteProposer(mock, "m1", "directed").id).toBe(`mock:m1+${STRATEGY_VERSION.directed}`);
    expect(STRATEGY_VERSION.directed).toBe("directed@4");
  });

  it("an excerpt with ONLY an agentless passive: best-effort section WITHOUT 'Resolva TODOS' (the user's case)", () => {
    const text = "Foi verificado se a documentação está em ordem.";
    const d = analyze(text);
    const target: Span = { start: 0, end: d.text.length, text: d.text };
    const findings = d.findings.filter((f) => f.criterion === "passive_voice");
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.requiresHuman)).toBe(true);

    const prompt = buildRewritePrompt(d.text, target, { strategy: "directed", findings });

    expect(prompt).not.toContain("Resolva TODOS");
    expect(prompt).toContain("Voz passiva sem agente explícito");
    expect(prompt).toContain("MANTENHA como está — não invente");
  });
});

describe("directed@4 — elicitation inside the briefing (ADR-055): the author's answer becomes a requirement, not a template", () => {
  const TEXT = "A decisão foi comunicada ao interessado no processo administrativo em curso.";

  function passiveAndTarget(text: string) {
    const d = analyze(text);
    const target: Span = { start: 0, end: d.text.length, text: d.text };
    const findings = d.findings.filter((f) => f.criterion === "passive_voice");
    if (findings.length === 0) throw new Error("no passive in the test text");
    return { source: d.text, target, findings };
  }

  it("a declared agent: the finding leaves best-effort and becomes an instruction to name EXACTLY that agent", () => {
    const { source, target, findings } = passiveAndTarget(TEXT);
    const prompt = buildRewritePrompt(source, target, {
      strategy: "directed",
      findings,
      declarations: [{ span: findings[0].span, agent: "a comissão" }],
    });

    expect(prompt).toContain("O AUTOR do texto respondeu quem pratica a ação");
    expect(prompt).toContain("agente declarado: «a comissão»");
    expect(prompt).toContain("usá-lo NÃO é inventar");
    expect(prompt).not.toContain("TENTE reformular SEM inventar o agente");
  });

  it("the decision to stay impersonal (agent: null): an instruction NOT to force the active voice", () => {
    const { source, target, findings } = passiveAndTarget(TEXT);
    const prompt = buildRewritePrompt(source, target, {
      strategy: "directed",
      findings,
      declarations: [{ span: findings[0].span, agent: null }],
    });

    expect(prompt).toContain("o AUTOR decidiu NÃO nomear quem pratica a ação");
    expect(prompt).toContain("MANTENHA a construção impessoal");
    expect(prompt).not.toContain("agente declarado:");
    expect(prompt).not.toContain("TENTE reformular SEM inventar o agente");
  });

  it("a declaration whose span matches no finding is ignored (best-effort carries on)", () => {
    const { source, target, findings } = passiveAndTarget(TEXT);
    const prompt = buildRewritePrompt(source, target, {
      strategy: "directed",
      findings,
      declarations: [{ span: { start: 0, end: 1, text: "A" }, agent: "a comissão" }],
    });

    expect(prompt).not.toContain("agente declarado:");
    expect(prompt).toContain("TENTE reformular SEM inventar o agente");
  });

  it("declarations only take effect in the directed strategy (the free rewrite carries no briefing)", () => {
    const { source, target, findings } = passiveAndTarget(TEXT);
    const prompt = buildRewritePrompt(source, target, {
      strategy: "rewrite",
      findings,
      declarations: [{ span: findings[0].span, agent: "a comissão" }],
    });

    expect(prompt).not.toContain("agente declarado:");
  });

  it("deterministic: same declarations → byte-identical prompt", () => {
    const a = passiveAndTarget(TEXT);
    const b = passiveAndTarget(TEXT);
    const declsA = [{ span: a.findings[0].span, agent: "a comissão" }];
    const declsB = [{ span: b.findings[0].span, agent: "a comissão" }];
    expect(
      buildRewritePrompt(a.source, a.target, { strategy: "directed", findings: a.findings, declarations: declsA }),
    ).toBe(
      buildRewritePrompt(b.source, b.target, { strategy: "directed", findings: b.findings, declarations: declsB }),
    );
  });
});
