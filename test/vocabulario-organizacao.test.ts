import { describe, expect, it } from "vitest";
import { analyze } from "@/locales/pt-BR";
import { checkBriefing, DEFAULT_CONFIG, EMPTY_BRIEFING, hashConfig, type OrgTerm } from "@/lucid";
import { buildAuditReport } from "@/app/lib/audit-report";

const withTerms = (terms: readonly OrgTerm[]) => ({ vocabulario: { enabled: true, terms } });

const term = (t: string, plain: string | null = null, reason = ""): OrgTerm => ({ term: t, plain, reason });

const of = (text: string, terms: readonly OrgTerm[]) =>
  analyze(text, withTerms(terms)).findings.filter((f) => f.criterion === "vocabulario_da_organizacao");

describe("the vocabulary the organisation declared", () => {
  it("finds a term the curated glossary never heard of", () => {
    const found = of("O termo de fomento será assinado após a análise.", [term("termo de fomento")]);

    expect(found).toHaveLength(1);
    expect(found[0].span.text).toBe("termo de fomento");
  });

  it("finds it whatever the casing, because the reader trips on the word, not on its shape", () => {
    expect(of("TERMO DE FOMENTO e Termo De Fomento.", [term("termo de fomento")])).toHaveLength(2);
  });

  it("matches whole words only: 'fomento' does not fire inside 'fomentos'", () => {
    expect(of("Os fomentos previstos.", [term("fomento")])).toHaveLength(0);
  });

  it("prefers the longest term, so one occurrence is not reported twice", () => {
    const found = of("O termo de fomento venceu.", [term("termo"), term("termo de fomento")]);

    expect(found).toHaveLength(1);
    expect(found[0].span.text).toBe("termo de fomento");
  });
});

describe("what the organisation attested, and what it did not", () => {
  it("offers the equivalent it recorded as a direct swap", () => {
    const [found] = of("Segue o instrumento congênere.", [term("instrumento congênere", "acordo parecido")]);

    expect(found.suggestion).toBe("acordo parecido");
    expect(found.requiresHuman).toBe(false);
  });

  it("signals and stops when no equivalent was recorded — it does not invent one", () => {
    const [found] = of("Segue o instrumento congênere.", [term("instrumento congênere")]);

    expect(found.suggestion).toBeUndefined();
    expect(found.requiresHuman).toBe(true);
    expect(found.justification).toContain("sinalização");
  });

  it("treats an empty equivalent as no equivalent, not as a swap for nothing", () => {
    const [found] = of("Segue o instrumento congênere.", [term("instrumento congênere", "   ")]);

    expect(found.suggestion).toBeUndefined();
    expect(found.requiresHuman).toBe(true);
  });

  it("carries the reason the organisation gave into the justification", () => {
    const [found] = of("Segue a pactuação.", [term("pactuação", null, "ninguém fora da casa usa esta palavra")]);

    expect(found.justification).toContain("ninguém fora da casa usa esta palavra");
  });
});

describe("the authority is the organisation's, and the finding says so", () => {
  it("never cites a clause of the standard, because the standard did not say this", () => {
    const [found] = of("Segue a pactuação.", [term("pactuação")]);

    expect(found.source).toBe("organizational");
    expect(found.normativeReference).toBeUndefined();
  });

  it("still contributes to the dimension the clause is about", () => {
    const [found] = of("Segue a pactuação.", [term("pactuação")]);

    expect(found.principleGroup).toBe("understandable");
  });

  it("is a criterion of its own, so the report can keep the two lists apart", () => {
    const d = analyze("Segue a pactuação, outrossim.", withTerms([term("pactuação")]));
    const criteria = new Set(d.findings.map((f) => f.criterion));

    expect(criteria.has("vocabulario_da_organizacao")).toBe(true);
    expect(criteria.has("jargon")).toBe(true);
  });
});

describe("the vocabulary travels with the result", () => {
  it("changes the config stamp, so no result can hide which vocabulary measured it", () => {
    const bare = hashConfig(DEFAULT_CONFIG);
    const declared = hashConfig({ ...DEFAULT_CONFIG, ...withTerms([term("pactuação")]) });

    expect(declared).not.toBe(bare);
  });

  it("gives the same stamp for the same vocabulary, so the run stays reproducible", () => {
    const a = hashConfig({ ...DEFAULT_CONFIG, ...withTerms([term("pactuação", "acordo")]) });
    const b = hashConfig({ ...DEFAULT_CONFIG, ...withTerms([term("pactuação", "acordo")]) });

    expect(a).toBe(b);
  });

  it("finds nothing at all when no term was declared", () => {
    expect(of("Segue a pactuação do termo de fomento.", [])).toEqual([]);
  });

  it("is silent when the author turned it off", () => {
    const d = analyze("Segue a pactuação.", { vocabulario: { enabled: false, terms: [term("pactuação")] } });

    expect(d.findings.filter((f) => f.criterion === "vocabulario_da_organizacao")).toEqual([]);
  });

  it("ignores a term that has no word in it, instead of matching everything", () => {
    expect(of("Segue a pactuação.", [term("  —  ")])).toEqual([]);
  });
});

describe("the report keeps the two lists apart", () => {
  const declared = [
    { term: "pactuação", plain: null, reason: "não temos troca segura" },
    { term: "termo de fomento", plain: "acordo de repasse", reason: "" },
  ];

  const report = () => {
    const config = { ...DEFAULT_CONFIG, vocabulario: { enabled: true, terms: declared } };
    const d = analyze("A pactuação do termo de fomento, outrossim, segue.", config);
    return buildAuditReport(
      d,
      d.findings,
      { generatedAt: "01/01/2026" },
      [],
      { briefing: EMPTY_BRIEFING, check: checkBriefing(d.text, EMPTY_BRIEFING) },
      config,
      null,
      null,
      "base",
      {},
      null,
    );
  };

  it("gives the declared vocabulary a section of its own", () => {
    expect(report()).toContain("## Vocabulário da organização");
  });

  it("says out loud that these terms do not come from the standard", () => {
    expect(report()).toContain("**não vêm da norma**");
  });

  it("lists each term with its equivalent, its reason and how often it was found", () => {
    const md = report();

    expect(md).toContain("| termo de fomento | acordo de repasse |");
    expect(md).toContain("| pactuação | — | não temos troca segura | 1 |");
  });

  it("counts the ones that only signal apart from the ones with an equivalent", () => {
    expect(report()).toContain("1 com equivalente registrado, 1 apenas sinalizados");
  });

  it("says nothing about a vocabulary when none was declared", () => {
    const d = analyze("Outrossim, segue.");
    const md = buildAuditReport(
      d,
      d.findings,
      { generatedAt: "01/01/2026" },
      [],
      { briefing: EMPTY_BRIEFING, check: checkBriefing(d.text, EMPTY_BRIEFING) },
      DEFAULT_CONFIG,
      null,
      null,
      "base",
      {},
      null,
    );

    expect(md).not.toContain("## Vocabulário da organização");
  });

  it("still reports the curated glossary finding under its own criterion", () => {
    const md = report();

    expect(md).toContain("Jargão");
    expect(md).toContain("Vocabulário da organização");
  });
});
