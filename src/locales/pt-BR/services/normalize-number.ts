const UNACCENTED_VOWELS = new Set(["a", "e", "i", "o", "u"]);

const INVARIANT_IN_S = new Set([
  "lápis",
  "ônibus",
  "vírus",
  "pires",
  "cais",
  "atlas",
  "bônus",
  "campus",
  "status",
  "tênis",
  "oásis",
  "íris",
]);

export function normalizeNumber(word: string): string {
  if (word.length <= 3) return word;
  if (INVARIANT_IN_S.has(word)) return word;

  if (word.endsWith("ões")) return word.slice(0, -3) + "ão";
  if (word.endsWith("ães")) return word.slice(0, -3) + "ão";
  if (word.endsWith("ãos")) return word.slice(0, -3) + "ão";

  if (word.endsWith("ns")) return word.slice(0, -2) + "m";

  if (word.endsWith("s") && UNACCENTED_VOWELS.has(word[word.length - 2])) {
    return word.slice(0, -1);
  }

  return word;
}
