import { describe, expect, it } from "vitest";
import { countSyllables } from "../src/locales/pt-BR/services/syllables";

describe("countSyllables — simple words", () => {
  it.each([
    ["casa", 2],
    ["gato", 2],
    ["livro", 2],
    ["computador", 4],
  ])("'%s' has %i syllables", (word, expected) => {
    expect(countSyllables(word)).toBe(expected);
  });
});

describe("countSyllables — accents", () => {
  it.each([
    ["café", 2],
    ["política", 4],
    ["número", 3],
  ])("'%s' has %i syllables", (word, expected) => {
    expect(countSyllables(word)).toBe(expected);
  });
});

describe("countSyllables — diphthongs", () => {
  it("a common diphthong counts as 1 nucleus (cadeira: ca-dei-ra)", () => {
    expect(countSyllables("cadeira")).toBe(3);
  });

  it("a simple monosyllabic diphthong (pai)", () => {
    expect(countSyllables("pai")).toBe(1);
  });

  it("an unstressed diphthong at the end of the word (história: his-tó-ria)", () => {
    expect(countSyllables("história")).toBe(3);
  });

  it("a diphthong with 'u' after 'q' (água: á-gua — it does not break into a hiatus)", () => {
    expect(countSyllables("água")).toBe(2);
  });
});

describe("countSyllables — hiatuses with a written accent", () => {
  it("hiatus marked by an accent on í (saída: sa-í-da)", () => {
    expect(countSyllables("saída")).toBe(3);
  });

  it("hiatus marked by an accent on ú (saúde: sa-ú-de)", () => {
    expect(countSyllables("saúde")).toBe(3);
  });
});

describe("countSyllables — hiatuses with no written accent (new rules)", () => {
  it("hiatus from a repeated vowel (voo: vo-o)", () => {
    expect(countSyllables("voo")).toBe(2);
  });

  it("hiatus between two strong vowels o+e (poesia: improves from 2→3, real=4 — see the limitation below)", () => {
    expect(countSyllables("poesia")).toBe(3);
  });

  it("hiatus between two strong vowels e+a (teatro: te-a-tro)", () => {
    expect(countSyllables("teatro")).toBe(3);
  });

  it("hiatus between two strong vowels e+a, with an extra syllable before (oceano: o-ce-a-no)", () => {
    expect(countSyllables("oceano")).toBe(4);
  });

  it("hiatus between two strong vowels e+a (real: re-al)", () => {
    expect(countSyllables("real")).toBe(2);
  });

  it("two consecutive strong-vowel hiatuses (aéreo: a-é-re-o)", () => {
    expect(countSyllables("aéreo")).toBe(4);
  });

  it("an unstressed 'i'/'u' before 'nh' is a hiatus (rainha: ra-i-nha)", () => {
    expect(countSyllables("rainha")).toBe(3);
  });

  it("an unstressed 'i'/'u' before 'nh' is a hiatus (moinho: mo-i-nho)", () => {
    expect(countSyllables("moinho")).toBe(3);
  });

  it("ordinary 'nh', with no adjacent vowel before it, is unaffected (caminho: ca-mi-nho)", () => {
    expect(countSyllables("caminho")).toBe(3);
  });

  it("documented lexical exception: 'ruim' (ru-im) does not follow the standard diphthong rule", () => {
    expect(countSyllables("ruim")).toBe(2);
  });

  it("documented lexical exception: 'cruel' (cru-el) does not follow the standard diphthong rule", () => {
    expect(countSyllables("cruel")).toBe(2);
  });
});

describe("countSyllables — KNOWN LIMITATIONS (not fixed, documented)", () => {

  it("'poesia' improves with the strong-vowel rule (2→3) but still falls short of 4 (real: po-e-si-a)", () => {
    expect(countSyllables("poesia")).toBe(3);
  });

  it("'reunião' stays wrong (a prefix/morpheme boundary hiatus, not locally detectable)", () => {
    expect(countSyllables("reunião")).toBe(2);
  });
});

describe("countSyllables — endings -ção / -são / -mente / -dade / -eiro", () => {
  it("'nação' (-ção) has 2 syllables", () => {
    expect(countSyllables("nação")).toBe(2);
  });

  it("'profissão' (-são) has 3 syllables — confirms the new rule does not break the nasal 'ão'", () => {
    expect(countSyllables("profissão")).toBe(3);
  });

  it("'claramente' (-mente) has 4 syllables", () => {
    expect(countSyllables("claramente")).toBe(4);
  });

  it("'cidade' (-dade) has 3 syllables", () => {
    expect(countSyllables("cidade")).toBe(3);
  });

  it("'dinheiro' (-eiro) has 3 syllables", () => {
    expect(countSyllables("dinheiro")).toBe(3);
  });
});

describe("countSyllables — ão / ãe / õe (nasal diphthong, never a hiatus)", () => {
  it.each([
    ["não", 1],
    ["mãe", 1],
    ["põe", 1],
  ])("'%s' has %i syllable(s)", (word, expected) => {
    expect(countSyllables(word)).toBe(expected);
  });
});

describe("countSyllables — hyphenated words", () => {
  it("'guarda-chuva' adds up the syllables on both sides of the hyphen", () => {
    expect(countSyllables("guarda-chuva")).toBe(4);
  });

  it("'arco-íris' adds up the syllables on both sides of the hyphen", () => {
    expect(countSyllables("arco-íris")).toBe(4);
  });
});

describe("countSyllables — apostrophe (elision)", () => {
  it("'d'água' counts the consonant fragment as 0 and adds it to 'água'", () => {
    expect(countSyllables("d'água")).toBe(2);
  });
});

describe("countSyllables — pronounceable vs. spelled-out acronyms", () => {
  it("a pronounceable acronym with no internal periods ('ONU') counts as an ordinary word", () => {
    expect(countSyllables("ONU")).toBe(2);
  });

  it("an acronym joined by periods ('E.U.A', the form the tokenizer produces) adds 1 per letter", () => {
    expect(countSyllables("E.U.A")).toBe(3);
  });

  it("a spelled-out acronym with no vowel at all ('CPF') counts 1 unit per letter", () => {
    expect(countSyllables("CPF")).toBe(3);
  });

  it("a spelled-out acronym with no vowel at all ('FGTS') counts 1 unit per letter", () => {
    expect(countSyllables("FGTS")).toBe(4);
  });

  it("a spelled-out acronym with no vowel at all ('RG') counts 1 unit per letter", () => {
    expect(countSyllables("RG")).toBe(2);
  });

  it("an ordinary uppercase word (not an acronym) is unaffected by the spelling-out rule", () => {
    expect(countSyllables("A")).toBe(1);
  });
});

describe("countSyllables — Unicode NFC/NFD", () => {
  it("produces the same result for the same word in NFC and NFD", () => {
    const nfc = "política";
    const nfd = nfc.normalize("NFD");
    expect(countSyllables(nfd)).toBe(countSyllables(nfc));
  });

  it("holds for words with a strong-vowel hiatus too (aéreo)", () => {
    const nfc = "aéreo";
    const nfd = nfc.normalize("NFD");
    expect(countSyllables(nfd)).toBe(countSyllables(nfc));
  });
});

describe("countSyllables — edge cases", () => {
  it("an empty string has 0 syllables", () => {
    expect(countSyllables("")).toBe(0);
  });

  it("a lowercase consonant-only fragment (no vowel) has a floor of 1 syllable", () => {
    expect(countSyllables("pfft")).toBe(1);
  });
});

describe("countSyllables — determinism", () => {
  it("repeated runs always produce the same result", () => {
    const word = "extraordinariamente";
    const r1 = countSyllables(word);
    const r2 = countSyllables(word);
    expect(r2).toBe(r1);
  });
});
