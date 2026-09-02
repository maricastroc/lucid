import { describe, expect, it } from "vitest";
import { analyze, DEFAULT_CONFIG } from "../src/lucid";
import { buildAuditReport } from "../src/app/lib/audit-report";
import { EMPTY_MARKS, withMark, withNote } from "../src/app/lib/review-marks";
import { buildBaseline, compareToBaseline } from "../src/app/lib/baseline";

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
      sentenceLength: { warnAbove: 25 },
    });
    expect(withProfile).toContain("## Perfil editorial");
    expect(withProfile).not.toContain("`configHash` acima");
    expect(withProfile).toContain("O perfil carimbado no cabeçalho");
  });
});

describe("buildAuditReport — the human decision, kept apart from the measurement", () => {
  const audit = () => analyze(SAMPLE);
  const marksOver = (d: ReturnType<typeof analyze>) => {
    const jargon = d.findings.filter((f) => f.criterion === "jargon");
    let marks = withMark(EMPTY_MARKS, jargon[0], "seen");
    marks = withNote(marks, jargon[0], "Termo do edital-padrão do órgão.");
    return withMark(marks, jargon[1], "dismissed");
  };

  it("records what was examined and kept, with the reason when the author wrote one", () => {
    const d = audit();
    const md = buildAuditReport(d, d.findings, META, [], null, null, null, null, null, marksOver(d));

    expect(md).toContain("## Pontos examinados e mantidos");
    expect(md).toContain("**2 pontos examinados**");
    expect(md).toContain("**Motivo:** Termo do edital-padrão do órgão.");
    expect(md).toContain("_Sem motivo registrado._");
  });

  it("says out loud that the record is a human decision and moves nothing", () => {
    const d = audit();
    const md = buildAuditReport(d, d.findings, META, [], null, null, null, null, null, marksOver(d));

    expect(md).toContain("Registro de decisão humana, não medição da ferramenta");
    expect(md).toMatch(/não altera o placar, o resultado da auditoria nem qualquer estado de conformidade/);
  });

  it("counts what nobody examined without listing it — the items are already under Anotações", () => {
    const d = audit();
    const md = buildAuditReport(d, d.findings, META, [], null, null, null, null, null, marksOver(d));
    const section = md.slice(md.indexOf("## Pontos examinados e mantidos"));

    expect(section).toMatch(/\d+ pontos ainda não foram examinados/);
    expect(section).toContain("não são listados aqui");
  });

  it("names the state instead of staying silent when nobody examined anything", () => {
    const d = audit();
    const md = buildAuditReport(d, d.findings, META);

    expect(md).toContain("**Nenhum ponto foi examinado nesta sessão.**");
    expect(md).not.toContain("**Motivo:**");
  });

  it("leaves the scorecard byte-identical: a reason is not a measurement", () => {
    const d = audit();
    const plain = buildAuditReport(d, d.findings, META);
    const decided = buildAuditReport(d, d.findings, META, [], null, null, null, null, null, marksOver(d));

    const scorecard = (md: string) => md.slice(md.indexOf("## Placar"), md.indexOf("## Anotações por critério"));
    expect(scorecard(decided)).toBe(scorecard(plain));
    expect(decided.slice(0, decided.indexOf("## Placar"))).toBe(plain.slice(0, plain.indexOf("## Placar")));
  });

  it("keeps the record out of the audit's own numbers, whatever was marked", () => {
    const d = audit();
    const decided = buildAuditReport(d, d.findings, META, [], null, null, null, null, null, marksOver(d));
    const annotations = (md: string) => (md.match(/^### \d+\. /gm) ?? []).length;

    expect(annotations(decided)).toBe(d.findings.length);
  });
});

describe("buildAuditReport — the comparison with a starting point", () => {
  const V2 = "A comissão analisou o documento em sede de procedimento administrativo.";

  const baselineOf = () => {
    const d = analyze(SAMPLE);
    const kept = d.findings.find((f) => f.span.text === "em sede de")!;
    const marks = withNote(withMark(EMPTY_MARKS, kept, "dismissed"), kept, "Termo do edital-padrão.");
    return buildBaseline({
      title: "Edital 04/2026 — v1",
      savedAt: "30/08/2026",
      text: SAMPLE,
      blocks: null,
      diagnostic: d,
      findings: d.findings,
      profileId: "base",
      config: DEFAULT_CONFIG,
      marks,
      vocabulary: [],
    });
  };

  const reportWith = (config = DEFAULT_CONFIG) => {
    const current = analyze(V2, config);
    const comparison = compareToBaseline(baselineOf(), current, config);
    return buildAuditReport(current, current.findings, META, [], null, null, null, null, null, {}, comparison);
  };

  it("leads with the one fact that makes the numbers legible: the ruler is the same", () => {
    const md = reportWith();
    expect(md).toContain("## Comparação com o ponto de partida");
    expect(md).toContain("**A régua é a mesma nos dois lados.**");
    expect(md).toContain("Edital 04/2026 — v1");
  });

  it("names the audit of the time and the re-measured one as different things", () => {
    const md = reportWith();
    expect(md).toMatch(/A auditoria emitida à época registrou \d+ anotações\. Reanalisado agora, o mesmo texto dá \d+/);
  });

  it("attributes a difference between them to the ruler, never to the text", () => {
    const noJargon = { ...DEFAULT_CONFIG, jargon: { ...DEFAULT_CONFIG.jargon, enabled: false } };
    const md = reportWith(noJargon);

    expect(md).toMatch(/de diferença vêm da mudança da régua, não do texto/);
    expect(md).toContain("perfil editorial");
  });

  it("reports only what survived, and refuses the causal claim", () => {
    const md = reportWith();
    const section = md.slice(md.indexOf("### O que você apontou e continua lá"));

    expect(section).toContain("em sede de");
    expect(section).toContain("já ignorado: Termo do edital-padrão.");
    expect(section).toContain("não é possível dizer qual edição produziu qual mudança");

    const listed = section.split("\n").filter((line) => line.startsWith("- "));
    expect(listed.length).toBeGreaterThan(0);
    for (const line of listed) expect(line).not.toMatch(/resolvid|corrigid|saiu do texto/i);
  });

  it("replaces the in-session before/after, so the report has one starting point only", () => {
    const md = reportWith();
    expect(md).not.toContain("## Antes e depois");
  });
});
