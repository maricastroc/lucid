import { describe, expect, it } from "vitest";
import { normalize } from "../src/lucid/core/document/normalize";
import { segmentSentences } from "../src/lucid/core/document/segment-sentences";
import { attachTokens, tokenize } from "../src/lucid/core/document/tokenize";
import { buildDocument } from "../src/lucid/core/document/model";

/** Ajuda a comparar apenas o texto + isWord de cada token, ignorando start/end/lower. */
function resumo(source: string) {
  return tokenize(source).map((t) => [t.text, t.isWord] as const);
}

describe("tokenize — texto simples", () => {
  it("tokeniza palavras e pontuação separadamente", () => {
    expect(resumo("O gato subiu no telhado.")).toEqual([
      ["O", true],
      ["gato", true],
      ["subiu", true],
      ["no", true],
      ["telhado", true],
      [".", false],
    ]);
  });

  it("não conta pontuação isolada como palavra", () => {
    const tokens = tokenize("Isso, sim; funciona: bem!");
    const pontuacao = tokens.filter((t) => [",", ";", ":", "!"].includes(t.text));
    expect(pontuacao).toHaveLength(4);
    for (const t of pontuacao) expect(t.isWord).toBe(false);
  });
});

describe("tokenize — Unicode NFC/NFD", () => {
  it("produz o mesmo resultado para entrada NFC e NFD (após normalize)", () => {
    const nfc = "A política é importante para a nação.";
    const nfd = nfc.normalize("NFD");

    const doNfc = tokenize(normalize(nfc)).map((t) => t.text);
    const doNfd = tokenize(normalize(nfd)).map((t) => t.text);

    expect(doNfd).toEqual(doNfc);
  });

  it("mantém palavras acentuadas como um único token", () => {
    expect(resumo("café político não é fácil")).toEqual([
      ["café", true],
      ["político", true],
      ["não", true],
      ["é", true],
      ["fácil", true],
    ]);
  });
});

describe("tokenize — palavras hifenizadas", () => {
  it("mantém hífen interno como parte da palavra", () => {
    expect(resumo("Vimos um guarda-chuva e um arco-íris.")).toEqual([
      ["Vimos", true],
      ["um", true],
      ["guarda-chuva", true],
      ["e", true],
      ["um", true],
      ["arco-íris", true],
      [".", false],
    ]);
  });

  it("hífen solto (sem letra imediatamente depois) não vira parte da palavra", () => {
    const tokens = tokenize("Item - descrição");
    expect(tokens.map((t) => t.text)).toEqual(["Item", "-", "descrição"]);
    expect(tokens[1].isWord).toBe(false);
  });
});

describe("tokenize — apóstrofos", () => {
  it("mantém apóstrofo de elisão como parte da palavra", () => {
    expect(resumo("A água d'água não é a mesma coisa.")).toEqual([
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

  it("apóstrofo usado como aspas de fechamento não mescla com a palavra", () => {
    const tokens = tokenize("Ele disse: 'Isso.'");
    const textos = tokens.map((t) => t.text);
    expect(textos).toEqual(["Ele", "disse", ":", "'", "Isso", ".", "'"]);
    expect(tokens[tokens.length - 1].isWord).toBe(false);
  });
});

describe("tokenize — números inteiros e decimais", () => {
  it("tokeniza número inteiro como um único token, não-palavra", () => {
    const tokens = tokenize("Em 1997 nasceu.");
    const numero = tokens.find((t) => t.text === "1997");
    expect(numero).toBeDefined();
    expect(numero?.isWord).toBe(false);
  });

  it("mantém separador decimal/milhar dentro do número", () => {
    expect(resumo("O produto custa 1.234,56 reais.")).toEqual([
      ["O", true],
      ["produto", true],
      ["custa", true],
      ["1.234,56", false],
      ["reais", true],
      [".", false],
    ]);
  });

  it("não confunde ponto final de frase com separador decimal", () => {
    const tokens = tokenize("Chegaram 42. Foram embora depois.");
    expect(tokens.map((t) => t.text)).toEqual(["Chegaram", "42", ".", "Foram", "embora", "depois", "."]);
  });
});

describe("tokenize — siglas e abreviações", () => {
  it("mescla sigla grudada por pontos em um único token", () => {
    const tokens = tokenize("Nós moramos nos E.U.A. hoje.");
    const sigla = tokens.find((t) => t.text.startsWith("E."));
    expect(sigla?.text).toBe("E.U.A");
    expect(sigla?.isWord).toBe(true);
  });

  it("iniciais separadas por espaço NÃO mesclam (cada uma é um token de 1 letra)", () => {
    const tokens = tokenize("J. K. Rowling escreveu.");
    expect(tokens.map((t) => t.text)).toEqual(["J", ".", "K", ".", "Rowling", "escreveu", "."]);
  });

  it("abreviação multiletra fica separada da pontuação (Sr., art., p.ex.)", () => {
    expect(resumo("O Sr. chegou. Conforme o art. 5, tudo bem, p.ex. isso.")).toEqual([
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

  it("sigla sem pontos internos é um token de palavra normal", () => {
    expect(resumo("A ONU e a UNESCO.")).toEqual([
      ["A", true],
      ["ONU", true],
      ["e", true],
      ["a", true],
      ["UNESCO", true],
      [".", false],
    ]);
  });
});

describe("tokenize — URLs e e-mails", () => {
  it("tokeniza URL com http/https como um único token, não-palavra", () => {
    const tokens = tokenize("Veja em https://exemplo.com/pagina. Isso é importante.");
    const url = tokens.find((t) => t.text.startsWith("http"));
    expect(url?.text).toBe("https://exemplo.com/pagina");
    expect(url?.isWord).toBe(false);
    // o ponto final da frase continua separado, não foi engolido pela URL:
    expect(tokens.map((t) => t.text)).toContain(".");
  });

  it("tokeniza URL www. sem esquema como um único token", () => {
    const tokens = tokenize("Acesse www.exemplo.com.br agora.");
    const url = tokens.find((t) => t.text.startsWith("www."));
    expect(url?.text).toBe("www.exemplo.com.br");
    expect(url?.isWord).toBe(false);
  });

  it("tokeniza e-mail como um único token, não-palavra", () => {
    const tokens = tokenize("Escreva para contato@exemplo.com.br para saber mais.");
    const email = tokens.find((t) => t.text.includes("@"));
    expect(email?.text).toBe("contato@exemplo.com.br");
    expect(email?.isWord).toBe(false);
  });

  it("não inclui pontuação de fim de frase dentro da URL/e-mail", () => {
    const tokens = tokenize("Isso está em https://exemplo.com. Confirme.");
    const url = tokens.find((t) => t.text.startsWith("http"));
    expect(url?.text).toBe("https://exemplo.com");
    const indiceUrl = tokens.indexOf(url!);
    expect(tokens[indiceUrl + 1].text).toBe(".");
  });
});

describe("tokenize — espaços e quebras de linha", () => {
  it("não gera tokens para espaços múltiplos nem quebras de linha", () => {
    const tokens = tokenize("Frase   um.\n\nFrase\tdois.");
    expect(tokens.map((t) => t.text)).toEqual(["Frase", "um", ".", "Frase", "dois", "."]);
  });
});

describe("tokenize — offsets exatos", () => {
  it("start/end reconstroem exatamente o texto de cada token", () => {
    const source = "O café custa 12,50 reais, ok?";
    const tokens = tokenize(source);
    expect(tokens.length).toBeGreaterThan(0);
    for (const t of tokens) {
      expect(source.slice(t.start, t.end)).toBe(t.text);
    }
  });

  it("offsets específicos de um token no meio do texto", () => {
    const source = "Frase inicial aqui.";
    const tokens = tokenize(source);
    const inicial = tokens.find((t) => t.text === "inicial")!;
    expect(inicial.start).toBe(6);
    expect(inicial.end).toBe(13);
    expect(source.slice(inicial.start, inicial.end)).toBe("inicial");
  });
});

describe("attachTokens / Document — contagem por frase e total", () => {
  it("preenche Sentence.tokens e Sentence.wordCount corretamente", () => {
    const source = "O gato subiu. O cachorro correu muito rápido.";
    const sentencas = segmentSentences(source);
    const tokens = tokenize(source);
    const comTokens = attachTokens(sentencas, tokens);

    expect(comTokens).toHaveLength(2);
    expect(comTokens[0].wordCount).toBe(3); // O, gato, subiu
    expect(comTokens[1].wordCount).toBe(5); // O, cachorro, correu, muito, rápido

    for (const s of comTokens) {
      for (const t of s.tokens) {
        expect(t.start).toBeGreaterThanOrEqual(s.start);
        expect(t.end).toBeLessThanOrEqual(s.end);
      }
    }
  });

  it("wordCount não conta pontuação nem números", () => {
    const source = "Chegaram 42 pessoas hoje.";
    const sentencas = attachTokens(segmentSentences(source), tokenize(source));
    expect(sentencas[0].wordCount).toBe(3); // Chegaram, pessoas, hoje (42 não conta)
  });

  it("Document.tokens contém a soma de todos os tokens de todas as frases", () => {
    const source = "Primeira frase aqui. Segunda frase, maior, também aqui!";
    const doc = buildDocument(source);

    const totalNasFrases = doc.sentences.reduce((acc, s) => acc + s.tokens.length, 0);
    expect(doc.tokens.length).toBe(totalNasFrases);

    const totalPalavras = doc.sentences.reduce((acc, s) => acc + s.wordCount, 0);
    const totalPalavrasNoDoc = doc.tokens.filter((t) => t.isWord).length;
    expect(totalPalavras).toBe(totalPalavrasNoDoc);
  });
});

describe("tokenize/attachTokens — determinismo (execução repetida byte-idêntica)", () => {
  it("mesma entrada produz sempre a mesma saída de tokenize", () => {
    const source =
      "O Sr. Dr. João A. Silva, nascido em 1.234, escreveu para contato@exemplo.com.br. " +
      "Veja https://exemplo.com/pagina. Isso é ótimo!";

    const primeira = JSON.stringify(tokenize(source));
    const segunda = JSON.stringify(tokenize(source));
    expect(segunda).toBe(primeira);
  });

  it("buildDocument (com tokens) é determinístico ponta a ponta", () => {
    const source = "Texto de teste. Com duas frases, números 1.234,56 e um e-mail a@b.com!";
    const doc1 = JSON.stringify(buildDocument(source));
    const doc2 = JSON.stringify(buildDocument(source));
    expect(doc2).toBe(doc1);
  });
});
