import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { buildAuditReport } from "../src/app/lib/audit-report";

const SAMPLE =
  "Foi realizada a análise do documento pela comissão competente em sede de procedimento " +
  "administrativo destinado à verificação das condições supracitadas exigidas para a concessão do " +
  "benefício, e a decisão foi comunicada ao interessado no processo.";
const META = { generatedAt: "2026-07-22 14:00" };

describe("buildAuditReport — a auditoria como entregável", () => {
  it("estrutura: caveat, placar, tabela por critério, anotações numeradas e citação ABNT", () => {
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

  it("rotula cada anotação pela fronteira do Lucid (troca direta × decisão humana) — e nunca oferece aplicação", () => {
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

  it("categoria intermediária (resolvível sem troca 1:1) recebe rótulo próprio, não fica em branco (F8)", () => {
    const text = "O documento foi analisado pela comissão.";
    const d = analyze(text);
    const passive = d.findings.find((f) => f.criterion === "passive_voice");
    expect(passive?.requiresHuman).toBe(false);
    expect(passive?.suggestion).toBeUndefined();

    const md = buildAuditReport(d, d.findings, META);
    expect(md).toContain("Sem troca 1:1 pronta, mas resolvível");
    expect(md).not.toContain("_Exige decisão humana");
  });

  it("determinístico: mesma entrada → relatório byte-idêntico", () => {
    const a = analyze(SAMPLE);
    const b = analyze(SAMPLE);
    expect(buildAuditReport(a, a.findings, META)).toBe(buildAuditReport(b, b.findings, META));
  });

  it("sinaliza honestamente a cobertura léxica curada — silêncio não é prova de ausência (F9)", () => {
    const d = analyze(SAMPLE);
    const md = buildAuditReport(d, d.findings, META);
    expect(buildAuditReport(d, [], META)).toContain("listas curadas");
    expect(md).toContain("| Critério | Dimensão | Proveniência | Cobertura | Anotações |");
    const jargonRow = md.split("\n").find((l) => l.startsWith("| Jargão "));
    expect(jargonRow).toContain("curada");
  });

  it("zero anotações NÃO vira atestado: o caveat continua, sem seções de anotações", () => {
    const d = analyze(SAMPLE);
    const md = buildAuditReport(d, [], META);
    expect(md).toContain("**0** anotações");
    expect(md).toContain("A ausência de anotações não é atestado de clareza");
    expect(md).not.toContain("## Anotações por critério");
    expect(md).not.toContain("Ordenadas por severidade");
  });

  it("inclui a trilha de proveniência quando há alterações; omite quando não há (Etapa 6)", () => {
    const d = analyze(SAMPLE);
    expect(buildAuditReport(d, d.findings, META)).not.toContain("## Trilha de revisão");
    const withTrail = buildAuditReport(d, d.findings, META, [
      { source: "manual", label: "Edição do autor · Jargão", before: "em sede de", after: "durante", burdenBefore: 6, burdenAfter: 5 },
    ]);
    expect(withTrail).toContain("## Trilha de revisão");
    expect(withTrail).toContain("Edição do autor · Jargão");
  });
});
