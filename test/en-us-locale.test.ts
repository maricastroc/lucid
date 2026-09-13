import { describe, expect, it } from "vitest";
import { analyzeWithLocale, assertLocaleBundle, buildCoverageReport, hashConfig, readabilityReadingOf } from "@/lucid";
import { localePtBR, CRITERION_IDS as PT_IDS } from "@/locales/pt-BR";
import {
  EN_CRITERION_IDS,
  EN_DEFAULT_CONFIG,
  EN_LINGUISTIC_IDS,
  EN_NOT_PORTED,
  EN_ORGANIZATIONAL_IDS,
  EN_REUSED_ENGINE_IDS,
  localeEnUS,
} from "@/locales/en-US";

const DOC = [
  "# Applying for the Program",
  "",
  "## Who can apply",
  "",
  "You can apply if you live in the state and your household income is below the limit set by the agency for " +
    "the current year, which the agency publishes each January on its website and in its offices across the state.",
  "",
  "### Documents you need",
  "",
  "- A photo ID",
  "",
  "## How to apply",
  "",
  "Send the form to the Department of Revenue. The FEMA office also accepts forms. Call us if you have questions. " +
    "Mr. Smith at Rep. Jones's office can help with forms filed under No. 5. We review each form. We answer within " +
    "ten days. We may ask for more documents. We tell you the decision in writing. We keep a copy of your form. " +
    "We delete it after five years. You can appeal the decision.",
  "",
  "#### Deadlines",
  "",
  "Send it by March 31.",
  "",
  "## What happens next.",
  "",
  "We write to you.",
].join("\n");

const VOCABULARY = {
  organizationVocabulary: {
    enabled: true,
    terms: [{ term: "Department of Revenue", plain: "tax office", reason: "readers do not know the agency name" }],
  },
};

const analyze = (text: string, config?: Parameters<typeof analyzeWithLocale<typeof EN_DEFAULT_CONFIG>>[2]) =>
  analyzeWithLocale(text, localeEnUS, config);

describe("en-US bundle — declared, not inherited", () => {
  it("passes the locale bundle validation", () => {
    expect(() => assertLocaleBundle(localeEnUS)).not.toThrow();
  });

  it("the catalogue is split into linguistic work, reused engines and the organization's vocabulary", () => {
    expect([...EN_REUSED_ENGINE_IDS]).toEqual([
      "long_sentence",
      "paragraph_length",
      "long_heading",
      "heading_level_skip",
      "single_item_list",
    ]);
    expect([...EN_ORGANIZATIONAL_IDS]).toEqual(["organization_vocabulary"]);
    expect([...EN_CRITERION_IDS]).toEqual([...EN_LINGUISTIC_IDS, ...EN_REUSED_ENGINE_IDS, ...EN_ORGANIZATIONAL_IDS]);
    expect(localeEnUS.passes.map((p) => p.criterion)).toEqual([...EN_CRITERION_IDS]);
  });

  it("carries no pt-BR config section", () => {
    const sections = Object.keys(localeEnUS.config);
    for (const forbidden of ["mesoclise", "gerundismo", "passivaSintetica", "maisQuePerfeito", "vocabulario"]) {
      expect(sections).not.toContain(forbidden);
    }
  });

  it("every length threshold is declared provisional, with the source it came from", () => {
    const thresholds = Object.values(localeEnUS.configSchema).flatMap((s) => Object.values(s.thresholds ?? {}));
    expect(thresholds).toHaveLength(4);
    for (const t of thresholds) {
      expect(t.status).toBe("provisional");
      expect(t.basis.length).toBeGreaterThan(40);
    }
  });

  it("its thresholds are its own, not pt-BR's copied by default", () => {
    expect(EN_DEFAULT_CONFIG.sentenceLength.warnAbove).toBe(25);
    expect(EN_DEFAULT_CONFIG.paragraphLength.maxSentences).toBe(8);
    expect(localePtBR.config.sentenceLength.warnAbove).toBe(20);
    expect(localePtBR.config.paragraphLength.maxSentences).toBe(5);
  });

  it("every reused pass is marked as a shared engine, and no linguistic pass is", () => {
    const engineOf = (id: string) => localeEnUS.passes.find((p) => p.criterion === id)?.engine;
    for (const id of [...EN_REUSED_ENGINE_IDS, ...EN_ORGANIZATIONAL_IDS]) expect(engineOf(id), id).toBe("shared");
    for (const id of EN_LINGUISTIC_IDS) expect(engineOf(id), id).toBeUndefined();
  });
});

describe("en-US analysis — an English document end to end", () => {
  const d = analyze(DOC, VOCABULARY);
  const by = (criterion: string) => d.findings.filter((f) => f.criterion === criterion);

  it("stamps its own locale and standard", () => {
    expect(d.meta.localeId).toBe("en-US");
    expect(d.meta.standardVersion).toBe("ISO 24495-1:2023");
  });

  it("finds only criteria of its own catalogue", () => {
    for (const f of d.findings) expect(EN_CRITERION_IDS as readonly string[]).toContain(f.criterion);
  });

  it("finds each structural phenomenon the fixture was built to carry", () => {
    expect(by("long_sentence")).toHaveLength(1);
    expect(by("paragraph_length")).toHaveLength(1);
    expect(by("single_item_list")).toHaveLength(1);
    expect(by("heading_level_skip")).toHaveLength(1);
    expect(by("long_heading").map((f) => f.span.text)).toEqual(["What happens next."]);
  });

  it("keeps 'Mr.', 'Rep.' and 'No. 5' inside one sentence", () => {
    const paragraph = by("paragraph_length")[0];
    expect(paragraph.justification).toMatch(/^Long paragraph: 11 sentences/);
  });

  it("the organization vocabulary matches case-insensitively and offers the declared equivalent", () => {
    const [term] = by("organization_vocabulary");
    expect(term.span.text).toBe("Department of Revenue");
    expect(term.suggestion).toBe("tax office");
    expect(term.requiresHuman).toBe(false);
    expect(term.justification).toMatch(/Declared reason: readers do not know the agency name$/);
  });

  it("writes every justification in English and never cites the Brazilian adoption", () => {
    for (const f of d.findings) {
      expect(f.justification).not.toMatch(/[ãõçáéíóú]/);
      expect(f.justification).not.toContain("ABNT");
    }
  });

  it("cites ISO 24495-1, not the ABNT adoption", () => {
    for (const f of d.findings.filter((x) => x.source === "iso-24495-1")) {
      expect(f.normativeReference?.standard).toBe("ISO 24495-1");
    }
  });

  it("marks the provisional thresholds on the findings that used them", () => {
    expect(by("long_sentence")[0].meta?.thresholdStatus).toBe("provisional");
    expect(by("paragraph_length")[0].meta?.thresholdStatus).toBe("provisional");
    expect(by("long_heading")[0].meta?.thresholdStatus).toBeUndefined();
  });

  it("publishes no readability, no syllables and no cohesion — as null, never zero", () => {
    expect(d.metrics.readability).toBeNull();
    expect(d.metrics.syllables).toBeNull();
    expect(d.metrics.syllablesPerWord).toBeNull();
    expect(d.metrics.cohesion).toBeNull();
    expect(readabilityReadingOf(localeEnUS.metrics.readability, d.metrics)).toEqual({ kind: "unavailable" });
  });

  it("still counts what it can count", () => {
    expect(d.metrics.words).toBeGreaterThan(80);
    expect(d.metrics.sentences).toBeGreaterThan(15);
  });

  it("is byte-deterministic", () => {
    expect(JSON.stringify(analyze(DOC, VOCABULARY))).toBe(JSON.stringify(d));
  });
});

describe("en-US configuration hash", () => {
  it("hashes only the sections en-US declares", () => {
    const d = analyze("A short sentence.");
    expect(d.meta.configHash).toBe(hashConfig(EN_DEFAULT_CONFIG, Object.keys(localeEnUS.configSchema)));
  });

  it("differs from pt-BR's, because the declared sections differ", () => {
    expect(analyze("A short sentence.").meta.configHash).not.toBe(
      analyzeWithLocale("Uma frase curta.", localePtBR).meta.configHash,
    );
  });

  it("a threshold the user changes moves the hash", () => {
    const moved = analyze("A short sentence.", { sentenceLength: { warnAbove: 30 } }).meta.configHash;
    expect(moved).not.toBe(analyze("A short sentence.").meta.configHash);
  });
});

describe("en-US does not detect Portuguese phenomena", () => {
  it("a Portuguese sentence full of pt-BR-only constructions produces no pt-BR finding", () => {
    const d = analyze("Far-se-á a análise. Aplica-se a multa. Vou estar enviando. Ele fizera tudo.");
    for (const f of d.findings) expect(EN_CRITERION_IDS as readonly string[]).toContain(f.criterion);
    expect(d.findings.filter((f) => !["long_sentence"].includes(f.criterion))).toEqual([]);
  });

  it("declares the four pt-BR criteria it does not carry, each with a reason", () => {
    expect(EN_NOT_PORTED.map((n) => n.criterion).sort()).toEqual(
      ["gerundismo", "mais_que_perfeito_sintetico", "mesoclise", "passiva_sintetica"].sort(),
    );
    for (const n of EN_NOT_PORTED) {
      expect(PT_IDS as readonly string[]).toContain(n.criterion);
      expect(EN_CRITERION_IDS as readonly string[]).not.toContain(n.criterion);
      expect(n.reason.length).toBeGreaterThan(30);
    }
  });

  it("the shared phenomena resolve to the same canonical id in both locales", () => {
    const ptCanonical = (id: string) => localePtBR.criteria.canonical?.[id] ?? id;
    expect(ptCanonical("salto_de_nivel_titulo")).toBe("heading_level_skip");
    expect(ptCanonical("vocabulario_da_organizacao")).toBe("organization_vocabulary");
    for (const id of EN_CRITERION_IDS) {
      expect(localeEnUS.criteria.canonical?.[id] ?? id).toBe(id);
    }
    for (const n of EN_NOT_PORTED) {
      expect(EN_CRITERION_IDS as readonly string[]).not.toContain(ptCanonical(n.criterion));
    }
  });
});

describe("en-US coverage map", () => {
  const report = buildCoverageReport(localeEnUS.clauses, localeEnUS.taxonomy);

  it("builds against its own tree and cites ISO, not ABNT", () => {
    expect(report.standard).toBe("ISO 24495-1:2023");
    expect(localeEnUS.clauses.referenceName).toBe("ISO 24495-1");
  });

  it("every English title is marked provisional, because the ISO English text was not transcribed", () => {
    expect(localeEnUS.clauses.nodes.every((node) => node.provisional)).toBe(true);
    expect(report.exhaustive).toBe(false);
    expect(report.detectedShare).toBeNull();
  });

  it("covers exactly the clauses its criteria cite, and declares the rest", () => {
    const covered = report.clauses.filter((c) => c.criteria.length > 0).map((c) => c.section);
    expect(covered).toEqual(["5.2.2", "5.2.3", "5.2.4", "5.3.2", "5.3.3", "5.3.4"]);
    const status = (section: string) => report.clauses.find((c) => c.section === section)?.status;
    expect(status("5.3.3")).toBe("partial");
    expect(status("5.3.2")).toBe("partial");
    expect(status("5.3.8")).toBe("unbuilt");
    expect(status("5.4.3")).toBe("out_of_reach");
  });

  it("names the criteria outside the standard", () => {
    expect(report.outsideStandard.map((c) => c.criterion).sort()).toEqual(
      ["ambiguous_shall", "organization_vocabulary", "single_item_list"].sort(),
    );
  });
});
