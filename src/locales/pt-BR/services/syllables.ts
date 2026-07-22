const VOWELS = new Set(["a", "e", "i", "o", "u", "á", "à", "â", "ã", "é", "ê", "í", "ó", "ô", "õ", "ú", "y"]);

const VOWELS_FORCING_HIATUS = new Set(["í", "ú"]);

const STRONG_VOWELS = new Set(["a", "á", "à", "â", "ã", "e", "é", "ê", "o", "ó", "ô", "õ"]);

const GLUED_NASAL_PAIRS = new Set(["ão", "ãe", "õe"]);

const RE_NON_LETTER = /[^\p{L}]+/u;

const RE_ALL_UPPERCASE = /^\p{Lu}+$/u;

const UNACCENTED_HIATUS_EXCEPTIONS: ReadonlyMap<string, number> = new Map([
  ["ruim", 2],
  ["ruins", 2],
  ["cruel", 2],
  ["cruéis", 2],
]);

function countSegmentSyllables(originalSegment: string): number {
  const segment = originalSegment.toLowerCase();

  const exception = UNACCENTED_HIATUS_EXCEPTIONS.get(segment);
  if (exception !== undefined) return exception;

  let syllables = 0;
  let inVowelGroup = false;
  let previousVowel: string | null = null;

  for (let i = 0; i < segment.length; i++) {
    const character = segment[i];

    if (!VOWELS.has(character)) {
      inVowelGroup = false;
      previousVowel = null;
      continue;
    }

    let startsNewGroup: boolean;

    if (!inVowelGroup || previousVowel === null) {
      startsNewGroup = true;
    } else if (GLUED_NASAL_PAIRS.has(previousVowel + character)) {
      startsNewGroup = false;
    } else if (VOWELS_FORCING_HIATUS.has(character)) {
      startsNewGroup = true;
    } else if ((character === "i" || character === "u") && segment[i + 1] === "n" && segment[i + 2] === "h") {
      startsNewGroup = true;
    } else if (STRONG_VOWELS.has(previousVowel) && STRONG_VOWELS.has(character)) {
      startsNewGroup = true;
    } else if (character === previousVowel) {
      startsNewGroup = true;
    } else {
      startsNewGroup = false;
    }

    if (startsNewGroup) syllables++;
    inVowelGroup = true;
    previousVowel = character;
  }

  return syllables;
}

export function countSyllables(tokenText: string): number {
  if (tokenText.length === 0) return 0;

  if (RE_ALL_UPPERCASE.test(tokenText)) {
    const hasVowel = Array.from(tokenText.toLowerCase()).some((c) => VOWELS.has(c));
    if (!hasVowel) return tokenText.length;
  }

  const segments = tokenText.split(RE_NON_LETTER).filter((s) => s.length > 0);
  const total = segments.reduce((sum, segment) => sum + countSegmentSyllables(segment), 0);

  return total > 0 ? total : 1;
}
