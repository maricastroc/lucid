import { createRegistry } from "@/lucid/core/data/registry";
import type { AbbreviationLexicon } from "@/lucid/core/types";
import abbreviationsData from "./abbreviations.en.json";
import acronymsData from "./acronyms.en.json";
import hiddenVerbData from "./hidden-verb.en.json";
import passiveData from "./passive.en.json";
import readerData from "./reader-third-person.en.json";
import shallData from "./shall.en.json";

function prepareAbbreviations(raw: unknown): AbbreviationLexicon {
  const data = raw as { abbreviations: string[]; unitAbbreviations: string[] };
  return { blocking: new Set(data.abbreviations), units: new Set(data.unitAbbreviations) };
}

export interface PassiveLexiconEn {
  readonly bePresent: ReadonlySet<string>;
  readonly bePast: ReadonlySet<string>;
  readonly beBase: ReadonlySet<string>;
  readonly beParticiple: ReadonlySet<string>;
  readonly beProgressive: ReadonlySet<string>;
  readonly modals: ReadonlySet<string>;
  readonly perfectAuxiliaries: ReadonlySet<string>;
  readonly interveningAdverbs: ReadonlySet<string>;
  readonly irregularParticiples: ReadonlySet<string>;
  readonly nonParticipleEd: ReadonlySet<string>;
  readonly eedParticiples: ReadonlySet<string>;
  readonly stativeAfterBe: ReadonlySet<string>;
  readonly nonAgentByFirst: ReadonlySet<string>;
  readonly nonAgentByPhrases: ReadonlySet<string>;
  readonly agentBoundaries: ReadonlySet<string>;
}

function preparePassive(raw: unknown): PassiveLexiconEn {
  const data = raw as Record<keyof PassiveLexiconEn, string[]>;
  const set = (key: keyof PassiveLexiconEn): ReadonlySet<string> => new Set(data[key]);
  return {
    bePresent: set("bePresent"),
    bePast: set("bePast"),
    beBase: set("beBase"),
    beParticiple: set("beParticiple"),
    beProgressive: set("beProgressive"),
    modals: set("modals"),
    perfectAuxiliaries: set("perfectAuxiliaries"),
    interveningAdverbs: set("interveningAdverbs"),
    irregularParticiples: set("irregularParticiples"),
    nonParticipleEd: set("nonParticipleEd"),
    eedParticiples: set("eedParticiples"),
    stativeAfterBe: set("stativeAfterBe"),
    nonAgentByFirst: set("nonAgentByFirst"),
    nonAgentByPhrases: set("nonAgentByPhrases"),
    agentBoundaries: set("agentBoundaries"),
  };
}

export type LightVerbOrigin = "listed" | "example" | "lucid";

export interface LightVerbForm {
  readonly lemma: string;
  readonly base: boolean;
  readonly particle: string | null;
  readonly origin: LightVerbOrigin;
}

export interface AttestedHiddenVerb {
  readonly light: string;
  readonly nominal: string;
  readonly verb: string;
  readonly consumes: string | null;
  readonly source: string;
}

export interface HiddenVerbLexiconEn {
  readonly lightForms: ReadonlyMap<string, LightVerbForm>;
  readonly determiners: ReadonlySet<string>;
  readonly swapDeterminers: ReadonlySet<string>;
  readonly suffixes: readonly string[];
  readonly havePrepositions: ReadonlySet<string>;
  readonly nonDeverbal: ReadonlySet<string>;
  readonly attested: ReadonlyMap<string, AttestedHiddenVerb>;
  readonly attestedNominals: ReadonlySet<string>;
}

interface RawLightVerb {
  lemma: string;
  base: string;
  forms: string[];
  particle: string | null;
  origin: LightVerbOrigin;
}

function prepareHiddenVerb(raw: unknown): HiddenVerbLexiconEn {
  const data = raw as {
    lightVerbs: RawLightVerb[];
    determiners: string[];
    swapDeterminers: string[];
    suffixes: string[];
    havePrepositions: string[];
    nonDeverbal: string[];
    attested: AttestedHiddenVerb[];
  };
  const lightForms = new Map<string, LightVerbForm>();
  for (const verb of data.lightVerbs) {
    for (const form of verb.forms) {
      lightForms.set(form, {
        lemma: verb.lemma,
        base: form === verb.base,
        particle: verb.particle,
        origin: verb.origin,
      });
    }
  }
  return {
    lightForms,
    determiners: new Set(data.determiners),
    swapDeterminers: new Set(data.swapDeterminers),
    suffixes: data.suffixes,
    havePrepositions: new Set(data.havePrepositions),
    nonDeverbal: new Set(data.nonDeverbal),
    attested: new Map(data.attested.map((entry) => [`${entry.light}|${entry.nominal}`, entry])),
    attestedNominals: new Set(data.attested.map((entry) => entry.nominal)),
  };
}

export interface ReaderLexiconEn {
  readonly readerNouns: ReadonlySet<string>;
  readonly determiners: ReadonlySet<string>;
  readonly clauseOpeners: ReadonlySet<string>;
  readonly prepositions: ReadonlySet<string>;
  readonly stops: ReadonlySet<string>;
  readonly barrierConjunctions: ReadonlySet<string>;
  readonly relativePronouns: ReadonlySet<string>;
  readonly deontic: ReadonlySet<string>;
  readonly deonticPhrases: readonly (readonly string[])[];
}

type ReaderSetKey = Exclude<keyof ReaderLexiconEn, "deonticPhrases">;

function prepareReader(raw: unknown): ReaderLexiconEn {
  const data = raw as Record<ReaderSetKey, string[]> & { deonticPhrases: string[][] };
  const set = (key: ReaderSetKey): ReadonlySet<string> => new Set(data[key]);
  return {
    readerNouns: set("readerNouns"),
    determiners: set("determiners"),
    clauseOpeners: set("clauseOpeners"),
    prepositions: set("prepositions"),
    stops: set("stops"),
    barrierConjunctions: set("barrierConjunctions"),
    relativePronouns: set("relativePronouns"),
    deontic: set("deontic"),
    deonticPhrases: [...data.deonticPhrases].sort((a, b) => b.length - a.length),
  };
}

export interface ShallReading {
  readonly reading: string;
  readonly plain: string;
  readonly source: string;
}

export interface ShallLexiconEn {
  readonly forms: ReadonlySet<string>;
  readonly negators: ReadonlySet<string>;
  readonly readings: readonly ShallReading[];
}

function prepareShall(raw: unknown): ShallLexiconEn {
  const data = raw as { forms: string[]; negators: string[]; readings: ShallReading[] };
  return { forms: new Set(data.forms), negators: new Set(data.negators), readings: data.readings };
}

export interface AcronymLexiconEn {
  readonly known: ReadonlySet<string>;
  readonly fromGuidelines: readonly string[];
  readonly lucidAdditions: readonly string[];
}

function prepareAcronyms(raw: unknown): AcronymLexiconEn {
  const data = raw as { fromGuidelines: string[]; lucidAdditions: string[] };
  return {
    known: new Set([...data.fromGuidelines, ...data.lucidAdditions]),
    fromGuidelines: data.fromGuidelines,
    lucidAdditions: data.lucidAdditions,
  };
}

export const REGISTRY_EN = createRegistry({
  "abbreviations.en": {
    raw: abbreviationsData,
    prepare: prepareAbbreviations,
    provenance: "Curated for Lucid against the US federal register; limitations declared in the dataset comment.",
  },
  "passive.en": {
    raw: passiveData,
    prepare: preparePassive,
    provenance:
      "Finite lexicon compiled for Lucid: a registered list of irregular past participles (English participles " +
      "are not a closed class; a participle missing from the list is not detected), plus curated exclusions (non-participle -ed words, stative participles after 'be', " +
      "non-agentive 'by'). Detection of regular participles is productive (-ed), not list-bound.",
  },
  "hidden-verb.en": {
    raw: hiddenVerbData,
    prepare: prepareHiddenVerb,
    provenance:
      "Suffixes and light verbs from the Federal Plain Language Guidelines (2011, p. 23), with the additions " +
      "marked in the dataset; the five phrase-to-verb pairs are copied from the examples on that page. " +
      "Detection is productive (suffix rule); only the attested pairs name a verb.",
  },
  "reader-third-person.en": {
    raw: readerData,
    prepare: prepareReader,
    provenance:
      "Reader-role nouns: six from the examples of the Federal Plain Language Guidelines (2011, pp. 22, 25, " +
      "30-31), the rest Lucid extensions; deontic modals and phrases of US English. Finite list: detection " +
      "depends on it.",
  },
  "shall.en": {
    raw: shallData,
    prepare: prepareShall,
    provenance:
      "Forms of 'shall' and the readings named by the Federal Plain Language Guidelines (2011, p. 25); the " +
      "'will' reading is marked as Lucid's note. No reading is ever chosen or substituted by the engine.",
  },
  "acronyms.en": {
    raw: acronymsData,
    prepare: prepareAcronyms,
    provenance:
      "Acronyms excused from definition: the common-usage examples of the Federal Plain Language Guidelines " +
      "(2011, p. 33) plus Lucid additions, each list labelled. Detection is by shape; this list never finds.",
  },
});

export const DOCUMENT_DATASETS_EN: readonly string[] = ["abbreviations.en"];

export const EN_ABBREVIATIONS: AbbreviationLexicon = REGISTRY_EN.getPrepared<AbbreviationLexicon>("abbreviations.en");
