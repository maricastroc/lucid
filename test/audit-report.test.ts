import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { buildAuditReport } from "../src/app/lib/audit-report";

const SAMPLE =
  "Foi realizada a análise do documento pela comissão competente em sede de procedimento " +
  "administrativo destinado à verificação das condições supracitadas exigidas para a concessão do " +
  "benefício, e a decisão foi comunicada ao interessado no processo.";
const META = { generatedAt: "2026-07-22 14:00" };

describe("buildAuditReport — the audit as a deliverable", () => {
  it("structure: caveat, scorecard, per-criterion table, numbered annotations and the ABNT citation", () => {
    const d = analyze(SAMPLE);
    const md = buildAuditReport(d, d.findings, META);

    expect(md.startsWith("# Auditoria de Linguagem Simples")).toBe(true);
    expect(md).toContain("Este relatório mede, não aprova");
    expect(md).toContain("## Placar");
    expect(md).toContain("## Anotações por critério");
    expect(md).toContain("| Critério | Dimensão | Proveniência | Cobertura | Anotações |");
    expect(md).toContain("## Anotações");
    expect(md).toMatch(/ABNT NBR ISO 24495-1 · 5\.\d/);
    expect(md).toContain("### 1.");
    expect(md).toContain("supracitadas");
    expect(md).toContain("Gerado em 2026-07-22 14:00");
  });

  it("labels each annotation by Lucid's boundary (direct swap × human decision) — and never offers to apply it", () => {
    const d = analyze(SAMPLE);
    const md = buildAuditReport(d, d.findings, META);
    const anySafe = d.findings.some((f) => f.suggestion !== undefined && !f.requiresHuman);
    const anyHuman = d.findings.some((f) => f.requiresHuman);
    if (anySafe) expect(md).toContain("**Equivalente direto (curado):**");
    if (anyHuman) expect(md).toContain("_Exige decisão humana");
    expect(anySafe || anyHuman).toBe(true);
    expect(md).not.toContain("Sugestão segura");
    expect(md).not.toContain("seguras para aplicar");
  });

  it("the middle category (solvable without a 1:1 swap) gets its own label instead of staying blank (F8)", () => {
    const text = "O documento foi analisado pela comissão.";
    const d = analyze(text);
    const passive = d.findings.find((f) => f.criterion === "passive_voice");
    expect(passive?.requiresHuman).toBe(false);
    expect(passive?.suggestion).toBeUndefined();

    const md = buildAuditReport(d, d.findings, META);
    expect(md).toContain("Sem troca 1:1 pronta, mas resolvível");
    expect(md).not.toContain("_Exige decisão humana");
  });

  it("deterministic: same input → byte-identical report", () => {
    const a = analyze(SAMPLE);
    const b = analyze(SAMPLE);
    expect(buildAuditReport(a, a.findings, META)).toBe(buildAuditReport(b, b.findings, META));
  });

  it("flags curated lexical coverage honestly — silence is no proof of absence (F9)", () => {
    const d = analyze(SAMPLE);
    const md = buildAuditReport(d, d.findings, META);
    expect(buildAuditReport(d, [], META)).toContain("listas curadas");
    expect(md).toContain("| Critério | Dimensão | Proveniência | Cobertura | Anotações |");
    const jargonRow = md.split("\n").find((l) => l.startsWith("| Jargão "));
    expect(jargonRow).toContain("curada");
  });

  it("zero annotations do NOT become a certificate: the caveat stays, with no annotation sections", () => {
    const d = analyze(SAMPLE);
    const md = buildAuditReport(d, [], META);
    expect(md).toContain("**0** anotações");
    expect(md).toContain("A ausência de anotações não é atestado de clareza");
    expect(md).not.toContain("## Anotações por critério");
    expect(md).not.toContain("Ordenadas por severidade");
  });

  it("readability comes out as a raw value + position on the scale, and the report states it does not truncate", () => {
    const d = analyze(SAMPLE);
    const md = buildAuditReport(d, d.findings, META);
    const line = md.split("\n").find((l) => l.startsWith("- **Legibilidade") || l.includes("Legibilidade (Flesch-PT)"));
    expect(line).toMatch(/Legibilidade \(Flesch-PT\): -?\d+(\.\d+)? — (faixa|abaixo|acima)/);
    expect(md).toContain("O valor não é truncado");
  });

  it("degenerate input in the report: raw value preserved + the CAUSE named (never a mute 'out of domain')", () => {
    const d = analyze(`${"aeiou".repeat(100)}.`);
    const md = buildAuditReport(d, d.findings, META);
    expect(md).toContain("-8296.8");
    expect(md).toContain("sílabas por palavra, acima do máximo plausível de 20");
    expect(md).not.toContain("fora do domínio");
  });

  it("no measurement in the report: an em dash and the explicit reason instead of a 0", () => {
    const d = analyze("!!! ??? ...");
    const md = buildAuditReport(d, d.findings, META);
    expect(md).toContain("Legibilidade (Flesch-PT): sem medida");
    expect(md).toContain("Não há palavras para medir");
    expect(md).not.toMatch(/Legibilidade \(Flesch-PT\): 0/);
  });

  it("includes the provenance trail when there are changes; omits it when there are none (Step 6)", () => {
    const d = analyze(SAMPLE);
    expect(buildAuditReport(d, d.findings, META)).not.toContain("## Trilha de revisão");
    const withTrail = buildAuditReport(d, d.findings, META, [
      { source: "manual", label: "Edição do autor · Jargão", before: "em sede de", after: "durante", burdenBefore: 6, burdenAfter: 5 },
    ]);
    expect(withTrail).toContain("## Trilha de revisão");
    expect(withTrail).toContain("Edição do autor · Jargão");
  });
});
