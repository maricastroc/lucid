import { describe, expect, it } from "vitest";
import { normalize } from "../src/lucid/core/document/normalize";
import { segmentSentences } from "./support/pt";
import { buildDocument } from "./support/pt";

function texts(source: string): string[] {
  return segmentSentences(source).map((s) => s.text);
}

describe("normalize", () => {
  it("normalizes to NFC", () => {
    const decomposed = "café";
    const composed = "café";
    expect(normalize(decomposed)).toBe(composed);
    expect(normalize(decomposed)).toBe(normalize(composed));
  });

  it("is idempotent and leaves text already in NFC unchanged", () => {
    const text = "Isso é um teste simples.";
    expect(normalize(text)).toBe(text);
  });
});

describe("segmentSentences — plain text with several sentences", () => {
  it("splits sentences ending in a full stop", () => {
    const source = "O gato subiu no telhado. O cachorro latiu forte. As crianças riram muito.";
    expect(texts(source)).toEqual(["O gato subiu no telhado.", "O cachorro latiu forte.", "As crianças riram muito."]);
  });

  it("splits sentences ending in a question or exclamation mark", () => {
    const source = "Você viu isso? Que susto! Foi rápido demais.";
    expect(texts(source)).toEqual(["Você viu isso?", "Que susto!", "Foi rápido demais."]);
  });
});

describe("segmentSentences — common PT-BR abbreviations", () => {
  it("does not break after honorifics", () => {
    const source = "O Sr. Silva chegou cedo. A Sra. Souza já estava lá.";
    expect(texts(source)).toEqual(["O Sr. Silva chegou cedo.", "A Sra. Souza já estava lá."]);
  });

  it("does not break after legal/administrative abbreviations", () => {
    const source = "Conforme o art. 5 da lei, isso é permitido. O inc. II trata de exceções.";
    expect(texts(source)).toEqual(["Conforme o art. 5 da lei, isso é permitido.", "O inc. II trata de exceções."]);
  });

  it("does not break on a compound abbreviation (p.ex.)", () => {
    const source = "Alguns animais, p.ex. o gato e o cão, são domésticos. Outros não são.";
    expect(texts(source)).toEqual(["Alguns animais, p.ex. o gato e o cão, são domésticos.", "Outros não são."]);
  });

  it("does not break after etc.", () => {
    const source = "Compramos frutas, verduras, etc. Voltamos cedo para casa.";
    expect(texts(source)).toEqual(["Compramos frutas, verduras, etc. Voltamos cedo para casa."]);
  });

  it("does not break on reference/figure/case abbreviations followed by a capital or a digit", () => {
    expect(texts("Veja a Fig. 3 do relatório. Ela mostra os dados.")).toEqual([
      "Veja a Fig. 3 do relatório.",
      "Ela mostra os dados.",
    ]);
    expect(texts("A Tab. 2 resume os valores.")).toEqual(["A Tab. 2 resume os valores."]);
    expect(texts("Fulano vs. Beltrano foi julgado.")).toEqual(["Fulano vs. Beltrano foi julgado."]);
    expect(texts("Obs. Os prazos podem mudar sem aviso.")).toEqual(["Obs. Os prazos podem mudar sem aviso."]);
    expect(texts("Conforme o proc. 123 foi decidido.")).toEqual(["Conforme o proc. 123 foi decidido."]);
    expect(texts("Veja o séc. XX na história.")).toEqual(["Veja o séc. XX na história."]);
  });
});

describe("segmentSentences — units of measure close a sentence (A-2)", () => {
  it("a unit glued to the number closes the sentence", () => {
    expect(texts("A sessão abre às 9h. O público deve chegar antes.")).toEqual([
      "A sessão abre às 9h.",
      "O público deve chegar antes.",
    ]);
    expect(texts("A prova dura 30min. Depois há um intervalo.")).toEqual([
      "A prova dura 30min.",
      "Depois há um intervalo.",
    ]);
  });

  it("a unit separated from the number by a space also closes the sentence", () => {
    expect(texts("A pista tem 5 km. Corredores completam o percurso.")).toEqual([
      "A pista tem 5 km.",
      "Corredores completam o percurso.",
    ]);
    expect(texts("O peso máximo é de 70 kg. Acima disso há taxa.")).toEqual([
      "O peso máximo é de 70 kg.",
      "Acima disso há taxa.",
    ]);
  });

  it("outside a measurement context, the unit's homograph still blocks the break", () => {
    expect(texts("O valor min. 5 reais será cobrado.")).toEqual(["O valor min. 5 reais será cobrado."]);
    expect(texts("A reunião ocorre seg. 12 de maio no auditório.")).toEqual([
      "A reunião ocorre seg. 12 de maio no auditório.",
    ]);
  });

  it("a proclitic abbreviation preceded by a number is NOT a boundary (a month inside a date)", () => {
    expect(texts("O prazo vence em 12 jan. 2024 conforme o edital.")).toEqual([
      "O prazo vence em 12 jan. 2024 conforme o edital.",
    ]);
  });

  it("the rule allows the boundary but does not force it: a lowercase word after the unit does not split", () => {
    expect(texts("O expediente vai das 9h. às 10h em dias úteis.")).toEqual([
      "O expediente vai das 9h. às 10h em dias úteis.",
    ]);
    expect(texts("A obra tem 5 km. de extensão total.")).toEqual(["A obra tem 5 km. de extensão total."]);
  });

  it("the merge used to corrupt the per-sentence metrics — no longer", () => {
    const doc = buildDocument("A sessão abre às 9h. O público deve chegar antes.");
    expect(doc.sentences).toHaveLength(2);
    expect(doc.sentences.map((s) => s.wordCount)).toEqual([5, 5]);
  });
});

describe("segmentSentences — known limitation: a sentence starting in lowercase (F3)", () => {
  it("period + lowercase does NOT split (it merges the sentences) — documented behavior", () => {
    expect(texts("O prazo venceu à noite. o recurso é cabível.")).toEqual([
      "O prazo venceu à noite. o recurso é cabível.",
    ]);
  });
});

describe("segmentSentences — decimal numbers", () => {
  it("does not break on a decimal point or a thousands separator", () => {
    const source = "O produto custa 1.234,56 reais. O outro custa 2.99 reais.";
    expect(texts(source)).toEqual(["O produto custa 1.234,56 reais.", "O outro custa 2.99 reais."]);
  });
});

describe("segmentSentences — acronyms and initials", () => {
  it("does not break on every period of an acronym with internal periods", () => {
    const source = "Nós moramos nos E.U.A. Eles moram na França.";
    expect(texts(source)).toEqual(["Nós moramos nos E.U.A. Eles moram na França."]);
  });

  it("does not break between the initials of a name", () => {
    const source = "J. K. Rowling escreveu o livro. Ele foi publicado em 1997.";
    expect(texts(source)).toEqual(["J. K. Rowling escreveu o livro.", "Ele foi publicado em 1997."]);
  });

  it("an acronym with no internal periods is unaffected by the initials rule", () => {
    const source = "A ONU e a UNESCO trabalham juntas. Isso é bom.";
    expect(texts(source)).toEqual(["A ONU e a UNESCO trabalham juntas.", "Isso é bom."]);
  });
});

describe("segmentSentences — ellipses", () => {
  it("treats … (a single character) as a sentence closer", () => {
    const source = "Ele pensou bastante… Depois decidiu não ir.";
    expect(texts(source)).toEqual(["Ele pensou bastante…", "Depois decidiu não ir."]);
  });

  it("treats ... (three periods) as a sentence closer", () => {
    const source = "Ele pensou bastante... Depois decidiu não ir.";
    expect(texts(source)).toEqual(["Ele pensou bastante...", "Depois decidiu não ir."]);
  });

  it("does not break when the ellipsis is not followed by a space + capital/digit", () => {
    const source = "Era uma vez... uma história muito antiga.";
    expect(texts(source)).toEqual(["Era uma vez... uma história muito antiga."]);
  });
});

describe("segmentSentences — punctuation followed by a quote or parenthesis", () => {
  it("closes the sentence when the period comes before the closing quote", () => {
    const source = 'Ela disse: "Já chega." Todos concordaram.';
    expect(texts(source)).toEqual(['Ela disse: "Já chega."', "Todos concordaram."]);
  });

  it("closes the sentence when the period comes before the closing parenthesis", () => {
    const source = "Isso foi decidido em reunião (ata anexa.) Nada mais foi tratado.";
    expect(texts(source)).toEqual(["Isso foi decidido em reunião (ata anexa.)", "Nada mais foi tratado."]);
  });

  it("absorbs a question-plus-exclamation combination", () => {
    const source = "Você fez o quê?! Não acredito nisso.";
    expect(texts(source)).toEqual(["Você fez o quê?!", "Não acredito nisso."]);
  });

  it("closes the sentence before every closing mark, not just the straight quote (ADR-075)", () => {
    expect(texts("Ela disse: 'Já chega.' Todos concordaram.")).toEqual([
      "Ela disse: 'Já chega.'",
      "Todos concordaram.",
    ]);
    expect(texts("Ela disse: “Já chega.” Todos concordaram.")).toEqual([
      "Ela disse: “Já chega.”",
      "Todos concordaram.",
    ]);
    expect(texts("Ela disse: ‘Já chega.’ Todos concordaram.")).toEqual([
      "Ela disse: ‘Já chega.’",
      "Todos concordaram.",
    ]);
    expect(texts("Ela disse: «Já chega.» Todos concordaram.")).toEqual([
      "Ela disse: «Já chega.»",
      "Todos concordaram.",
    ]);
    expect(texts("Ver o anexo [ata anexa.] Nada mais foi tratado.")).toEqual([
      "Ver o anexo [ata anexa.]",
      "Nada mais foi tratado.",
    ]);
  });
});

describe("segmentSentences — the next sentence opens with a quote or bracket (ADR-075)", () => {
  it("an opening mark confirms the boundary just like a capital letter would", () => {
    expect(texts('O prazo terminou. "Vamos recorrer", disse o advogado.')).toEqual([
      "O prazo terminou.",
      '"Vamos recorrer", disse o advogado.',
    ]);
    expect(texts("O prazo terminou. “Vamos recorrer”, disse o advogado.")).toEqual([
      "O prazo terminou.",
      "“Vamos recorrer”, disse o advogado.",
    ]);
    expect(texts("O prazo terminou. 'Vamos recorrer', disse o advogado.")).toEqual([
      "O prazo terminou.",
      "'Vamos recorrer', disse o advogado.",
    ]);
    expect(texts("O prazo terminou. «Vamos recorrer», disse o advogado.")).toEqual([
      "O prazo terminou.",
      "«Vamos recorrer», disse o advogado.",
    ]);
    expect(texts("A regra mudou. (A anterior foi revogada.)")).toEqual([
      "A regra mudou.",
      "(A anterior foi revogada.)",
    ]);
    expect(texts("A regra mudou. [Ver a nota do editor.]")).toEqual(["A regra mudou.", "[Ver a nota do editor.]"]);
  });

  it("without the space, the opening mark does NOT confirm — same rule as F3", () => {
    expect(texts("O prazo terminou.“Vamos recorrer”, disse ele.")).toEqual([
      "O prazo terminou.“Vamos recorrer”, disse ele.",
    ]);
    expect(texts("O prazo terminou.O pedido foi negado.")).toEqual(["O prazo terminou.O pedido foi negado."]);
  });

  it("an unconfirmed boundary does not abort the scan — later boundaries still land", () => {
    expect(texts("O prazo terminou.O pedido foi negado. Depois houve recurso.")).toEqual([
      "O prazo terminou.O pedido foi negado.",
      "Depois houve recurso.",
    ]);
    expect(texts("O prazo terminou.O pedido foi negado.\n\nOutro trecho começa aqui.")).toEqual([
      "O prazo terminou.O pedido foi negado.",
      "Outro trecho começa aqui.",
    ]);
  });
});

describe("segmentSentences — the digit rule protects a decimal, not any digit near a period (ADR-075)", () => {
  it("only a digit on BOTH sides suppresses the boundary", () => {
    expect(texts("O valor de R$ 1.500,00 foi pago hoje.")).toEqual(["O valor de R$ 1.500,00 foi pago hoje."]);
    expect(texts("Veja o item 1. O segundo vem depois.")).toEqual(["Veja o item 1.", "O segundo vem depois."]);
    expect(texts("O total foi de mil. 500 pessoas vieram.")).toEqual(["O total foi de mil.", "500 pessoas vieram."]);
  });
});

describe("segmentSentences — a sentence ending in a proper noun (ADR-075)", () => {
  it("the single-initial guard does not swallow a capitalized full word", () => {
    expect(texts("O processo foi julgado pelo juiz Silva. O réu recorreu.")).toEqual([
      "O processo foi julgado pelo juiz Silva.",
      "O réu recorreu.",
    ]);
  });
});

describe("segmentSentences — an unconfirmed !/?/… is not a boundary either (ADR-075)", () => {
  it("an exclamation followed by a lowercase word keeps a single sentence", () => {
    expect(texts("Ele gritou! e saiu correndo.")).toEqual(["Ele gritou! e saiu correndo."]);
  });
});

describe("segmentSentences — line breaks", () => {
  it("does not break a sentence just because of a line break with no punctuation", () => {
    const source = "Isso é uma frase\nque continua na linha de baixo.";
    expect(texts(source)).toEqual(["Isso é uma frase\nque continua na linha de baixo."]);
  });

  it("treats a line break after punctuation as a mere space between sentences", () => {
    const source = "Primeira frase.\nSegunda frase.\n\nTerceira frase.";
    expect(texts(source)).toEqual(["Primeira frase.", "Segunda frase.", "Terceira frase."]);
  });

  it("ignores blank lines (it produces no empty sentences)", () => {
    const source = "\n\n  Primeira frase.  \n\n\n";
    const sentences = segmentSentences(source);
    expect(sentences.map((s) => s.text)).toEqual(["Primeira frase."]);
  });
});

describe("segmentSentences — a blank line closes a sentence even with no punctuation (ADR-073)", () => {
  it("an unpunctuated title above its body no longer merges into it", () => {
    const source = "Prazos e documentos\n\nO interessado deve entregar os documentos.";
    expect(texts(source)).toEqual(["Prazos e documentos", "O interessado deve entregar os documentos."]);
  });

  it("the rule does not depend on the next line starting with a capital", () => {
    const source = "Prazos e documentos\n\nos documentos vão para a secretaria.";
    expect(texts(source)).toEqual(["Prazos e documentos", "os documentos vão para a secretaria."]);
  });

  it("spaces and tabs inside the blank line still make it blank", () => {
    expect(texts("Título aqui\n \t \nCorpo do texto.")).toEqual(["Título aqui", "Corpo do texto."]);
    expect(texts("Título aqui\n\r\nCorpo do texto.")).toEqual(["Título aqui", "Corpo do texto."]);
  });

  it("several blank lines in a row close one sentence, not several empty ones", () => {
    expect(texts("Título\n\n\n\nCorpo.")).toEqual(["Título", "Corpo."]);
  });

  it("a LONE line break is still not a boundary — it wraps as often as it ends", () => {
    expect(texts("Prazos e documentos\nO interessado deve entregar.")).toEqual([
      "Prazos e documentos\nO interessado deve entregar.",
    ]);
  });

  it("a line break followed by indentation is a wrap, not a blank line (ADR-075)", () => {
    expect(texts("Prazos e documentos\n   O interessado deve entregar.")).toEqual([
      "Prazos e documentos\n   O interessado deve entregar.",
    ]);
  });

  it("the boundary coincides with an existing punctuation boundary without splitting twice", () => {
    expect(texts("Primeira frase.\n\nSegunda frase.")).toEqual(["Primeira frase.", "Segunda frase."]);
  });

  it("offsets still reconstruct, and the blank line belongs to no sentence", () => {
    const source = "Prazos e documentos\n\nO interessado deve entregar os documentos.";
    const sentences = segmentSentences(source);
    for (const s of sentences) expect(source.slice(s.start, s.end)).toBe(s.text);
    expect(sentences[0]).toMatchObject({ start: 0, end: 19 });
    expect(sentences[1].start).toBe(21);
  });
});

describe("segmentSentences — text with no final punctuation", () => {
  it("closes the last sentence at the end of the text even with no punctuation", () => {
    const source = "Primeira frase. Segunda frase sem ponto no final";
    expect(texts(source)).toEqual(["Primeira frase.", "Segunda frase sem ponto no final"]);
  });

  it("a whole text with no punctuation at all becomes a single sentence", () => {
    const source = "isso aqui é só um pedaço de texto solto sem pontuação nenhuma";
    expect(texts(source)).toEqual([source]);
  });

  it("trailing whitespace is trimmed off the unpunctuated last sentence (ADR-075)", () => {
    const sentences = segmentSentences("Prazos e documentos   ");
    expect(sentences.map((s) => s.text)).toEqual(["Prazos e documentos"]);
    expect(sentences[0]).toMatchObject({ start: 0, end: 19 });
  });

  it("segmentSentences leaves tokens empty — attachTokens fills them later (ADR-075)", () => {
    expect(segmentSentences("O prazo terminou.")[0].tokens).toEqual([]);
  });
});

describe("segmentSentences — Unicode in composed and decomposed form", () => {
  it("produces the same result for equivalent NFC and NFD text (after normalize)", () => {
    const nfc = "A decisão está pública. Ninguém vai contestá-la.";
    const nfd = nfc.normalize("NFD");

    const resultNfc = segmentSentences(normalize(nfc));
    const resultNfd = segmentSentences(normalize(nfd));

    expect(resultNfd.map((s) => s.text)).toEqual(resultNfc.map((s) => s.text));
  });

  it("buildDocument normalizes the input before segmenting", () => {
    const nfd = "Está em conformidade com a nova política.".normalize("NFD");
    const doc = buildDocument(nfd);
    expect(doc.source).toBe(doc.source.normalize("NFC"));
    expect(doc.sentences.map((s) => s.text)).toEqual(["Está em conformidade com a nova política."]);
  });
});

describe("segmentSentences — exact offsets for each sentence", () => {
  it("start/end reconstruct each sentence's text exactly (I3)", () => {
    const source = "Primeira frase aqui. Segunda frase, um pouco maior, também aqui! E a terceira?";
    const sentences = segmentSentences(source);

    expect(sentences).toHaveLength(3);
    for (const sentence of sentences) {
      expect(source.slice(sentence.start, sentence.end)).toBe(sentence.text);
    }

    expect(sentences[0]).toMatchObject({ start: 0, end: 20, text: "Primeira frase aqui." });
    expect(sentences[1]).toMatchObject({
      start: 21,
      end: 64,
      text: "Segunda frase, um pouco maior, também aqui!",
    });
    expect(sentences[2]).toMatchObject({ start: 65, end: 78, text: "E a terceira?" });
  });

  it("offsets skip spaces/line breaks between sentences (they belong to none)", () => {
    const source = "Frase um.   \n   Frase dois.";
    const sentences = segmentSentences(source);
    expect(sentences[0]).toMatchObject({ start: 0, end: 9, text: "Frase um." });
    expect(sentences[1].text).toBe("Frase dois.");
    expect(source.slice(sentences[1].start, sentences[1].end)).toBe("Frase dois.");
  });
});

describe("segmentSentences — determinism (byte-identical on repeated runs)", () => {
  it("the same input always produces the same output (byte-identical JSON)", () => {
    const source =
      'O Sr. Dr. João A. Silva, nascido em 1.234, disse: "Isso é ótimo!" Ele riu muito... ' +
      "Depois foi embora.\n\nOutra linha aqui.";

    const first = JSON.stringify(segmentSentences(source));
    const second = JSON.stringify(segmentSentences(source));
    const third = JSON.stringify(segmentSentences(normalize(source)));

    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it("buildDocument is deterministic end to end too", () => {
    const source = "Texto de teste. Com duas frases!";
    const doc1 = JSON.stringify(buildDocument(source));
    const doc2 = JSON.stringify(buildDocument(source));
    expect(doc2).toBe(doc1);
  });
});
