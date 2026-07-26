import { describe, expect, it } from "vitest";
import { normalize } from "../src/lucid/core/document/normalize";
import { segmentSentences } from "./support/pt";
import { attachTokens, tokenize } from "../src/lucid/core/document/tokenize";
import { buildDocument } from "./support/pt";
import type { Sentence, Token } from "../src/lucid/core/types";

function summary(source: string) {
  return tokenize(source).map((t) => [t.text, t.isWord] as const);
}

function attachTokensNaive(sentences: readonly Sentence[], tokens: readonly Token[]): Sentence[] {
  return sentences.map((sentence) => {
    const sentenceTokens = tokens.filter((t) => t.start >= sentence.start && t.end <= sentence.end);
    const wordCount = sentenceTokens.reduce((total, t) => total + (t.isWord ? 1 : 0), 0);
    return { ...sentence, tokens: sentenceTokens, wordCount };
  });
}

describe("attachTokens — the O(n) merge-walk matches the naive filter (F10)", () => {
  const cases = [
    "O gato subiu. O cachorro latiu forte demais. As crianças riram.",
    'Ele disse: "Já chega." Todos concordaram, e foram embora sem pressa.',
    "Visite www.exemplo.com. Depois, escreva para a@b.com em 30 dias.",
    "Custa 1.234,56 reais! Sério? Sim... foi caro para o E.U.A.",
    "   \n\n  Uma frase só, com espaços estranhos   e quebras.\n\nOutra aqui.  ",
    "",
    "Sem pontuação final e sem nada terminando a frase",
  ];
  it.each(cases)("same output (tokens + wordCount) for: %s", (text) => {
    const source = normalize(text);
    const tokens = tokenize(source);
    const sentences = segmentSentences(source);
    expect(attachTokens(sentences, tokens)).toEqual(attachTokensNaive(sentences, tokens));
  });
});

describe("tokenize — plain text", () => {
  it("tokenizes words and punctuation separately", () => {
    expect(summary("O gato subiu no telhado.")).toEqual([
      ["O", true],
      ["gato", true],
      ["subiu", true],
      ["no", true],
      ["telhado", true],
      [".", false],
    ]);
  });

  it("does not count standalone punctuation as a word", () => {
    const tokens = tokenize("Isso, sim; funciona: bem!");
    const punctuation = tokens.filter((t) => [",", ";", ":", "!"].includes(t.text));
    expect(punctuation).toHaveLength(4);
    for (const t of punctuation) expect(t.isWord).toBe(false);
  });
});

describe("tokenize — Unicode NFC/NFD", () => {
  it("produces the same result for NFC and NFD input (after normalize)", () => {
    const nfc = "A política é importante para a nação.";
    const nfd = nfc.normalize("NFD");

    const fromNfc = tokenize(normalize(nfc)).map((t) => t.text);
    const fromNfd = tokenize(normalize(nfd)).map((t) => t.text);

    expect(fromNfd).toEqual(fromNfc);
  });

  it("keeps accented words as a single token", () => {
    expect(summary("café político não é fácil")).toEqual([
      ["café", true],
      ["político", true],
      ["não", true],
      ["é", true],
      ["fácil", true],
    ]);
  });
});

describe("tokenize — hyphenated words", () => {
  it("keeps an internal hyphen as part of the word", () => {
    expect(summary("Vimos um guarda-chuva e um arco-íris.")).toEqual([
      ["Vimos", true],
      ["um", true],
      ["guarda-chuva", true],
      ["e", true],
      ["um", true],
      ["arco-íris", true],
      [".", false],
    ]);
  });

  it("a loose hyphen (no letter right after it) does not become part of the word", () => {
    const tokens = tokenize("Item - descrição");
    expect(tokens.map((t) => t.text)).toEqual(["Item", "-", "descrição"]);
    expect(tokens[1].isWord).toBe(false);
  });
});

describe("tokenize — apostrophes", () => {
  it("keeps an elision apostrophe as part of the word", () => {
    expect(summary("A água d'água não é a mesma coisa.")).toEqual([
      ["A", true],
      ["água", true],
      ["d'água", true],
      ["não", true],
      ["é", true],
      ["a", true],
      ["mesma", true],
      ["coisa", true],
      [".", false],
    ]);
  });

  it("an apostrophe used as a closing quote does not merge with the word", () => {
    const tokens = tokenize("Ele disse: 'Isso.'");
    const texts = tokens.map((t) => t.text);
    expect(texts).toEqual(["Ele", "disse", ":", "'", "Isso", ".", "'"]);
    expect(tokens[tokens.length - 1].isWord).toBe(false);
  });
});

describe("tokenize — integers and decimals", () => {
  it("tokenizes an integer as a single, non-word token", () => {
    const tokens = tokenize("Em 1997 nasceu.");
    const number = tokens.find((t) => t.text === "1997");
    expect(number).toBeDefined();
    expect(number?.isWord).toBe(false);
  });

  it("keeps the decimal/thousands separator inside the number", () => {
    expect(summary("O produto custa 1.234,56 reais.")).toEqual([
      ["O", true],
      ["produto", true],
      ["custa", true],
      ["1.234,56", false],
      ["reais", true],
      [".", false],
    ]);
  });

  it("does not confuse a sentence-final period with a decimal separator", () => {
    const tokens = tokenize("Chegaram 42. Foram embora depois.");
    expect(tokens.map((t) => t.text)).toEqual(["Chegaram", "42", ".", "Foram", "embora", "depois", "."]);
  });
});

describe("tokenize — acronyms and abbreviations", () => {
  it("merges an acronym joined by periods into a single token", () => {
    const tokens = tokenize("Nós moramos nos E.U.A. hoje.");
    const acronym = tokens.find((t) => t.text.startsWith("E."));
    expect(acronym?.text).toBe("E.U.A");
    expect(acronym?.isWord).toBe(true);
  });

  it("initials separated by a space do NOT merge (each is a 1-letter token)", () => {
    const tokens = tokenize("J. K. Rowling escreveu.");
    expect(tokens.map((t) => t.text)).toEqual(["J", ".", "K", ".", "Rowling", "escreveu", "."]);
  });

  it("a multi-letter abbreviation stays separate from its punctuation (Sr., art., p.ex.)", () => {
    expect(summary("O Sr. chegou. Conforme o art. 5, tudo bem, p.ex. isso.")).toEqual([
      ["O", true],
      ["Sr", true],
      [".", false],
      ["chegou", true],
      [".", false],
      ["Conforme", true],
      ["o", true],
      ["art", true],
      [".", false],
      ["5", false],
      [",", false],
      ["tudo", true],
      ["bem", true],
      [",", false],
      ["p", true],
      [".", false],
      ["ex", true],
      [".", false],
      ["isso", true],
      [".", false],
    ]);
  });

  it("an acronym with no internal periods is an ordinary word token", () => {
    expect(summary("A ONU e a UNESCO.")).toEqual([
      ["A", true],
      ["ONU", true],
      ["e", true],
      ["a", true],
      ["UNESCO", true],
      [".", false],
    ]);
  });
});

describe("tokenize — URLs and e-mails", () => {
  it("tokenizes an http/https URL as a single, non-word token", () => {
    const tokens = tokenize("Veja em https://exemplo.com/pagina. Isso é importante.");
    const url = tokens.find((t) => t.text.startsWith("http"));
    expect(url?.text).toBe("https://exemplo.com/pagina");
    expect(url?.isWord).toBe(false);
    expect(tokens.map((t) => t.text)).toContain(".");
  });

  it("tokenizes a schemeless www. URL as a single token", () => {
    const tokens = tokenize("Acesse www.exemplo.com.br agora.");
    const url = tokens.find((t) => t.text.startsWith("www."));
    expect(url?.text).toBe("www.exemplo.com.br");
    expect(url?.isWord).toBe(false);
  });

  it("tokenizes an e-mail as a single, non-word token", () => {
    const tokens = tokenize("Escreva para contato@exemplo.com.br para saber mais.");
    const email = tokens.find((t) => t.text.includes("@"));
    expect(email?.text).toBe("contato@exemplo.com.br");
    expect(email?.isWord).toBe(false);
  });

  it("does not swallow sentence-final punctuation into the URL/e-mail", () => {
    const tokens = tokenize("Isso está em https://exemplo.com. Confirme.");
    const url = tokens.find((t) => t.text.startsWith("http"));
    expect(url?.text).toBe("https://exemplo.com");
    const urlIndex = tokens.indexOf(url!);
    expect(tokens[urlIndex + 1].text).toBe(".");
  });
});

describe("tokenize — spaces and line breaks", () => {
  it("produces no token for repeated spaces or line breaks", () => {
    const tokens = tokenize("Frase   um.\n\nFrase\tdois.");
    expect(tokens.map((t) => t.text)).toEqual(["Frase", "um", ".", "Frase", "dois", "."]);
  });
});

describe("tokenize — exact offsets", () => {
  it("start/end reconstruct each token's text exactly", () => {
    const source = "O café custa 12,50 reais, ok?";
    const tokens = tokenize(source);
    expect(tokens.length).toBeGreaterThan(0);
    for (const t of tokens) {
      expect(source.slice(t.start, t.end)).toBe(t.text);
    }
  });

  it("specific offsets for a token in the middle of the text", () => {
    const source = "Frase inicial aqui.";
    const tokens = tokenize(source);
    const middle = tokens.find((t) => t.text === "inicial")!;
    expect(middle.start).toBe(6);
    expect(middle.end).toBe(13);
    expect(source.slice(middle.start, middle.end)).toBe("inicial");
  });
});

describe("attachTokens / Document — per-sentence and total counts", () => {
  it("fills Sentence.tokens and Sentence.wordCount correctly", () => {
    const source = "O gato subiu. O cachorro correu muito rápido.";
    const sentences = segmentSentences(source);
    const tokens = tokenize(source);
    const withTokens = attachTokens(sentences, tokens);

    expect(withTokens).toHaveLength(2);
    expect(withTokens[0].wordCount).toBe(3);
    expect(withTokens[1].wordCount).toBe(5);

    for (const s of withTokens) {
      for (const t of s.tokens) {
        expect(t.start).toBeGreaterThanOrEqual(s.start);
        expect(t.end).toBeLessThanOrEqual(s.end);
      }
    }
  });

  it("wordCount counts neither punctuation nor numbers", () => {
    const source = "Chegaram 42 pessoas hoje.";
    const sentences = attachTokens(segmentSentences(source), tokenize(source));
    expect(sentences[0].wordCount).toBe(3);
  });

  it("Document.tokens holds the sum of all tokens across all sentences", () => {
    const source = "Primeira frase aqui. Segunda frase, maior, também aqui!";
    const doc = buildDocument(source);

    const totalInSentences = doc.sentences.reduce((acc, s) => acc + s.tokens.length, 0);
    expect(doc.tokens.length).toBe(totalInSentences);

    const totalWords = doc.sentences.reduce((acc, s) => acc + s.wordCount, 0);
    const totalWordsInDoc = doc.tokens.filter((t) => t.isWord).length;
    expect(totalWords).toBe(totalWordsInDoc);
  });
});

describe("tokenize/attachTokens — determinism (byte-identical on repeated runs)", () => {
  it("the same input always produces the same tokenize output", () => {
    const source =
      "O Sr. Dr. João A. Silva, nascido em 1.234, escreveu para contato@exemplo.com.br. " +
      "Veja https://exemplo.com/pagina. Isso é ótimo!";

    const first = JSON.stringify(tokenize(source));
    const second = JSON.stringify(tokenize(source));
    expect(second).toBe(first);
  });

  it("buildDocument (with tokens) is deterministic end to end", () => {
    const source = "Texto de teste. Com duas frases, números 1.234,56 e um e-mail a@b.com!";
    const doc1 = JSON.stringify(buildDocument(source));
    const doc2 = JSON.stringify(buildDocument(source));
    expect(doc2).toBe(doc1);
  });
});
