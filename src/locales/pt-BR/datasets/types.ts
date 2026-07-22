/**
 * Tipos dos datasets do locale pt-BR (ADR-031) — movidos do core, que agora só conhece a
 * `DataView` neutra. `DatasetId` é o conjunto FECHADO de ids do português; `DataTypes` mapeia cada
 * id ao seu shape preparado. Os shapes carregam gramática PT (ex.: `sourcePreposition: "de"`).
 */
export type DatasetId =
  | "abreviacoes.pt"
  | "verbos-ser.pt"
  | "participios-irregulares.pt"
  | "participios-ambiguos.pt"
  | "participios-falsos-nominais.pt"
  | "participios-infinitivo.pt"
  | "verbos-leves.pt"
  | "nominalizacoes.pt"
  | "jargao.pt"
  | "mais-que-perfeito.pt"
  | "adverbios-mente.pt"
  | "redundancias.pt"
  | "perifrases.pt"
  | "duplas-negacoes.pt";

export type JargonKind = "word" | "phrase";
export type JargonDomain = "administrative" | "legal" | "general";
export type JargonReason = "polysemous" | "context_dependent" | "institutional" | null;

export interface JargonEntry {
  term: string;
  kind: JargonKind;
  domain: JargonDomain;
  plain: string | null;
  safeForSuggestion: boolean;
  reason: JargonReason;
}

export interface CompiledEntry {
  words: readonly string[];
  entry: JargonEntry;
}

export interface JargonPrepared {
  entries: readonly JargonEntry[];
  byFirstWord: ReadonlyMap<string, readonly CompiledEntry[]>;
}

export interface LightVerbForm {
  form: string;
  lemma: string;
  infinitive: boolean;
  feature: string;
  pattern: "direct" | "a";
}

export interface NominalizationEntry {
  noun: string;
  verb: string;
  sourcePreposition: "de" | null;
  targetPreposition: "de" | null;
  safeForSuggestion: boolean;
}

export type ConjugationTable = Record<string, Record<string, string>>;

export interface NominalizationPrepared {
  entries: ReadonlyMap<string, NominalizationEntry>;
  conjugations: ConjugationTable;
}

export interface PhraseEntry {
  phrase: string;
  plain: string | null;
}
export interface CompiledPhrase {
  words: readonly string[];
  entry: PhraseEntry;
}

export type PhrasePrepared = ReadonlyMap<string, readonly CompiledPhrase[]>;

export interface DataTypes {
  "abreviacoes.pt": ReadonlySet<string>;
  "verbos-ser.pt": ReadonlySet<string>;
  "participios-irregulares.pt": ReadonlySet<string>;
  "participios-ambiguos.pt": ReadonlySet<string>;
  "participios-falsos-nominais.pt": ReadonlySet<string>;
  "participios-infinitivo.pt": Readonly<Record<string, string>>;
  "verbos-leves.pt": ReadonlyMap<string, LightVerbForm>;
  "nominalizacoes.pt": NominalizationPrepared;
  "jargao.pt": JargonPrepared;
  "mais-que-perfeito.pt": ReadonlySet<string>;
  "adverbios-mente.pt": ReadonlySet<string>;
  "redundancias.pt": PhrasePrepared;
  "perifrases.pt": PhrasePrepared;
  "duplas-negacoes.pt": PhrasePrepared;
}
