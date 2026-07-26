import { describe, expect, it, vi } from "vitest";
import { analyze } from "../src/lucid";
import type { Finding } from "../src/lucid/core/types";
import {
  applyProposal,
  proposeAndVerify,
  StubRewriteProposer,
  verifyRewrite,
  type RewriteProposal,
  type VerifyOptions,
} from "../src/report/rewrite";
import { StubComprehensionProbe } from "../src/lucid/probe/stub-probe";
import type { ComprehensionProbe, ProbeInput, ProbeResult } from "../src/lucid/probe/types";

function spanFinding(text: string, sub: string, criterion = "long_sentence"): Finding {
  const start = text.indexOf(sub);
  if (start < 0) throw new Error(`no such excerpt: ${sub}`);
  return {
    criterion,
    category: "syntactic",
    source: "iso-24495-1",
    principleGroup: "understandable",
    normativeReference: { standard: "ABNT NBR ISO 24495-1", section: "5.3.4" },
    span: { start, end: start + sub.length, text: sub },
    severity: "warning",
    requiresHuman: true,
    justification: "",
  };
}

function proposal(finding: Finding, proposed: string): RewriteProposal {
  return { proposerId: "test", original: finding.span.text, proposed };
}

function proofPassed(v: { proofs: { check: string; passed: boolean }[] }, check: string): boolean {
  return v.proofs.find((p) => p.check === check)!.passed;
}
function signalFlagged(v: { signals: { check: string; flagged: boolean }[] }, check: string): boolean | undefined {
  return v.signals.find((s) => s.check === check)?.flagged;
}

function verify(text: string, finding: Finding, p: RewriteProposal, opts: VerifyOptions = {}) {
  return verifyRewrite(text, finding.span, p, { criterion: finding.criterion, ...opts });
}
function propose(text: string, finding: Finding, proposer: StubRewriteProposer) {
  return proposeAndVerify(text, finding.span, proposer, { criterion: finding.criterion });
}

describe("verifyRewrite — PROOF: the target violation is resolved", () => {
  it("splitting a long sentence resolves the target and does not increase the total number of findings", async () => {
    const text =
      "O documento apresentado foi analisado com muito cuidado pela comissão competente responsável, " +
      "e o resultado final desse exame minucioso foi comunicado ao interessado dentro do prazo regular.";
    const finding = analyze(text).findings.find((f) => f.criterion === "long_sentence")!;
    const p = proposal(
      finding,
      "O documento apresentado foi analisado pela comissão. O resultado foi comunicado ao interessado no prazo.",
    );

    const v = await verify(text, finding, p);

    expect(proofPassed(v, "target_resolved")).toBe(true);
    expect(proofPassed(v, "no_new_findings")).toBe(true);
    expect(v.hasBlockingFailure).toBe(false);
    expect(v.metrics.wordsAfter).toBeLessThan(v.metrics.wordsBefore);
  });

  it("severity weighting: trading 1 error for 2 warnings PASSES region_improved (a raw count would go up)", async () => {
    const text =
      "A equipe da secretaria revisou com muita atenção todos os documentos que chegaram durante a semana " +
      "passada, para garantir que o relatório final destinado ao diretor ficasse realmente completo, bem claro e correto.";
    const finding = analyze(text).findings.find((f) => f.criterion === "long_sentence")!;
    expect(finding.severity).toBe("error");

    const proposed =
      "A equipe da secretaria revisou com bastante atenção todos os documentos que chegaram na semana passada para " +
      "deixar o relatório final bem completo. Depois disso, o setor enviou uma cópia para cada pessoa que participou " +
      "do processo e pediu que todos confirmassem o retorno até sexta.";
    const v = await verifyRewrite(text, finding.span, { proposerId: "test", original: finding.span.text, proposed });

    expect(proofPassed(v, "region_improved")).toBe(true);
    expect(v.hasBlockingFailure).toBe(false);
    expect(v.proofs.find((p) => p.check === "region_improved")!.detail).toMatch(/peso/);
  });

  it("a proposal that does NOT resolve the target fails target_resolved (mechanical veto)", async () => {
    const text =
      "O documento apresentado foi analisado com muito cuidado pela comissão competente responsável, " +
      "e o resultado final desse exame minucioso foi comunicado ao interessado dentro do prazo regular.";
    const finding = analyze(text).findings.find((f) => f.criterion === "long_sentence")!;

    const p = proposal(finding, finding.span.text + " Ainda mais palavras foram acrescentadas sem necessidade alguma aqui.");

    const v = await verify(text, finding, p);

    expect(proofPassed(v, "target_resolved")).toBe(false);
    expect(v.hasBlockingFailure).toBe(true);
  });
});

describe("verifyRewrite — PROOF: the directed briefing (multiple criteria) is resolved", () => {
  const PARAGRAPH =
    "Foi realizada a análise do documento pela comissão competente em sede de procedimento " +
    "administrativo destinado à verificação das condições supracitadas exigidas para a concessão do " +
    "benefício, e a decisão foi comunicada ao interessado no processo.";

  it("empirical check: no passive in the paragraph is mechanically askable (both requiresHuman)", () => {
    const passives = analyze(PARAGRAPH).findings.filter((f) => f.criterion === "passive_voice");
    expect(passives.length).toBeGreaterThan(0);
    expect(passives.every((f) => f.requiresHuman)).toBe(true);
  });

  it("Groq 70B (live): resolved jargon/long sentence; the passive was never askable here — PASSES (correcting the original finding)", async () => {
    const findings = analyze(PARAGRAPH).findings;
    const proposed =
      "Foi feita uma análise do documento. Isso foi feito para verificar as condições necessárias " +
      "para conceder o benefício. A decisão foi comunicada ao interessado no processo.";
    const target = { start: 0, end: PARAGRAPH.length, text: PARAGRAPH };
    const v = await verifyRewrite(PARAGRAPH, target, { proposerId: "groq-70b-live", original: PARAGRAPH, proposed }, {
      findings,
    });

    expect(proofPassed(v, "directed_findings_resolved")).toBe(true);
  });

  it("Gemini Flash (live): same conclusion — PASSES", async () => {
    const findings = analyze(PARAGRAPH).findings;
    const proposed =
      "A comissão analisou o documento. Ela verificou as condições necessárias para dar o benefício. " +
      "A decisão foi informada à pessoa interessada no processo.";
    const target = { start: 0, end: PARAGRAPH.length, text: PARAGRAPH };
    const v = await verifyRewrite(PARAGRAPH, target, { proposerId: "gemini-flash-live", original: PARAGRAPH, proposed }, {
      findings,
    });

    expect(proofPassed(v, "directed_findings_resolved")).toBe(true);
  });

  it("a rewrite that resolves ALL the ASKABLE criteria in the briefing passes", async () => {
    const findings = analyze(PARAGRAPH).findings;
    const proposed =
      "A comissão competente analisou o documento no procedimento administrativo. Ela verificou as " +
      "condições citadas acima exigidas para conceder o benefício. Depois, comunicou a decisão ao interessado.";
    const target = { start: 0, end: PARAGRAPH.length, text: PARAGRAPH };
    const v = await verifyRewrite(PARAGRAPH, target, { proposerId: "ideal", original: PARAGRAPH, proposed }, {
      findings,
    });

    expect(proofPassed(v, "directed_findings_resolved")).toBe(true);
  });

  const RESOLVABLE_PASSIVE = "O documento foi analisado pela comissão.";

  it("a finding WITH AN AGENT (mechanically solvable) that the AI IGNORES — FAILS, even with the jargon fixed", async () => {
    const text = `${RESOLVABLE_PASSIVE} O pagamento ocorre em sede de acordo prévio.`;
    const findings = analyze(text).findings.filter((f) => f.criterion === "passive_voice" || f.criterion === "jargon");
    expect(findings.some((f) => f.criterion === "passive_voice" && !f.requiresHuman)).toBe(true);

    const proposed = `${RESOLVABLE_PASSIVE} O pagamento ocorre conforme acordo prévio.`;
    const target = { start: 0, end: text.length, text };
    const v = await verifyRewrite(text, target, { proposerId: "ignorou-pedivel", original: text, proposed }, {
      findings,
    });

    expect(proofPassed(v, "directed_findings_resolved")).toBe(false);
    const detail = v.proofs.find((p) => p.check === "directed_findings_resolved")!.detail;
    expect(detail).toContain("passive_voice");
  });

  it("mixed: the passive WITH an agent is fixed, the one WITHOUT (requiresHuman) is tolerated — PASSES", async () => {
    const text = `${RESOLVABLE_PASSIVE} A decisão foi comunicada ao interessado.`;
    const findings = analyze(text).findings.filter((f) => f.criterion === "passive_voice");
    const resolvableCount = findings.filter((f) => !f.requiresHuman).length;
    const tolerableCount = findings.filter((f) => f.requiresHuman).length;
    expect(resolvableCount).toBeGreaterThan(0);
    expect(tolerableCount).toBeGreaterThan(0);

    const proposed = "A comissão analisou o documento. A decisão foi comunicada ao interessado.";
    const target = { start: 0, end: text.length, text };
    const v = await verifyRewrite(text, target, { proposerId: "correto", original: text, proposed }, { findings });

    expect(proofPassed(v, "directed_findings_resolved")).toBe(true);
  });

  it("mixed: the tolerated agentless passive is 'fixed' while the askable one stays intact — FAILS (no paying by count)", async () => {
    const text = `${RESOLVABLE_PASSIVE} A decisão foi comunicada ao interessado.`;
    const findings = analyze(text).findings.filter((f) => f.criterion === "passive_voice");
    const resolvableCount = findings.filter((f) => !f.requiresHuman).length;
    const tolerableCount = findings.filter((f) => f.requiresHuman).length;
    expect(resolvableCount).toBeGreaterThan(0);
    expect(tolerableCount).toBeGreaterThan(0);

    const proposed = `${RESOLVABLE_PASSIVE} O interessado recebeu a decisão.`;
    const target = { start: 0, end: text.length, text };
    const v = await verifyRewrite(text, target, { proposerId: "trocou-o-errado", original: text, proposed }, {
      findings,
    });

    expect(proofPassed(v, "directed_findings_resolved")).toBe(false);
    const detail = v.proofs.find((p) => p.check === "directed_findings_resolved")!.detail;
    expect(detail).toContain("passive_voice");
  });

  it("deleting the agent of the askable passive instead of fixing it — FAILS (degradation into requiresHuman, not a resolution)", async () => {
    const text = RESOLVABLE_PASSIVE;
    const findings = analyze(text).findings.filter((f) => f.criterion === "passive_voice");
    expect(findings.some((f) => !f.requiresHuman)).toBe(true);

    const proposed = "O documento foi analisado.";
    const target = { start: 0, end: text.length, text };
    const v = await verifyRewrite(text, target, { proposerId: "apagou-o-agente", original: text, proposed }, {
      findings,
    });

    expect(proofPassed(v, "directed_findings_resolved")).toBe(false);
    const detail = v.proofs.find((p) => p.check === "directed_findings_resolved")!.detail;
    expect(detail).toContain("degradou");
  });

  it("with an explicit 'no known agent' declaration, the same degradation does NOT fail (the author's decision, not a silent deletion)", async () => {
    const text = RESOLVABLE_PASSIVE;
    const findings = analyze(text).findings.filter((f) => f.criterion === "passive_voice");
    const passive = findings.find((f) => !f.requiresHuman)!;

    const proposed = "O documento foi analisado.";
    const target = { start: 0, end: text.length, text };
    const v = await verifyRewrite(text, target, { proposerId: "sem-agente-decidido", original: text, proposed }, {
      findings,
      declarations: [{ span: passive.span, agent: null }],
    });

    expect(proofPassed(v, "directed_findings_resolved")).toBe(true);
  });

  it("with no directed findings the proof is OMITTED (it does not invent a check nobody asked for)", async () => {
    const finding = spanFinding("Um texto qualquer aqui.", "Um texto qualquer aqui.", "long_sentence");
    const v = await verify("Um texto qualquer aqui.", finding, proposal(finding, "Outro texto."));
    expect(v.proofs.find((p) => p.check === "directed_findings_resolved")).toBeUndefined();
  });

  it("with a declared agent, the declared_agent_present proof coexists with the directed one", async () => {
    const text = "A decisão foi comunicada ao interessado no processo administrativo em curso.";
    const passive = analyze(text).findings.find((f) => f.criterion === "passive_voice")!;
    expect(passive.requiresHuman).toBe(true);

    const target = { start: 0, end: text.length, text };
    const proposed = "A comissão comunicou a decisão ao interessado no processo administrativo em curso.";
    const v = await verifyRewrite(text, target, { proposerId: "com-declaracao", original: text, proposed }, {
      findings: [passive],
      declarations: [{ span: passive.span, agent: "a comissão" }],
    });

    expect(proofPassed(v, "declared_agent_present")).toBe(true);
  });

  it("findings that are 100% requiresHuman (nothing askable) — the proof is OMITTED, it does not become an empty 'passed'", async () => {
    const passives = analyze(PARAGRAPH).findings.filter((f) => f.criterion === "passive_voice");
    const target = { start: 0, end: PARAGRAPH.length, text: PARAGRAPH };
    const v = await verifyRewrite(PARAGRAPH, target, { proposerId: "x", original: PARAGRAPH, proposed: PARAGRAPH }, {
      findings: passives,
    });
    expect(v.proofs.find((p) => p.check === "directed_findings_resolved")).toBeUndefined();
  });
});

describe("verifyRewrite — PROOF: agent declared by the author (elicitation, ADR-055)", () => {
  const TEXT = "A decisão foi comunicada ao interessado no processo administrativo em curso.";

  function passiveOf(text: string): Finding {
    const f = analyze(text).findings.find((x) => x.criterion === "passive_voice");
    if (!f) throw new Error("no passive in the test text");
    return f;
  }

  function wholeTarget(text: string) {
    return { start: 0, end: text.length, text };
  }

  it("the rewrite names the declared agent (different case) → PASSES", async () => {
    const passive = passiveOf(TEXT);
    const proposed = "A comissão comunicou a decisão ao interessado no processo administrativo em curso.";
    const v = await verifyRewrite(TEXT, wholeTarget(TEXT), { proposerId: "t", original: TEXT, proposed }, {
      declarations: [{ span: passive.span, agent: "a comissão" }],
    });

    expect(proofPassed(v, "declared_agent_present")).toBe(true);
    expect(v.proofs.find((p) => p.check === "declared_agent_present")!.detail).toContain("«a comissão»");
  });

  it("an active rewrite with ANOTHER agent → FAILS (the requirement is the author's agent, not just any)", async () => {
    const passive = passiveOf(TEXT);
    const proposed = "O setor comunicou a decisão ao interessado no processo administrativo em curso.";
    const v = await verifyRewrite(TEXT, wholeTarget(TEXT), { proposerId: "t", original: TEXT, proposed }, {
      declarations: [{ span: passive.span, agent: "a comissão" }],
    });

    expect(proofPassed(v, "declared_agent_present")).toBe(false);
    expect(v.proofs.find((p) => p.check === "declared_agent_present")!.detail).toContain("«a comissão»");
    expect(v.hasBlockingFailure).toBe(true);
  });

  it("the rewrite keeps the passive without naming the declared agent → FAILS", async () => {
    const passive = passiveOf(TEXT);
    const v = await verifyRewrite(TEXT, wholeTarget(TEXT), { proposerId: "t", original: TEXT, proposed: TEXT }, {
      declarations: [{ span: passive.span, agent: "a comissão" }],
    });

    expect(proofPassed(v, "declared_agent_present")).toBe(false);
  });

  it("the decision to stay impersonal (agent: null) → proof OMITTED (the refusal is legitimate, it demands no active voice)", async () => {
    const passive = passiveOf(TEXT);
    const v = await verifyRewrite(TEXT, wholeTarget(TEXT), { proposerId: "t", original: TEXT, proposed: TEXT }, {
      declarations: [{ span: passive.span, agent: null }],
    });

    expect(v.proofs.find((p) => p.check === "declared_agent_present")).toBeUndefined();
  });

  it("with no declarations → proof OMITTED (it does not invent a check nobody asked for)", async () => {
    const v = await verifyRewrite(TEXT, wholeTarget(TEXT), { proposerId: "t", original: TEXT, proposed: TEXT }, {});
    expect(v.proofs.find((p) => p.check === "declared_agent_present")).toBeUndefined();
  });

  it("a declaration OUTSIDE the target → proof OMITTED (it demands nothing about an excerpt that is not being rewritten)", async () => {
    const text = "O relatório segue em análise. A decisão foi comunicada ao interessado no processo.";
    const passive = passiveOf(text);
    const firstSentence = { start: 0, end: 29, text: text.slice(0, 29) };
    expect(passive.span.start).toBeGreaterThan(firstSentence.end);

    const v = await verifyRewrite(
      text,
      firstSentence,
      { proposerId: "t", original: firstSentence.text, proposed: "O relatório está em análise." },
      { declarations: [{ span: passive.span, agent: "a comissão" }] },
    );

    expect(v.proofs.find((p) => p.check === "declared_agent_present")).toBeUndefined();
  });

  it("1st-person exemption: the declared agent «nós» is not a fabrication (the author supplied the fact)", async () => {
    const text = "Foi verificada a documentação enviada pelo requerente ao protocolo geral.";
    const passive = passiveOf(text);
    const proposed = "Nós verificamos a documentação enviada pelo requerente ao protocolo geral.";
    const v = await verifyRewrite(text, wholeTarget(text), { proposerId: "t", original: text, proposed }, {
      declarations: [{ span: passive.span, agent: "nós" }],
    });

    expect(proofPassed(v, "declared_agent_present")).toBe(true);
    expect(proofPassed(v, "no_invented_first_person")).toBe(true);
  });

  it("WITHOUT the declaration, the same 1st-person proposal stays vetoed (the exemption belongs to the declaration, it is not general)", async () => {
    const text = "Foi verificada a documentação enviada pelo requerente ao protocolo geral.";
    const proposed = "Nós verificamos a documentação enviada pelo requerente ao protocolo geral.";
    const v = await verifyRewrite(text, wholeTarget(text), { proposerId: "t", original: text, proposed }, {});

    expect(proofPassed(v, "no_invented_first_person")).toBe(false);
  });

  it("3rd-person exemption: the declared agent «a comissão» does not raise possible_invented_agent", async () => {
    const text = "Foi decidido que o prazo seria prorrogado até o fim do mês corrente.";
    const passive = passiveOf(text);
    const proposed = "A comissão decidiu prorrogar o prazo até o fim do mês corrente.";
    const v = await verifyRewrite(text, wholeTarget(text), { proposerId: "t", original: text, proposed }, {
      declarations: [{ span: passive.span, agent: "a comissão" }],
    });

    expect(proofPassed(v, "declared_agent_present")).toBe(true);
    expect(signalFlagged(v, "possible_invented_agent")).toBe(false);
  });

  it("the exemption is surgical: an UNdeclared agent is still flagged even with another declaration active", async () => {
    const text = "Foi decidido que o prazo seria prorrogado até o fim do mês corrente.";
    const passive = passiveOf(text);
    const proposed = "A equipe decidiu prorrogar o prazo até o fim do mês corrente.";
    const v = await verifyRewrite(text, wholeTarget(text), { proposerId: "t", original: text, proposed }, {
      declarations: [{ span: passive.span, agent: "a comissão" }],
    });

    expect(proofPassed(v, "declared_agent_present")).toBe(false);
    expect(signalFlagged(v, "possible_invented_agent")).toBe(true);
  });

  it("deterministic: same declaration → same JSON", async () => {
    const passive = passiveOf(TEXT);
    const proposed = "A comissão comunicou a decisão ao interessado no processo administrativo em curso.";
    const opts: VerifyOptions = { declarations: [{ span: passive.span, agent: "a comissão" }] };
    const a = JSON.stringify(await verifyRewrite(TEXT, wholeTarget(TEXT), { proposerId: "t", original: TEXT, proposed }, opts));
    const b = JSON.stringify(await verifyRewrite(TEXT, wholeTarget(TEXT), { proposerId: "t", original: TEXT, proposed }, opts));
    expect(b).toBe(a);
  });
});

describe("verifyRewrite — PROOF: mechanical preservation", () => {
  it("lost numbers fail numbers_preserved", async () => {
    const text = "O pagamento de R$ 1.500,00 deve ocorrer em 30 dias após o deferimento do pedido formal.";
    const finding = spanFinding(text, "O pagamento de R$ 1.500,00 deve ocorrer em 30 dias");
    const p = proposal(finding, "O pagamento de R$ 1.500,00 deve ocorrer em alguns dias");

    const v = await verify(text, finding, p);
    expect(proofPassed(v, "numbers_preserved")).toBe(false);
    expect(v.hasBlockingFailure).toBe(true);
  });

  it("preserved numbers pass numbers_preserved", async () => {
    const text = "O pagamento de R$ 1.500,00 deve ocorrer em 30 dias após o deferimento do pedido formal.";
    const finding = spanFinding(text, "O pagamento de R$ 1.500,00 deve ocorrer em 30 dias");
    const p = proposal(finding, "Pague R$ 1.500,00 em 30 dias");

    const v = await verify(text, finding, p);
    expect(proofPassed(v, "numbers_preserved")).toBe(true);
  });

  it("altered dates fail dates_preserved", async () => {
    const text = "A audiência foi marcada para 17/11/2025 no fórum central da comarca da capital do estado.";
    const finding = spanFinding(text, "A audiência foi marcada para 17/11/2025 no fórum central");
    const p = proposal(finding, "A audiência foi marcada para 18/11/2025 no fórum central");

    const v = await verify(text, finding, p);
    expect(proofPassed(v, "dates_preserved")).toBe(false);
  });

  it("newly introduced jargon fails no_new_jargon", async () => {
    const text = "As regras foram aplicadas ao caso concreto sem qualquer margem para dúvida entre as partes.";
    const finding = spanFinding(text, "As regras foram aplicadas ao caso concreto");
    const p = proposal(finding, "As regras supracitadas foram aplicadas ao caso concreto");

    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_new_jargon")).toBe(false);
    expect(v.proofs.find((pr) => pr.check === "no_new_jargon")!.detail).toContain("supracitadas");
  });
});

describe("verifyRewrite — PROOF: fabricated 1st person (ADR-019)", () => {
  it("impersonal text rewritten with an invented 'nós' fails (mechanical veto)", async () => {
    const text = "Foi realizada a análise do documento pela comissão competente antes da decisão final do processo.";
    const finding = spanFinding(text, "Foi realizada a análise do documento pela comissão competente");
    const p = proposal(finding, "Nós analisamos o documento com a nossa comissão competente");
    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_invented_first_person")).toBe(false);
    expect(v.proofs.find((pr) => pr.check === "no_invented_first_person")!.detail).toMatch(/nós|nossa/i);
    expect(v.hasBlockingFailure).toBe(true);
  });

  it("a proposal with no 1st person passes", async () => {
    const text = "Foi realizada a análise do documento pela comissão competente antes da decisão final do processo.";
    const finding = spanFinding(text, "Foi realizada a análise do documento pela comissão competente");
    const p = proposal(finding, "A comissão competente analisou o documento");
    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_invented_first_person")).toBe(true);
  });

  it("a 1st person that ALREADY exists in the document is not considered fabricated", async () => {
    const text = "Nós recebemos o seu pedido. Foi realizada a análise do documento pela comissão antes da decisão.";
    const finding = spanFinding(text, "Foi realizada a análise do documento pela comissão");
    const p = proposal(finding, "Nós analisamos o documento na comissão");
    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_invented_first_person")).toBe(true);
  });

  it("vetoes a pro-drop 'nós' hidden in the verb (without writing the pronoun)", async () => {
    const text = "Foi verificado se a documentação está em ordem. Os documentos serão examinados na decisão final.";
    const finding = spanFinding(text, "Foi verificado se a documentação está em ordem");
    const p = proposal(finding, "Verificamos a documentação. Vamos analisar mais e decidir depois.");
    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_invented_first_person")).toBe(false);
    expect(v.proofs.find((pr) => pr.check === "no_invented_first_person")!.detail).toMatch(/verificamos|vamos/i);
    expect(v.hasBlockingFailure).toBe(true);
  });

  it("an impersonal reformulation (inventing no agent) still passes", async () => {
    const text = "Foi verificado se a documentação está em ordem. Os documentos serão examinados na decisão final.";
    const finding = spanFinding(text, "Foi verificado se a documentação está em ordem");
    const p = proposal(finding, "A documentação está em ordem");
    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_invented_first_person")).toBe(true);
  });
});

describe("verifyRewrite — SIGNAL: entities (heuristic, not a proof)", () => {
  it("a proper noun missing from the proposal raises a flag", async () => {
    const text = "O parecer foi assinado pela Comissão de Ética do órgão responsável pela decisão final.";
    const finding = spanFinding(text, "O parecer foi assinado pela Comissão de Ética");
    const p = proposal(finding, "O parecer foi assinado pela comissão");

    const v = await verify(text, finding, p);
    expect(signalFlagged(v, "entities_preserved")).toBe(true);
    expect(v.proofs.map((pr) => pr.check as string)).not.toContain("entities_preserved");
  });

  it("preserved names raise no flag", async () => {
    const text = "O parecer foi assinado pela Comissão de Ética do órgão responsável pela decisão final.";
    const finding = spanFinding(text, "O parecer foi assinado pela Comissão de Ética");
    const p = proposal(finding, "A Comissão de Ética assinou o parecer");

    const v = await verify(text, finding, p);
    expect(signalFlagged(v, "entities_preserved")).toBe(false);
  });

  it("a proper noun with an accented initial missing from the proposal raises a flag (M7 — \\b is ASCII-only)", async () => {
    const text = "O acordo envolveu autoridades da Índia e do Brasil antes da assinatura final do tratado.";
    const finding = spanFinding(text, "O acordo envolveu autoridades da Índia e do Brasil");
    const p = proposal(finding, "O acordo envolveu autoridades do Brasil");

    const v = await verify(text, finding, p);
    expect(signalFlagged(v, "entities_preserved")).toBe(true);
    const detail = v.signals.find((s) => s.check === "entities_preserved")!.detail;
    expect(detail).toContain("Índia");
  });
});

describe("verifyRewrite — SIGNAL: possibly fabricated 3rd-person agent (LUCID-011)", () => {
  it("a new institutional agent, absent from the original, raises a flag", async () => {
    const text = "Foi decidido que o prazo seria prorrogado depois de muita discussão entre os envolvidos.";
    const finding = spanFinding(text, "Foi decidido que o prazo seria prorrogado");
    const p = proposal(finding, "A comissão decidiu prorrogar o prazo");

    const v = await verify(text, finding, p);
    expect(signalFlagged(v, "possible_invented_agent")).toBe(true);
    const detail = v.signals.find((s) => s.check === "possible_invented_agent")!.detail;
    expect(detail).toContain("comissão");
    expect(v.proofs.map((pr) => pr.check as string)).not.toContain("possible_invented_agent");
    expect(v.hasBlockingFailure).toBe(false);
  });

  it("a new human agent (a role), absent from the original, raises a flag", async () => {
    const text = "Foi realizada a análise do pedido antes de qualquer outra providência no processo.";
    const finding = spanFinding(text, "Foi realizada a análise do pedido");
    const p = proposal(finding, "O diretor realizou a análise do pedido");

    const v = await verify(text, finding, p);
    expect(signalFlagged(v, "possible_invented_agent")).toBe(true);
    const detail = v.signals.find((s) => s.check === "possible_invented_agent")!.detail;
    expect(detail).toContain("diretor");
  });

  it("an agent already present in the original (as the subject) raises no flag", async () => {
    const text = "A comissão recebeu o processo, que foi analisado no mesmo dia pelos membros presentes.";
    const finding = spanFinding(text, "que foi analisado no mesmo dia pelos membros presentes");
    const p = proposal(finding, "que a comissão analisou no mesmo dia");

    const v = await verify(text, finding, p);
    expect(signalFlagged(v, "possible_invented_agent")).toBe(false);
  });

  it("an entity present in the original in a non-subject role, promoted to subject in the proposal, raises no flag", async () => {
    const text = "O processo foi encaminhado para a comissão competente analisar antes da decisão final.";
    const finding = spanFinding(text, "O processo foi encaminhado para a comissão competente analisar");
    const p = proposal(finding, "A comissão competente analisou o processo");

    const v = await verify(text, finding, p);
    expect(signalFlagged(v, "possible_invented_agent")).toBe(false);
  });

  it("a sentence with no new agent (impersonal reformulation) raises no flag", async () => {
    const text = "Foi verificado se a documentação está em ordem antes do encaminhamento do processo.";
    const finding = spanFinding(text, "Foi verificado se a documentação está em ordem");
    const p = proposal(finding, "A documentação está em ordem");

    const v = await verify(text, finding, p);
    expect(signalFlagged(v, "possible_invented_agent")).toBe(false);
  });

  it("an agent with an accented initial ('órgão') already present in the original raises no flag (M7 — \\b is ASCII-only)", async () => {
    const text = "O processo foi analisado pelo órgão competente antes da decisão final.";
    const finding = spanFinding(text, "O processo foi analisado pelo órgão competente");
    const p = proposal(finding, "O órgão competente analisou o processo");

    const v = await verify(text, finding, p);
    expect(signalFlagged(v, "possible_invented_agent")).toBe(false);
  });

  it("a fabricated 1st person is still vetoed by no_invented_first_person, with no interference from the new signal", async () => {
    const text = "Foi realizada a análise do documento pela comissão competente antes da decisão final do processo.";
    const finding = spanFinding(text, "Foi realizada a análise do documento pela comissão competente");
    const p = proposal(finding, "Nós analisamos o documento com a nossa comissão competente");

    const v = await verify(text, finding, p);
    expect(proofPassed(v, "no_invented_first_person")).toBe(false);
    expect(v.hasBlockingFailure).toBe(true);
    expect(signalFlagged(v, "possible_invented_agent")).toBe(false);
  });

  it("ambiguous case — an agent mentioned only as the oblique object of a non-article preposition — raises no flag", async () => {
    const text = "O relatório final foi lido com atenção antes de ser arquivado no fim do expediente.";
    const finding = spanFinding(text, "O relatório final foi lido com atenção");
    const p = proposal(finding, "O relatório fala sobre a equipe responsável pelo arquivamento");

    const v = await verify(text, finding, p);
    expect(signalFlagged(v, "possible_invented_agent")).toBe(false);
  });
});

describe("verifyRewrite — SIGNAL: the probe as a NEGATIVE test", () => {
  const readable: ProbeResult = {
    podeResponder: true,
    respostaExtraida: "o fato",
    ondeTravou: [],
    operacoesDeLeitura: [],
    precisouInferir: false,
  };
  const stuck: ProbeResult = {
    podeResponder: false,
    respostaExtraida: "o texto não diz",
    ondeTravou: [{ frase: "trecho", motivo: "ambíguo" }],
    operacoesDeLeitura: ["integrar_entre_frases"],
    precisouInferir: false,
  };

  it("a readable original + a proposal that gets stuck → a meaning-loss flag", async () => {
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");
    const probe = new StubComprehensionProbe({ [p.original]: readable, [p.proposed]: stuck });

    const v = await verify(text, finding, p, { probe, question: "quando o prazo começa?" });
    expect(signalFlagged(v, "meaning_preserved")).toBe(true);
  });

  it("a proposal that gets stuck where the original also got stuck → NO loss conclusion (no flag)", async () => {
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");
    const probe = new StubComprehensionProbe({ [p.original]: stuck, [p.proposed]: stuck });

    const v = await verify(text, finding, p, { probe, question: "quando o prazo começa?" });
    expect(signalFlagged(v, "meaning_preserved")).toBe(false);
  });

  it("with no probe, the meaning signal is omitted (not invented)", async () => {
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");

    const v = await verify(text, finding, p);
    expect(v.signals.some((s) => s.check === "meaning_preserved")).toBe(false);
  });
});

describe("verifyRewrite — LUCID-013: the optional probe degrades gracefully", () => {
  const readable: ProbeResult = {
    podeResponder: true,
    respostaExtraida: "o fato",
    ondeTravou: [],
    operacoesDeLeitura: [],
    precisouInferir: false,
  };

  class FailingProbe implements ComprehensionProbe {
    readonly id = "failing-probe@1";
    constructor(private readonly failOn: string) {}
    async probe(input: ProbeInput): Promise<ProbeResult> {
      if (input.trecho === this.failOn) throw new Error("probe unavailable (simulated timeout)");
      return readable;
    }
  }

  it("with a working probe: meaning_preserved is emitted normally (behavior unchanged)", async () => {
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");
    const probe = new StubComprehensionProbe({ [p.original]: readable, [p.proposed]: readable });

    const v = await verify(text, finding, p, { probe, question: "quando o prazo começa?" });
    expect(v.signals.some((s) => s.check === "meaning_preserved")).toBe(true);
  });

  it("forwards verifyRewrite's AbortSignal to BOTH probe calls (M6: cancellation has to propagate)", async () => {
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");

    const receivedSignals: (AbortSignal | undefined)[] = [];
    class SignalSpyProbe implements ComprehensionProbe {
      readonly id = "signal-spy@1";
      async probe(_input: ProbeInput, options?: { signal?: AbortSignal }): Promise<ProbeResult> {
        receivedSignals.push(options?.signal);
        return { podeResponder: true, respostaExtraida: "x", ondeTravou: [], operacoesDeLeitura: [], precisouInferir: false };
      }
    }

    const controller = new AbortController();
    await verify(text, finding, p, { probe: new SignalSpyProbe(), question: "quando o prazo começa?", signal: controller.signal });

    expect(receivedSignals).toHaveLength(2);
    expect(receivedSignals[0]).toBe(controller.signal);
    expect(receivedSignals[1]).toBe(controller.signal);
  });

  it("the probe fails on the ORIGINAL: verifyRewrite resolves, proofs and metrics stay present, no meaning_preserved, no exception", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");
    const probe = new FailingProbe(p.original);

    const v = await verify(text, finding, p, { probe, question: "quando o prazo começa?" });

    expect(v.proofs.length).toBeGreaterThan(0);
    expect(v.metrics).toBeDefined();
    expect(v.signals.some((s) => s.check === "meaning_preserved")).toBe(false);
    expect(v.hasBlockingFailure).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("sonda");
    warnSpy.mockRestore();
  });

  it("the probe fails on the PROPOSAL: the same graceful degradation", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");
    const probe = new FailingProbe(p.proposed);

    const v = await verify(text, finding, p, { probe, question: "quando o prazo começa?" });

    expect(v.proofs.length).toBeGreaterThan(0);
    expect(v.metrics).toBeDefined();
    expect(v.signals.some((s) => s.check === "meaning_preserved")).toBe(false);
    expect(v.hasBlockingFailure).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it("with no probe: behavior stays unchanged (no warning, no signal)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = "O prazo começa a contar da data da publicação do ato no diário oficial do estado.";
    const finding = spanFinding(text, "O prazo começa a contar da data da publicação");
    const p = proposal(finding, "O prazo começa depois");

    const v = await verify(text, finding, p);

    expect(v.signals.some((s) => s.check === "meaning_preserved")).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("a real deterministic failure (outside the probe) still propagates — the catch does not swallow unrelated errors", async () => {
    const text = "O documento foi arquivado pelo setor competente.";
    const finding = spanFinding(text, "O documento foi arquivado pelo setor competente", "passive_voice");
    const p: RewriteProposal = { ...proposal(finding, "O setor arquivou o documento."), localeId: "en-US" };

    await expect(verify(text, finding, p)).rejects.toThrow(/locale/);
  });
});

describe("honesty (I5): no green seal", () => {
  it("the verification has no 'aprovado'/'ok' field; everything passing is the absence of failure, not an approval", async () => {
    const text = "As contas do setor foram conferidas com atenção pela equipe antes do fechamento mensal regular.";
    const finding = spanFinding(text, "As contas do setor foram conferidas");
    const p = proposal(finding, "A equipe conferiu as contas do setor");

    const v = await verify(text, finding, p);
    const keys = Object.keys(v);
    expect(keys).not.toContain("approved");
    expect(keys).not.toContain("ok");
    expect(keys).not.toContain("passed");
    expect(keys.sort()).toEqual(["hasBlockingFailure", "metrics", "proofs", "signals"]);
  });

  it("determinism: same input → same JSON", async () => {
    const text = "O documento foi arquivado pelo setor competente após a conclusão do trâmite administrativo.";
    const finding = spanFinding(text, "O documento foi arquivado pelo setor competente");
    const p = proposal(finding, "O setor arquivou o documento");

    const a = JSON.stringify(await verify(text, finding, p));
    const b = JSON.stringify(await verify(text, finding, p));
    expect(b).toBe(a);
  });
});

describe("proposeAndVerify — orchestrator with a stub proposer", () => {
  it("proposes (via fixture) and verifies in one step; it never applies on its own", async () => {
    const text =
      "O documento apresentado foi analisado com muito cuidado pela comissão competente responsável, " +
      "e o resultado final desse exame minucioso foi comunicado ao interessado dentro do prazo regular.";
    const finding = analyze(text).findings.find((f) => f.criterion === "long_sentence")!;
    const proposer = new StubRewriteProposer({
      [finding.span.text]:
        "O documento foi analisado pela comissão. O resultado foi comunicado ao interessado no prazo.",
    });

    const result = await propose(text, finding, proposer);

    expect(result.proposal.proposerId).toBe("stub@1+fixtures@1");
    expect(result.verification.hasBlockingFailure).toBe(false);
    expect(analyze(text).text).toBe(text);
  });

  it("an excerpt outside the fixture: proposal = original → the verifier shows the target unresolved", async () => {
    const text = "O relatório foi entregue pelos servidores designados para a tarefa específica do mês.";
    const finding = analyze(text).findings.find((f) => f.criterion === "passive_voice" && f.meta?.hasAgent)!;
    const proposer = new StubRewriteProposer({});

    const result = await propose(text, finding, proposer);
    expect(result.proposal.proposed).toBe(finding.span.text);
    expect(proofPassed(result.verification, "target_resolved")).toBe(false);
  });
});

describe("applyProposal — pure replacement of the excerpt", () => {
  it("replaces only the finding's span, preserving the rest of the text", () => {
    const text = "Início. O documento foi arquivado pelo setor. Fim.";
    const finding = spanFinding(text, "O documento foi arquivado pelo setor", "passive_voice");
    expect(applyProposal(text, finding.span, proposal(finding, "O setor arquivou o documento"))).toBe(
      "Início. O setor arquivou o documento. Fim.",
    );
  });
});

describe("verifyRewrite — locale identity (anti-mixing, ADR-031)", () => {
  const text = "O documento foi arquivado pelo setor competente.";
  const finding = spanFinding(text, "O documento foi arquivado pelo setor competente", "passive_voice");

  it("refuses to verify a proposal from another locale under the default locale (pt-BR)", async () => {
    const p: RewriteProposal = { ...proposal(finding, "O setor arquivou o documento."), localeId: "en-US" };
    await expect(verify(text, finding, p)).rejects.toThrow(/locale/);
  });

  it("accepts a proposal with no localeId (compat) and one carrying the locale's localeId", async () => {
    const withoutLocale: RewriteProposal = proposal(finding, "O setor arquivou o documento.");
    await expect(verify(text, finding, withoutLocale)).resolves.toBeDefined();

    const ptBR: RewriteProposal = { ...withoutLocale, localeId: "pt-BR" };
    await expect(verify(text, finding, ptBR)).resolves.toBeDefined();
  });
});
