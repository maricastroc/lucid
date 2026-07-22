/**
 * Relatório de auditoria exportável (ADR-000 · Etapa 5) — a auditoria como entregável de 1ª classe.
 * O construtor é PURO: função do `Diagnostic` + metadados de fora (data), então é determinístico e
 * testável em snapshot. Aqui travamos: estrutura, caveat de honestidade sempre presente (inclusive
 * com zero anotações), citação ABNT, rótulo por fronteira (segura × decisão humana) e byte-identidade.
 */
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
    expect(md).toContain("| Critério | Diretriz (ABNT) | Anotações |");
    expect(md).toContain("## Anotações");
    expect(md).toMatch(/ABNT 5\.\d/);
    expect(md).toContain("### 1.");
    expect(md).toContain("supracitadas");
    expect(md).toContain("Gerado em 2026-07-22 14:00");
  });

  it("rotula cada anotação pela fronteira do Lucid (segura × decisão humana)", () => {
    const d = analyze(SAMPLE);
    const md = buildAuditReport(d, d.findings, META);
    const anySafe = d.findings.some((f) => f.suggestion !== undefined && !f.requiresHuman);
    const anyHuman = d.findings.some((f) => f.requiresHuman);
    if (anySafe) expect(md).toContain("**Sugestão segura:**");
    if (anyHuman) expect(md).toContain("_Exige decisão humana");
    expect(anySafe || anyHuman).toBe(true);
  });

  it("determinístico: mesma entrada → relatório byte-idêntico", () => {
    const a = analyze(SAMPLE);
    const b = analyze(SAMPLE);
    expect(buildAuditReport(a, a.findings, META)).toBe(buildAuditReport(b, b.findings, META));
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
      { source: "safe", label: "Correção segura · Jargão", before: "em sede de", after: "durante", burdenBefore: 6, burdenAfter: 5 },
    ]);
    expect(withTrail).toContain("## Trilha de revisão");
    expect(withTrail).toContain("Correção segura · Jargão");
  });
});
