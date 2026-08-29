import { describe, expect, it } from "vitest";
import { createDataView } from "../src/locales/pt-BR/datasets/registry";
import { nominalizationPass } from "../src/locales/pt-BR/passes/nominalization";
import { sentenceLengthPass } from "../src/locales/pt-BR/passes/sentence-length";
import { passiveVoicePass } from "../src/locales/pt-BR/passes/passive-voice";
import { PASSES } from "../src/locales/pt-BR/passes/registry";
import { analyze } from "../src/lucid";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import { buildDocument } from "./support/pt";
import type { Config } from "../src/lucid/core/config";
import type { PassContext } from "../src/lucid/core/types";

function ctxFor(text: string, config: Config = DEFAULT_CONFIG): PassContext {
  return { doc: buildDocument(text), config, data: createDataView([]) };
}

function nomFindings(text: string, config: Config = DEFAULT_CONFIG) {
  return nominalizationPass.run(ctxFor(text, config));
}

describe("nominalizationPass — each curated light verb", () => {
  it.each([
    "É preciso fazer a análise de documentos.",
    "É preciso realizar o pagamento da taxa.",
    "É preciso efetuar a solicitação de acesso.",
    "É preciso promover a avaliação de riscos.",
    "É preciso proceder à verificação dos dados.",
  ])("detects the construction in '%s' — without composing a swap (ADR-054)", (text) => {
    const findings = nomFindings(text);
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toBeUndefined();
  });
});

describe("nominalizationPass — the engine never composes the swap (ADR-054)", () => {
  it.each([
    "É preciso fazer a análise de documentos.",
    "O comitê fez a análise de documentos.",
    "O comitê fez a análise ontem.",
    "É preciso promover a revisão dos autos.",
  ])("'%s': no finding carries a suggestion", (text) => {
    for (const f of nomFindings(text)) expect(f.suggestion).toBeUndefined();
  });

  it("the curated base verb is reported via meta and justification — information, not ready-made text", () => {
    const [f] = nomFindings("É preciso fazer a análise de documentos.");
    expect(f.meta).toMatchObject({ lightVerb: "fazer", nominalization: "análise", baseVerb: "analisar" });
    expect(f.justification).toContain('"analisar"');
    expect(f.justification).toContain("não reescreve");
  });
});

describe("nominalizationPass — requiresHuman classifies the mapping's ambiguity", () => {
  it.each([
    "É preciso fazer a análise de documentos.",
    "O comitê fez a análise ontem.",
    "Eles fazem a análise semanalmente.",
    "É bom que façam a análise.",
  ])(
    "single mapping ('%s' → analisar): requiresHuman=false — any rewriter resolves it with no new information",
    (text) => {
      const findings = nomFindings(text);
      expect(findings).toHaveLength(1);
      expect(findings[0].requiresHuman).toBe(false);
    },
  );

  it.each(["É preciso promover a revisão dos autos.", "É preciso fazer a revisão de documentos."])(
    "ambiguous mapping ('%s' → revisão): requiresHuman=true — picking the verb is the author's call",
    (text) => {
      const findings = nomFindings(text);
      expect(findings).toHaveLength(1);
      expect(findings[0].requiresHuman).toBe(true);
      expect(findings[0].meta).toMatchObject({ nominalization: expect.stringContaining("revis") });
    },
  );
});

describe("nominalizationPass — definite and indefinite articles", () => {
  it.each([
    ["fazer a análise", "a"],
    ["fazer o pagamento", "o"],
    ["fazer as análises", "as"],
    ["fazer os pagamentos", "os"],
    ["fazer uma análise", "uma"],
  ])("accepts the determiner in '%s'", (fragment) => {
    const findings = nomFindings(`É preciso ${fragment}.`);
    expect(findings).toHaveLength(1);
  });

  it("'um pagamento' is accepted too", () => {
    const findings = nomFindings("É preciso fazer um pagamento.");
    expect(findings).toHaveLength(1);
  });
});

describe("nominalizationPass — à/ao/às/aos contractions", () => {
  it.each(["É preciso proceder à verificação dos dados.", "É preciso proceder ao pagamento imediatamente."])(
    "'%s' matches the 'a' pattern of 'proceder'",
    (text) => {
      const findings = nomFindings(text);
      expect(findings).toHaveLength(1);
    },
  );

  it("a 'direct' determiner (o/a/os/as/um/uma) does not match a verb with the 'a' pattern", () => {
    expect(nomFindings("É preciso proceder a verificação.")).toEqual([]);
  });
});

describe("nominalizationPass — curated nominalizations", () => {
  it.each([
    "análise",
    "pagamento",
    "solicitação",
    "verificação",
    "avaliação",
    "aprovação",
    "correção",
    "atualização",
    "publicação",
    "cancelamento",
    "agendamento",
  ])("'%s' is recognized", (nominalization) => {
    const findings = nomFindings(`É preciso fazer a ${nominalization}.`);
    expect(findings).toHaveLength(1);
  });
});

describe("nominalizationPass — words outside the dataset", () => {
  it.each(["formação", "administração", "operação", "edição", "condução", "bolo", "presente", "tempo"])(
    "'%s' is not recognized (outside the dataset)",
    (word) => {
      expect(nomFindings(`É preciso fazer a ${word}.`)).toEqual([]);
    },
  );
});

describe("nominalizationPass — a light verb used lexically", () => {
  it.each(["Fazer o bolo é fácil.", "Dar um presente é gentil.", "É preciso ter tempo."])(
    "'%s' yields no finding (the object is not a curated nominalization)",
    (text) => {
      expect(nomFindings(text)).toEqual([]);
    },
  );

  it("a nominalization with no determiner does not match (no documented exception at this stage)", () => {
    expect(nomFindings("É preciso fazer análise de documentos.")).toEqual([]);
  });
});

describe("nominalizationPass — a nominalization with no light verb", () => {
  it.each(["A análise foi publicada ontem.", "O pagamento venceu ontem."])("'%s' yields no finding", (text) => {
    expect(nomFindings(text)).toEqual([]);
  });
});

describe("nominalizationPass — a modifier between determiner and nominalization", () => {
  it("an adjective between determiner and nominalization blocks the head from matching", () => {
    expect(nomFindings("É preciso fazer a boa análise.")).toEqual([]);
  });

  it("a possessive between determiner and nominalization blocks the head from matching", () => {
    expect(nomFindings("É preciso fazer a nossa análise.")).toEqual([]);
  });
});

describe("nominalizationPass — the span always covers the 3-token head", () => {
  it.each([
    ["É preciso fazer a análise de documentos.", "fazer a análise"],
    ["O comitê fez a análise ontem.", "fez a análise"],
    ["É preciso fazer a análise e a revisão dos dados.", "fazer a análise"],
    ["É preciso realizar uma análise cuidadosa dos documentos.", "realizar uma análise"],
  ])("'%s' → span '%s' (the complement belongs to the author, not to the finding)", (text, expected) => {
    const doc = buildDocument(text);
    const findings = nominalizationPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });

    expect(findings).toHaveLength(1);
    expect(findings[0].span.text).toBe(expected);
    expect(doc.source.slice(findings[0].span.start, findings[0].span.end)).toBe(findings[0].span.text);
  });
});

describe("nominalizationPass — multiple findings", () => {
  it("detects constructions in different sentences", () => {
    const text = "É preciso fazer a análise de documentos. Depois, realizar o pagamento da taxa.";
    const findings = nomFindings(text);
    expect(findings).toHaveLength(2);
    expect(findings[0].meta).toMatchObject({ baseVerb: "analisar" });
    expect(findings[1].meta).toMatchObject({ baseVerb: "pagar" });
  });

  it("detects two constructions in the same sentence", () => {
    const text = "Convém fazer a análise, mas também realizar a verificação.";
    const findings = nomFindings(text);
    expect(findings).toHaveLength(2);
  });
});

describe("nominalizationPass — config.nominalization", () => {
  it("enabled:false switches off the whole pass", () => {
    const config: Config = { ...DEFAULT_CONFIG, nominalization: { enabled: false } };
    expect(nomFindings("É preciso fazer a análise de documentos.", config)).toEqual([]);
  });
});

describe("nominalizationPass — byte-identical determinism", () => {
  it("the same input always produces the same JSON", () => {
    const text =
      "É preciso fazer a análise de documentos. O comitê fez a análise ontem. " +
      "Convém promover a revisão dos autos, mas também realizar o pagamento da taxa.";

    const r1 = JSON.stringify(nomFindings(text));
    const r2 = JSON.stringify(nomFindings(text));
    const r3 = JSON.stringify(nominalizationPass.run(ctxFor(text)));

    expect(r2).toBe(r1);
    expect(r3).toBe(r1);
  });
});

describe("nominalizationPass — integration through the registry and through analyze()", () => {
  it("the pass is registered in PASSES", () => {
    expect(PASSES).toContain(nominalizationPass);
    expect(PASSES).toContain(sentenceLengthPass);
    expect(PASSES).toContain(passiveVoicePass);
  });

  it("analyze() includes nominalization findings, correctly ordered", () => {
    const text = "É preciso fazer a análise de documentos. O comitê fez a análise ontem.";
    const diagnostic = analyze(text);

    const nominalizations = diagnostic.findings.filter((f) => f.criterion === "nominalization");
    expect(nominalizations).toHaveLength(2);
    expect(nominalizations[0].normativeReference?.section).toBe("5.3.3");
    expect(nominalizations[0].category).toBe("syntactic");
  });

  it("analyze().score.byCriterion includes an entry for nominalization", () => {
    const diagnostic = analyze("É preciso fazer a análise de documentos.");
    const entry = diagnostic.score.byCriterion.find((c) => c.criterion === "nominalization");

    expect(entry).toBeDefined();
    expect(entry?.count.warning).toBe(1);
  });
});
