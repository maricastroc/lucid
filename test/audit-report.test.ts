import { describe, expect, it } from "vitest";
import { analyze, DEFAULT_CONFIG } from "../src/lucid";
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
    expect(buildAuditReport(d, d.findings, META)).not.toContain("## Alterações registradas");
    const withTrail = buildAuditReport(d, d.findings, META, [
      {
        source: "manual",
        label: "Edição do autor · Jargão",
        before: "em sede de",
        after: "durante",
        burdenBefore: 6,
        burdenAfter: 5,
      },
    ]);
    expect(withTrail).toContain("## Alterações registradas");
    expect(withTrail).toContain("Edição do autor · Jargão");
  });
});

describe("buildAuditReport — the entry text, so the reported delta can be checked", () => {
  const d = analyze(SAMPLE);
  const CHANGE = [
    {
      source: "manual" as const,
      label: "Edição do autor · Jargão",
      before: "em sede de",
      after: "durante",
      burdenBefore: 6,
      burdenAfter: 5,
    },
  ];
  const report = (originalText: string | null, ledger = CHANGE) =>
    buildAuditReport(d, d.findings, META, ledger, null, null, originalText);

  it("carries the whole entry text, not a summary of it", () => {
    const md = report("Foi realizada a análise do documento pela comissão competente.");
    expect(md).toContain("## Anexo — Texto de entrada");
    expect(md).toContain("Foi realizada a análise do documento pela comissão competente.");
  });

  it("says the delta cannot be checked when the entry text was never recorded", () => {
    const md = report(null);
    expect(md).toContain("## Anexo — Texto de entrada");
    expect(md).toContain("**Não registrado.**");
    expect(md).toContain("não pode ser conferido");
  });

  it("says the document was written here when there was no entry text", () => {
    expect(report("")).toContain("O documento foi escrito dentro do Lucid");
  });

  it("stays silent when there is neither an entry text nor a change to explain", () => {
    expect(report(null, [])).not.toContain("Anexo — Texto de entrada");
    expect(report("", [])).not.toContain("Anexo — Texto de entrada");
  });

  it("shows the entry text even with no changes registered, since free editing leaves no trail", () => {
    expect(report("O texto de partida.", [])).toContain("O texto de partida.");
  });

  it("refuses to let backticks in the document break out of the block", () => {
    const md = report("Use a marca ``dupla`` e a ```tripla``` no texto.");
    expect(md).toContain("````\nUse a marca ``dupla`` e a ```tripla``` no texto.\n````");
  });

  it("says nothing about restoring, because the report is a record and not a path back", () => {
    const md = report("O texto de partida.");
    expect(md).toContain("não restaura nem aplica nada");
  });

  it("deterministic: the same entry text produces byte-identical markdown", () => {
    expect(report("O texto de partida.")).toBe(report("O texto de partida."));
  });
});

describe("buildAuditReport — the entry text does not overclaim", () => {
  const d = analyze(SAMPLE);

  it("does not point at a weight that is not there when nothing was registered", () => {
    const md = buildAuditReport(d, d.findings, META, [], null, null, "O texto de partida.");
    expect(md).not.toContain("variação de peso informada acima");
    expect(md).toContain("edição feita à mão não gera registro");
  });
});

describe("buildAuditReport — the stamp that makes the audit re-runnable", () => {
  const d = analyze(SAMPLE);
  const md = () => buildAuditReport(d, d.findings, META);

  it("carries the engine, the profile and the curated data the numbers came from", () => {
    expect(md()).toContain(
      `Motor Lucid ${d.meta.lucidVersion} · perfil \`${d.meta.configHash}\` · ` +
        `dados \`${d.meta.dataHash}\` · ${d.meta.localeId}`,
    );
  });

  it("stamps a default profile too, not only one that departs from it", () => {
    expect(md()).not.toContain("## Perfil editorial");
    expect(md()).toContain(d.meta.configHash);
  });

  it("says what the stamp is for, where the stamp is", () => {
    expect(md()).toContain("Dois relatórios só são comparáveis se o motor, o perfil e os dados carimbados acima");
  });

  it("takes the standard's version from the engine instead of repeating it by hand", () => {
    expect(md()).toContain(`Análise determinística · ${d.meta.standardVersion} · Lucid`);
  });

  it("no longer points at a hash that is not in the document", () => {
    const withProfile = buildAuditReport(d, d.findings, META, [], null, {
      ...DEFAULT_CONFIG,
      sentenceLength: { warnAbove: 25, errorAbove: 40 },
    });
    expect(withProfile).toContain("## Perfil editorial");
    expect(withProfile).not.toContain("`configHash` acima");
    expect(withProfile).toContain("O perfil carimbado no cabeçalho");
  });
});
