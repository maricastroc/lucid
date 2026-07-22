import type {
  ActiveConjugationsPrepared,
  CompiledEntry,
  CompiledPhrase,
  JargonEntry,
  JargonPrepared,
  LightVerbForm,
  NominalizationEntry,
  NominalizationPrepared,
  PhraseEntry,
  PhrasePrepared,
  SerTenseInfo,
  SerTensesPrepared,
} from "./types";

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

export function prepareStringSet(raw: unknown, key: "forms" | "abbreviations"): ReadonlySet<string> {
  const list = (raw as Record<string, string[]>)[key];
  return new Set(list);
}

export function prepareRecord(raw: unknown): Readonly<Record<string, string>> {
  return (raw as { map: Record<string, string> }).map;
}

export function prepareLightVerbs(raw: unknown): ReadonlyMap<string, LightVerbForm> {
  const forms = (raw as { forms: LightVerbForm[] }).forms;
  return new Map(forms.map((entry) => [entry.form, entry]));
}

export function prepareNominalizations(raw: unknown): NominalizationPrepared {
  const data = raw as { entries: NominalizationEntry[]; conjugations: NominalizationPrepared["conjugations"] };
  return {
    entries: new Map(data.entries.map((entry) => [entry.noun, entry])),
    conjugations: data.conjugations,
  };
}

export function prepareJargon(raw: unknown): JargonPrepared {
  const entries = (raw as { entries: JargonEntry[] }).entries;
  return { entries, byFirstWord: compileJargonEntries(entries) };
}

export function prepareSerTenses(raw: unknown): SerTensesPrepared {
  const forms = (raw as { forms: Record<string, SerTenseInfo> }).forms;
  return new Map(Object.entries(forms));
}

export function prepareActiveConjugations(raw: unknown): ActiveConjugationsPrepared {
  const verbs = (raw as { verbs: Record<string, Record<string, string>> }).verbs;
  return new Map(Object.entries(verbs));
}

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
