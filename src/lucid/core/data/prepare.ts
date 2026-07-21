/**
 * Transformações `raw JSON → estrutura preparada` de cada dataset (incremento 2, ADR-023).
 *
 * Puras. O registry as chama UMA vez na construção (memoização). Ficam aqui, junto dos tipos de
 * dado, para não inverter a cerca (registry não importa passe). Cada função replica EXATAMENTE a
 * preparação que antes vivia dentro do consumidor — a saída de `analyze` fica byte-idêntica.
 */
import type {
  CompiledEntry,
  CompiledPhrase,
  JargonEntry,
  JargonPrepared,
  LightVerbForm,
  NominalizationEntry,
  NominalizationPrepared,
  PhraseEntry,
  PhrasePrepared,
} from "./types";

/**
 * Agrupa entradas de jargão pela primeira palavra e ordena cada lista por comprimento (nº de
 * tokens) DECRESCENTE — "longest-match-first" sem reordenar em runtime. A ordenação por comprimento
 * torna o resultado INDEPENDENTE da ordem das entradas no JSON de origem. (Antes vivia em
 * `passes/jargon.ts`; movida para cá sem alteração. Reexportada de lá como seam de teste.)
 */
export function compileJargonEntries(entries: readonly JargonEntry[]): Map<string, CompiledEntry[]> {
  const map = new Map<string, CompiledEntry[]>();

  for (const entry of entries) {
    const words = entry.term.split(" ");
    const list = map.get(words[0]);
    const compiled: CompiledEntry = { words, entry };
    if (list) {
      list.push(compiled);
    } else {
      map.set(words[0], [compiled]);
    }
  }

  for (const list of map.values()) {
    list.sort((a, b) => b.words.length - a.words.length);
  }

  return map;
}

/** `{ forms: string[] }` → `Set` em caixa invariante já garantida na origem. */
export function prepareStringSet(raw: unknown, key: "forms" | "abbreviations"): ReadonlySet<string> {
  const list = (raw as Record<string, string[]>)[key];
  return new Set(list);
}

/** `{ map: Record<string,string> }` → o próprio mapa (particípio→infinitivo). */
export function prepareRecord(raw: unknown): Readonly<Record<string, string>> {
  return (raw as { map: Record<string, string> }).map;
}

/** `{ forms: LightVerbForm[] }` → `Map<form, LightVerbForm>`. */
export function prepareLightVerbs(raw: unknown): ReadonlyMap<string, LightVerbForm> {
  const forms = (raw as { forms: LightVerbForm[] }).forms;
  return new Map(forms.map((entry) => [entry.form, entry]));
}

/** `{ entries: NominalizationEntry[], conjugations }` → `{ entries: Map, conjugations }`. */
export function prepareNominalizations(raw: unknown): NominalizationPrepared {
  const data = raw as { entries: NominalizationEntry[]; conjugations: NominalizationPrepared["conjugations"] };
  return {
    entries: new Map(data.entries.map((entry) => [entry.noun, entry])),
    conjugations: data.conjugations,
  };
}

/** `{ entries: JargonEntry[] }` → `{ entries, byFirstWord }`. */
export function prepareJargon(raw: unknown): JargonPrepared {
  const entries = (raw as { entries: JargonEntry[] }).entries;
  return { entries, byFirstWord: compileJargonEntries(entries) };
}

/**
 * `{ entries: PhraseEntry[] }` → mapa `primeira palavra → frases (mais longa primeiro)`. Mesma
 * lógica de `compileJargonEntries` (longest-match determinístico, independente da ordem do JSON),
 * para frases feitas genéricas (redundância, perífrase).
 */
export function preparePhrases(raw: unknown): PhrasePrepared {
  const entries = (raw as { entries: PhraseEntry[] }).entries;
  const map = new Map<string, CompiledPhrase[]>();
  for (const entry of entries) {
    const words = entry.phrase.split(" ");
    const list = map.get(words[0]);
    const compiled: CompiledPhrase = { words, entry };
    if (list) list.push(compiled);
    else map.set(words[0], [compiled]);
  }
  for (const list of map.values()) list.sort((a, b) => b.words.length - a.words.length);
  return map;
}
