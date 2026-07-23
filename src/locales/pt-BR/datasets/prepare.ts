import type {
  CompiledEntry,
  CompiledPhrase,
  JargonEntry,
  JargonPrepared,
  LightVerbForm,
  NominalizationEntry,
  PhraseEntry,
  PhrasePrepared,
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

export function prepareNominalizations(raw: unknown): ReadonlyMap<string, NominalizationEntry> {
  const entries = (raw as { entries: NominalizationEntry[] }).entries;
  return new Map(entries.map((entry) => [entry.noun, entry]));
}

export function prepareJargon(raw: unknown): JargonPrepared {
  const entries = (raw as { entries: JargonEntry[] }).entries;
  return { entries, byFirstWord: compileJargonEntries(entries) };
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
