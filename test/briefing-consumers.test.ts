import { describe, expect, it } from "vitest";
import { analyze, checkBriefing, EMPTY_BRIEFING, type ReaderBriefing } from "../src/lucid";
import { buildRewritePrompt } from "../src/report/rewrite";
import { buildAuditReport } from "../src/app/lib/audit-report";

const TEXT = "O pedido foi indeferido por falta de documentos. O prazo para recorrer é de dez dias.";

const DECLARED: ReaderBriefing = {
  audience: "aposentado que nunca leu um edital",
  purpose: "descobrir se pode recorrer e reunir os papeis",
  priorKnowledge: "sabe que existe um prazo, nao conhece o vocabulario",
  mustFind: ["prazo para recorrer"],
};

describe("reader briefing — which field feeds what (the Ajustes tab's claims)", () => {
  it("only mustFind is verified: the three prose answers produce no coverage of their own", () => {
    const prose: ReaderBriefing = { ...DECLARED, mustFind: [] };
    const check = checkBriefing(TEXT, prose);
    expect(check.declared).toBe(true);
    expect(check.coverage).toEqual([]);
    expect(check.missing).toEqual([]);
  });

  it("the prose answers are recorded as answered/not — a declaration flag, never a measurement", () => {
    expect(checkBriefing(TEXT, DECLARED).answered).toEqual({
      audience: true,
      purpose: true,
      priorKnowledge: true,
    });
  });

  it("editing the prose answers never moves the verification — only mustFind can", () => {
    const before = checkBriefing(TEXT, DECLARED);
    const after = checkBriefing(TEXT, {
      ...DECLARED,
      audience: "outra pessoa completamente diferente",
      purpose: "outro proposito",
      priorKnowledge: "outro repertorio",
    });
    expect(after.coverage).toEqual(before.coverage);
    expect(after.missing).toEqual(before.missing);
  });

  it("mustFind is checked literally and says where it is, without judging the subject", () => {
    const check = checkBriefing(TEXT, DECLARED);
    expect(check.coverage).toHaveLength(1);
    expect(check.coverage[0].occurrences.length).toBeGreaterThan(0);
    expect(checkBriefing(TEXT, { ...DECLARED, mustFind: ["valor da multa"] }).missing).toEqual(["valor da multa"]);
  });

  it("no field changes the number of findings — the briefing is not an input to the engine", () => {
    const withoutBriefing = analyze(TEXT).findings.length;
    expect(checkBriefing(TEXT, DECLARED).declared).toBe(true);
    expect(analyze(TEXT).findings.length).toBe(withoutBriefing);
  });

  it("every field reaches the exported report — that is the consumer the panel promises", () => {
    const diagnostic = analyze(TEXT);
    const report = buildAuditReport(diagnostic, diagnostic.findings, { generatedAt: "2026-08-28" }, [], {
      briefing: DECLARED,
      check: checkBriefing(TEXT, DECLARED),
    });
    expect(report).toContain(DECLARED.audience);
    expect(report).toContain(DECLARED.purpose);
    expect(report).toContain(DECLARED.priorKnowledge);
    expect(report).toContain("prazo para recorrer");
  });

  it("an undeclared briefing reads as 'not declared', never as compliant", () => {
    const check = checkBriefing(TEXT, EMPTY_BRIEFING);
    expect(check.declared).toBe(false);
    const diagnostic = analyze(TEXT);
    const report = buildAuditReport(diagnostic, diagnostic.findings, { generatedAt: "2026-08-28" }, [], {
      briefing: EMPTY_BRIEFING,
      check,
    });
    expect(report).toContain("Não declarado");
  });

  it("NO field reaches the AI rewrite prompt — the panel must not claim it guides the rewrite", () => {
    const diagnostic = analyze(TEXT);
    const target = diagnostic.findings[0].span;
    const prompt = buildRewritePrompt(TEXT, target, { findings: diagnostic.findings });
    expect(prompt).not.toContain(DECLARED.audience);
    expect(prompt).not.toContain(DECLARED.purpose);
    expect(prompt).not.toContain(DECLARED.priorKnowledge);

    const declaredCheck = checkBriefing(TEXT, DECLARED);
    const undeclaredCheck = checkBriefing(TEXT, EMPTY_BRIEFING);
    expect(declaredCheck.declared).not.toBe(undeclaredCheck.declared);
    expect(buildRewritePrompt(TEXT, target, { findings: diagnostic.findings })).toBe(prompt);
  });
});
