/**
 * Tipos de DADOS da Camada 1 (shapes dos datasets + estruturas PREPARADAS).
 *
 * Vivem aqui (não nos passes) para o registry poder prepará-los uma vez sem inverter a cerca
 * (registry → pass seria ciclo). Os passes importam estes tipos daqui. Ver DESIGN-data-registry.md
 * §2.1 / incremento 2 (ADR-023).
 */

/** União fechada dos ids de dataset conhecidos. Trocar id é evento de código, auditável. */
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

// --- jargão ------------------------------------------------------------------------
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

// --- nominalização -----------------------------------------------------------------
export interface LightVerbForm {
  form: string;
  lemma: string;
  infinitive: boolean;
  /** traço morfológico (ex.: "pret.3s"); casa com a tabela `conjugations` (ADR-011) */
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

/**
 * Tipo PREPARADO por dataset — o que `ctx.data.get(id)` / `getPrepared(id)` devolvem. É a
 * estrutura pronta (Set/Map), construída uma vez no registry.
 */
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

// --- frases feitas (redundância, perífrase) ---------------------------------------
export interface PhraseEntry {
  phrase: string;
  /** forma enxuta citada na justificativa; a ferramenta não aplica sozinha */
  plain: string | null;
}
export interface CompiledPhrase {
  words: readonly string[];
  entry: PhraseEntry;
}
/** frases agrupadas pela primeira palavra, cada lista ordenada por comprimento decrescente */
export type PhrasePrepared = ReadonlyMap<string, readonly CompiledPhrase[]>;

/**
 * Visão ESCOPADA de dados injetada em `PassContext.data`. `get` lança se o `id` não foi
 * declarado em `Pass.dataDeps` — impede dependência oculta e mantém o `dataHash` honesto.
 * Usada por passes (acesso em run-time). Consumidores fora do pipeline (montagem do documento,
 * actions) usam `getPrepared` do registry.
 */
export interface DataView {
  get<K extends DatasetId>(id: K): DataTypes[K];
}
