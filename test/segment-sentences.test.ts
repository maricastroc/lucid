import { describe, expect, it } from "vitest";
import { normalize } from "../src/lucid/core/document/normalize";
import { segmentSentences } from "./support/pt";
import { buildDocument } from "./support/pt";

function textos(source: string): string[] {
  return segmentSentences(source).map((s) => s.text);
}

describe("normalize", () => {
  it("normaliza para NFC", () => {
    const decomposto = "café"; 
    const composto = "café";
    expect(normalize(decomposto)).toBe(composto);
    expect(normalize(decomposto)).toBe(normalize(composto));
  });

  it("é idempotente e não muda texto já em NFC", () => {
    const texto = "Isso é um teste simples.";
    expect(normalize(texto)).toBe(texto);
  });
});

describe("segmentSentences — texto simples com várias frases", () => {
  it("separa frases terminadas em ponto final", () => {
    const source = "O gato subiu no telhado. O cachorro latiu forte. As crianças riram muito.";
    expect(textos(source)).toEqual([
      "O gato subiu no telhado.",
      "O cachorro latiu forte.",
      "As crianças riram muito.",
    ]);
  });

  it("separa frases terminadas em interrogação e exclamação", () => {
    const source = "Você viu isso? Que susto! Foi rápido demais.";
    expect(textos(source)).toEqual(["Você viu isso?", "Que susto!", "Foi rápido demais."]);
  });
});

describe("segmentSentences — abreviações comuns em PT-BR", () => {
  it("não quebra depois de formas de tratamento", () => {
    const source = "O Sr. Silva chegou cedo. A Sra. Souza já estava lá.";
    expect(textos(source)).toEqual(["O Sr. Silva chegou cedo.", "A Sra. Souza já estava lá."]);
  });

  it("não quebra depois de abreviações jurídico-administrativas", () => {
    const source = "Conforme o art. 5 da lei, isso é permitido. O inc. II trata de exceções.";
    expect(textos(source)).toEqual([
      "Conforme o art. 5 da lei, isso é permitido.",
      "O inc. II trata de exceções.",
    ]);
  });

  it("não quebra em abreviação composta (p.ex.)", () => {
    const source = "Alguns animais, p.ex. o gato e o cão, são domésticos. Outros não são.";
    expect(textos(source)).toEqual([
      "Alguns animais, p.ex. o gato e o cão, são domésticos.",
      "Outros não são.",
    ]);
  });

  it("não quebra depois de etc.", () => {
    const source = "Compramos frutas, verduras, etc. Voltamos cedo para casa.";
    expect(textos(source)).toEqual(["Compramos frutas, verduras, etc. Voltamos cedo para casa."]);
  });

  it("não quebra em abreviações de referência/figura/processo seguidas de maiúscula ou dígito", () => {
    expect(textos("Veja a Fig. 3 do relatório. Ela mostra os dados.")).toEqual([
      "Veja a Fig. 3 do relatório.",
      "Ela mostra os dados.",
    ]);
    expect(textos("A Tab. 2 resume os valores.")).toEqual(["A Tab. 2 resume os valores."]);
    expect(textos("Fulano vs. Beltrano foi julgado.")).toEqual(["Fulano vs. Beltrano foi julgado."]);
    expect(textos("Obs. Os prazos podem mudar sem aviso.")).toEqual(["Obs. Os prazos podem mudar sem aviso."]);
    expect(textos("Conforme o proc. 123 foi decidido.")).toEqual(["Conforme o proc. 123 foi decidido."]);
    expect(textos("Veja o séc. XX na história.")).toEqual(["Veja o séc. XX na história."]);
  });
});

describe("segmentSentences — unidades de medida encerram frase (A-2)", () => {
  it("unidade colada ao número encerra a frase", () => {
    expect(textos("A sessão abre às 9h. O público deve chegar antes.")).toEqual([
      "A sessão abre às 9h.",
      "O público deve chegar antes.",
    ]);
    expect(textos("A prova dura 30min. Depois há um intervalo.")).toEqual([
      "A prova dura 30min.",
      "Depois há um intervalo.",
    ]);
  });

  it("unidade separada do número por espaço também encerra a frase", () => {
    expect(textos("A pista tem 5 km. Corredores completam o percurso.")).toEqual([
      "A pista tem 5 km.",
      "Corredores completam o percurso.",
    ]);
    expect(textos("O peso máximo é de 70 kg. Acima disso há taxa.")).toEqual([
      "O peso máximo é de 70 kg.",
      "Acima disso há taxa.",
    ]);
  });

  it("fora de contexto de medição, o homógrafo da unidade continua bloqueando", () => {
    expect(textos("O valor min. 5 reais será cobrado.")).toEqual(["O valor min. 5 reais será cobrado."]);
    expect(textos("A reunião ocorre seg. 12 de maio no auditório.")).toEqual([
      "A reunião ocorre seg. 12 de maio no auditório.",
    ]);
  });

  it("abreviação proclítica precedida de número NÃO vira fronteira (mês em data)", () => {
    expect(textos("O prazo vence em 12 jan. 2024 conforme o edital.")).toEqual([
      "O prazo vence em 12 jan. 2024 conforme o edital.",
    ]);
  });

  it("a regra libera a fronteira mas não a força: minúscula depois da unidade não separa", () => {
    expect(textos("O expediente vai das 9h. às 10h em dias úteis.")).toEqual([
      "O expediente vai das 9h. às 10h em dias úteis.",
    ]);
    expect(textos("A obra tem 5 km. de extensão total.")).toEqual(["A obra tem 5 km. de extensão total."]);
  });

  it("a fusão corrompia as métricas por frase — agora não mais", () => {
    const doc = buildDocument("A sessão abre às 9h. O público deve chegar antes.");
    expect(doc.sentences).toHaveLength(2);
    expect(doc.sentences.map((s) => s.wordCount)).toEqual([5, 5]);
  });
});

describe("segmentSentences — limitação conhecida: frase iniciada em minúscula (F3)", () => {
  it("ponto + minúscula NÃO separa (funde as frases) — comportamento documentado", () => {
    expect(textos("O prazo venceu à noite. o recurso é cabível.")).toEqual([
      "O prazo venceu à noite. o recurso é cabível.",
    ]);
  });
});

describe("segmentSentences — números decimais", () => {
  it("não quebra em ponto decimal nem separador de milhar", () => {
    const source = "O produto custa 1.234,56 reais. O outro custa 2.99 reais.";
    expect(textos(source)).toEqual(["O produto custa 1.234,56 reais.", "O outro custa 2.99 reais."]);
  });
});

describe("segmentSentences — siglas e iniciais", () => {
  it("não quebra em cada ponto de uma sigla com pontos internos", () => {
    const source = "Nós moramos nos E.U.A. Eles moram na França.";
    expect(textos(source)).toEqual(["Nós moramos nos E.U.A. Eles moram na França."]);
  });

  it("não quebra entre iniciais de nome", () => {
    const source = "J. K. Rowling escreveu o livro. Ele foi publicado em 1997.";
    expect(textos(source)).toEqual(["J. K. Rowling escreveu o livro.", "Ele foi publicado em 1997."]);
  });

  it("sigla sem pontos internos não é afetada pela regra de iniciais", () => {
    const source = "A ONU e a UNESCO trabalham juntas. Isso é bom.";
    expect(textos(source)).toEqual(["A ONU e a UNESCO trabalham juntas.", "Isso é bom."]);
  });
});

describe("segmentSentences — reticências", () => {
  it("trata … (caractere único) como fechamento de frase", () => {
    const source = "Ele pensou bastante… Depois decidiu não ir.";
    expect(textos(source)).toEqual(["Ele pensou bastante…", "Depois decidiu não ir."]);
  });

  it("trata ... (três pontos) como fechamento de frase", () => {
    const source = "Ele pensou bastante... Depois decidiu não ir.";
    expect(textos(source)).toEqual(["Ele pensou bastante...", "Depois decidiu não ir."]);
  });

  it("não quebra quando reticências não são seguidas de espaço + maiúscula/dígito", () => {
    const source = "Era uma vez... uma história muito antiga.";
    expect(textos(source)).toEqual(["Era uma vez... uma história muito antiga."]);
  });
});

describe("segmentSentences — pontuação seguida de aspas ou parênteses", () => {
  it("fecha frase quando o ponto vem antes do fechamento de aspas", () => {
    const source = 'Ela disse: "Já chega." Todos concordaram.';
    expect(textos(source)).toEqual(['Ela disse: "Já chega."', "Todos concordaram."]);
  });

  it("fecha frase quando o ponto vem antes do fechamento de parênteses", () => {
    const source = "Isso foi decidido em reunião (ata anexa.) Nada mais foi tratado.";
    expect(textos(source)).toEqual(["Isso foi decidido em reunião (ata anexa.)", "Nada mais foi tratado."]);
  });

  it("absorve combinação de interrogação e exclamação", () => {
    const source = "Você fez o quê?! Não acredito nisso.";
    expect(textos(source)).toEqual(["Você fez o quê?!", "Não acredito nisso."]);
  });
});

describe("segmentSentences — quebras de linha", () => {
  it("não quebra frase só por causa de uma quebra de linha sem pontuação", () => {
    const source = "Isso é uma frase\nque continua na linha de baixo.";
    expect(textos(source)).toEqual(["Isso é uma frase\nque continua na linha de baixo."]);
  });

  it("trata quebra de linha após pontuação como mero espaço entre frases", () => {
    const source = "Primeira frase.\nSegunda frase.\n\nTerceira frase.";
    expect(textos(source)).toEqual(["Primeira frase.", "Segunda frase.", "Terceira frase."]);
  });

  it("ignora linhas em branco (não gera frases vazias)", () => {
    const source = "\n\n  Primeira frase.  \n\n\n";
    const sentencas = segmentSentences(source);
    expect(sentencas.map((s) => s.text)).toEqual(["Primeira frase."]);
  });
});

describe("segmentSentences — texto sem pontuação final", () => {
  it("fecha a última frase no fim do texto mesmo sem pontuação", () => {
    const source = "Primeira frase. Segunda frase sem ponto no final";
    expect(textos(source)).toEqual(["Primeira frase.", "Segunda frase sem ponto no final"]);
  });

  it("texto inteiro sem nenhuma pontuação vira uma única frase", () => {
    const source = "isso aqui é só um pedaço de texto solto sem pontuação nenhuma";
    expect(textos(source)).toEqual([source]);
  });
});

describe("segmentSentences — Unicode em forma composta e decomposta", () => {
  it("produz o mesmo resultado para texto NFC e NFD equivalentes (após normalize)", () => {
    const nfc = "A decisão está pública. Ninguém vai contestá-la.";
    const nfd = nfc.normalize("NFD");

    const resultadoNfc = segmentSentences(normalize(nfc));
    const resultadoNfd = segmentSentences(normalize(nfd));

    expect(resultadoNfd.map((s) => s.text)).toEqual(resultadoNfc.map((s) => s.text));
  });

  it("buildDocument normaliza a entrada antes de segmentar", () => {
    const nfd = "Está em conformidade com a nova política.".normalize("NFD");
    const doc = buildDocument(nfd);
    expect(doc.source).toBe(doc.source.normalize("NFC"));
    expect(doc.sentences.map((s) => s.text)).toEqual(["Está em conformidade com a nova política."]);
  });
});

describe("segmentSentences — offsets exatos de cada frase", () => {
  it("start/end reconstroem exatamente o texto de cada frase (I3)", () => {
    const source = "Primeira frase aqui. Segunda frase, um pouco maior, também aqui! E a terceira?";
    const sentencas = segmentSentences(source);

    expect(sentencas).toHaveLength(3);
    for (const sentenca of sentencas) {
      expect(source.slice(sentenca.start, sentenca.end)).toBe(sentenca.text);
    }

    expect(sentencas[0]).toMatchObject({ start: 0, end: 20, text: "Primeira frase aqui." });
    expect(sentencas[1]).toMatchObject({
      start: 21,
      end: 64,
      text: "Segunda frase, um pouco maior, também aqui!",
    });
    expect(sentencas[2]).toMatchObject({ start: 65, end: 78, text: "E a terceira?" });
  });

  it("offsets ignoram espaços/quebras de linha entre frases (não pertencem a nenhuma)", () => {
    const source = "Frase um.   \n   Frase dois.";
    const sentencas = segmentSentences(source);
    expect(sentencas[0]).toMatchObject({ start: 0, end: 9, text: "Frase um." });
    expect(sentencas[1].text).toBe("Frase dois.");
    expect(source.slice(sentencas[1].start, sentencas[1].end)).toBe("Frase dois.");
  });
});

describe("segmentSentences — determinismo (execução repetida byte-idêntica)", () => {
  it("a mesma entrada produz sempre a mesma saída (JSON byte-idêntico)", () => {
    const source =
      "O Sr. Dr. João A. Silva, nascido em 1.234, disse: \"Isso é ótimo!\" Ele riu muito... " +
      "Depois foi embora.\n\nOutra linha aqui.";

    const primeira = JSON.stringify(segmentSentences(source));
    const segunda = JSON.stringify(segmentSentences(source));
    const terceira = JSON.stringify(segmentSentences(normalize(source)));

    expect(segunda).toBe(primeira);
    expect(terceira).toBe(primeira);
  });

  it("buildDocument também é determinístico ponta a ponta", () => {
    const source = "Texto de teste. Com duas frases!";
    const doc1 = JSON.stringify(buildDocument(source));
    const doc2 = JSON.stringify(buildDocument(source));
    expect(doc2).toBe(doc1);
  });
});
