import { describe, expect, it } from "vitest";
import * as neutral from "../src/lucid";
import { analyzeWithLocale, hashConfig, pickSections, type Config } from "../src/lucid";
import { DEFAULT_CONFIG, localePtBR } from "../src/locales/pt-BR";
import { CRITERION_IDS } from "../src/locales/pt-BR/criteria";
import { EN_DEFAULT_CONFIG, localeEnUS } from "../src/locales/en-US";
import {
  analysisLocale,
  ANALYSIS_LOCALE_IDS,
  isAnalysisLocaleId,
  requireAnalysisLocale,
} from "../src/app/locale/active";
import { discardsWork, localeSwitchDiscard, localeSwitchItems } from "../src/app/locale/switch";
import { copyFor } from "../src/app/i18n/copy";
import { knobsFor, sectionCriterion, toggleableSectionsFor, type LocaleConfigView } from "../src/app/lib/profile";
import { testLocale } from "./support/test-locale";

const PT = analysisLocale("pt-BR");
const view = (bundle: { configSchema: LocaleConfigView["configSchema"]; config: Config }): LocaleConfigView => ({
  configSchema: bundle.configSchema,
  defaultConfig: bundle.config,
});
const EN = view(localeEnUS);
const SYNTHETIC = view(testLocale);

const PT_ONLY_EXPORTS = [
  "analyze",
  "analyzeDocument",
  "analyzeWithPasses",
  "coverageReport",
  "localePtBR",
  "ptReadability",
  "ptDocumentServices",
  "silentCriteriaIn",
  "missingBlockKindsIn",
  "READABILITY_REFERENCE_RANGE",
  "clauseSplitPoints",
  "passiveScaffold",
  "countPii",
  "isValidCpf",
  "isValidCnpj",
  "CRITERION_IDS",
  "isCriterionId",
  "DEFAULT_CONFIG",
];

const PT_ONLY_SECTIONS = ["mesoclise", "gerundismo", "passivaSintetica", "maisQuePerfeito", "hierarquiaTitulos"];

describe("neutral barrel — @/lucid carries no catalogue", () => {
  it("exports nothing that belongs to pt-BR", () => {
    const exported = Object.keys(neutral);
    for (const name of PT_ONLY_EXPORTS) expect(exported).not.toContain(name);
  });

  it("no exported value carries a pt-BR config section", () => {
    const serialized = JSON.stringify(
      Object.values(neutral).filter((value) => typeof value === "object" && value !== null),
    );
    for (const section of PT_ONLY_SECTIONS) expect(serialized).not.toContain(section);
  });

  it("still exports the neutral machinery a locale is built from", () => {
    const exported = Object.keys(neutral);
    for (const name of [
      "analyzeWithLocale",
      "createAnalyzer",
      "buildDocument",
      "sentenceSpanAt",
      "hashConfig",
      "assertLocaleBundle",
    ]) {
      expect(exported).toContain(name);
    }
  });
});

describe("catalogue controls configuration", () => {
  it("pt-BR offers exactly the toggles of its own criteria", () => {
    const sections = toggleableSectionsFor(PT);
    for (const section of sections) expect(localePtBR.criteria.ids).toContain(sectionCriterion(PT, section));
    expect(sections).toContain("mesoclise");
    expect(sections).toContain("gerundismo");
  });

  it("en-US offers the toggles of its own catalogue and nothing else", () => {
    expect(toggleableSectionsFor(EN)).toEqual([
      "paragraphLength",
      "longHeading",
      "headingLevelSkip",
      "singleItemList",
      "proseEnumeration",
    ]);
    for (const section of PT_ONLY_SECTIONS) expect(toggleableSectionsFor(EN)).not.toContain(section);
  });

  it("en-US thresholds are its own knobs, each carrying a provisional basis", () => {
    const knobs = knobsFor(EN);
    expect(knobs.map((k) => `${k.section}.${k.field}`)).toEqual([
      "sentenceLength.warnAbove",
      "paragraphLength.maxSentences",
      "longHeading.maxWords",
      "proseEnumeration.minItems",
    ]);
    for (const knob of knobs) expect(knob.basis?.status).toBe("provisional");
  });

  it("pt-BR knobs keep their order and are declared product parameters, not provisional", () => {
    const knobs = knobsFor(PT);
    expect(knobs.map((k) => k.labelKey)).toEqual([
      "knobSentenceWarn",
      "knobParagraph",
      "knobHeading",
      "knobSubordination",
      "knobChainedNominalization",
      "knobProseEnumeration",
    ]);
    for (const knob of knobs) expect(knob.basis?.status).toBe("product-parameter");
  });

  it("a locale that declares no criterion offers no toggle and no knob", () => {
    expect(toggleableSectionsFor(SYNTHETIC)).toEqual([]);
    expect(knobsFor(SYNTHETIC)).toEqual([]);
  });

  it("a pt-BR section never enters the config hash of en-US — not even if it leaked into the object", () => {
    const enSections = Object.keys(localeEnUS.configSchema);
    const leaked = { ...EN_DEFAULT_CONFIG, mesoclise: { enabled: false } };
    expect(Object.keys(pickSections(leaked, enSections))).not.toContain("mesoclise");
    expect(hashConfig(leaked, enSections)).toBe(hashConfig(EN_DEFAULT_CONFIG, enSections));
  });

  it("the same change DOES move pt-BR's hash, because pt-BR declares the section", () => {
    const ptSections = Object.keys(localePtBR.configSchema);
    const changed = { ...DEFAULT_CONFIG, mesoclise: { enabled: false } };
    expect(hashConfig(changed, ptSections)).not.toBe(hashConfig(DEFAULT_CONFIG, ptSections));
  });

  it("pt-BR declares every section of its own config, so its stamp is unchanged", () => {
    expect(Object.keys(localePtBR.configSchema).sort()).toEqual(Object.keys(DEFAULT_CONFIG).sort());
    expect(analyzeWithLocale("O prazo foi prorrogado.", localePtBR).meta.configHash).toBe(hashConfig(DEFAULT_CONFIG));
  });

  it("the catalogue is the source of pt-BR's criteria", () => {
    expect([...localePtBR.criteria.ids].sort()).toEqual([...CRITERION_IDS].sort());
  });
});

describe("analysis locale — resolution point", () => {
  it("both engines are registered, each by an explicit id", () => {
    expect(ANALYSIS_LOCALE_IDS).toEqual(["pt-BR", "en-US"]);
    expect(isAnalysisLocaleId("pt-BR")).toBe(true);
    expect(isAnalysisLocaleId("en-US")).toBe(true);
    expect(isAnalysisLocaleId("en")).toBe(false);
    expect(isAnalysisLocaleId(undefined)).toBe(false);
  });

  it("an unknown locale is refused, never resolved to a default", () => {
    expect(() => requireAnalysisLocale("fr-FR")).toThrow(/fr-FR/);
  });

  it("each facade analyses under its own bundle and stamps its own id", () => {
    expect(PT.analyze("As contas foram aprovadas pelo conselho.").meta.localeId).toBe("pt-BR");
    expect(analysisLocale("en-US").analyze("The form was sent.").meta.localeId).toBe("en-US");
  });

  it("each facade knows what it can and cannot do", () => {
    const en = analysisLocale("en-US");
    expect(PT.rewriteAvailable).toBe(true);
    expect(en.rewriteAvailable).toBe(false);
    expect(PT.clauseGuidance).not.toBeNull();
    expect(en.clauseGuidance).toBeNull();
    expect(PT.readability).toBeDefined();
    expect(en.readability).toBeUndefined();
    expect(PT.vocabularySection).toBe("vocabulario");
    expect(en.vocabularySection).toBe("organizationVocabulary");
    expect(PT.experimental).toBe(false);
    expect(en.experimental).toBe(true);
  });

  it("the same facade instance is returned for the same id, so React memos stay stable", () => {
    expect(analysisLocale("pt-BR")).toBe(analysisLocale("pt-BR"));
  });
});

describe("switching the analysis locale discards what belonged to the old one", () => {
  const work = {
    ledger: [
      { source: "manual" as const, label: "edição", burdenBefore: 3, burdenAfter: 1 },
      { source: "ai" as const, label: "IA", burdenBefore: 1, burdenAfter: 1 },
    ],
    marks: { "passive_voice:0:13": { kind: "seen" as const } },
    hasBaseline: true,
    vocabulary: [{ term: "sinistro", plain: "acidente", reason: "jargão da casa" }],
    profileId: "normativo" as const,
    adjustments: 2,
  };
  const empty = {
    ledger: [],
    marks: {},
    hasBaseline: false,
    vocabulary: [],
    profileId: "base" as const,
    adjustments: 0,
  };

  it("counts every criterion-bound artefact the switch would invalidate", () => {
    expect(localeSwitchDiscard(work)).toEqual({
      changes: 2,
      reviewed: 1,
      baseline: true,
      vocabulary: 1,
      profile: "normativo",
      adjustments: 2,
    });
    expect(discardsWork(localeSwitchDiscard(work))).toBe(true);
  });

  it("an untouched workspace has nothing to discard", () => {
    expect(localeSwitchDiscard(empty)).toEqual({
      changes: 0,
      reviewed: 0,
      baseline: false,
      vocabulary: 0,
      profile: null,
      adjustments: 0,
    });
    expect(discardsWork(localeSwitchDiscard(empty))).toBe(false);
  });

  it("each artefact alone is enough to make the switch destructive", () => {
    expect(discardsWork(localeSwitchDiscard({ ...empty, ledger: work.ledger }))).toBe(true);
    expect(discardsWork(localeSwitchDiscard({ ...empty, hasBaseline: true }))).toBe(true);
    expect(discardsWork(localeSwitchDiscard({ ...empty, vocabulary: work.vocabulary }))).toBe(true);
    expect(discardsWork(localeSwitchDiscard({ ...empty, marks: work.marks }))).toBe(true);
    expect(discardsWork(localeSwitchDiscard({ ...empty, profileId: "digital" }))).toBe(true);
    expect(discardsWork(localeSwitchDiscard({ ...empty, adjustments: 1 }))).toBe(true);
  });

  it("the confirmation lists one line per discarded artefact, and nothing it would keep", () => {
    const items = localeSwitchItems(localeSwitchDiscard(work), copyFor("pt-BR"));
    expect(items).toEqual([
      "2 alterações registradas",
      "1 ponto revisado ou ignorado",
      "a linha de base anexada",
      "1 termo do vocabulário da organização",
      "o perfil editorial “Normativo ou contratual”",
      "2 ajustes de limite",
    ]);
    expect(localeSwitchItems(localeSwitchDiscard(empty), copyFor("pt-BR"))).toEqual([]);
  });
});
