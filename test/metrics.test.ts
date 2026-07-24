import { describe, expect, it } from "vitest";
import { buildDocument } from "./support/pt";
import { runMetrics } from "./support/pt";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

describe("runMetrics — documento vazio", () => {
  it("texto vazio devolve todas as métricas zeradas, sem NaN/Infinity", () => {
    const doc = buildDocument("");
    const metrics = runMetrics(doc);

    expect(metrics).toEqual({
      fleschPt: 0,
      words: 0,
      sentences: 0,
      syllables: 0,
      wordsPerSentence: 0,
      syllablesPerWord: 0,
      cohesion: {
        referentialOverlap: 0,
        adjacentGapRatio: 0,
        connectivesPer100Words: 0,
        connectivesByClass: { additive: 0, adversative: 0, causal: 0, temporal: 0, conclusive: 0 },
      },
    });
  });

  it("texto só com espaços/quebras de linha também zera (sem frases nem palavras)", () => {
    const doc = buildDocument("   \n\n  \t  ");
    const metrics = runMetrics(doc);
    expect(metrics.sentences).toBe(0);
    expect(metrics.words).toBe(0);
    expect(metrics.fleschPt).toBe(0);
  });

  it("texto só com pontuação (sem nenhuma palavra) zera palavras/sílabas sem quebrar", () => {
    const doc = buildDocument("!!! ??? ...");
    const metrics = runMetrics(doc);
    expect(metrics.words).toBe(0);
    expect(metrics.syllables).toBe(0);
    expect(metrics.fleschPt).toBe(0);
    expect(Number.isFinite(metrics.fleschPt)).toBe(true);
  });
});

describe("runMetrics — texto com uma frase", () => {
  it("calcula totais e Flesch-PT para uma única frase", () => {
    const doc = buildDocument("O gato subiu no telhado.");
    const metrics = runMetrics(doc);

    expect(metrics.sentences).toBe(1);
    expect(metrics.words).toBe(5);
    expect(metrics.wordsPerSentence).toBe(5);
    expect(metrics.syllablesPerWord).toBe(metrics.syllables / metrics.words);

    const esperado = 248.835 - 1.015 * (metrics.words / metrics.sentences) - 84.6 * (metrics.syllables / metrics.words);
    expect(metrics.fleschPt).toBeCloseTo(esperado, 1);
  });
});

describe("runMetrics — texto com várias frases", () => {
  it("agrega totais do documento inteiro, não só da última frase", () => {
    const source = "O gato subiu no telhado. O cachorro correu muito rápido pelo jardim ontem.";
    const doc = buildDocument(source);
    const metrics = runMetrics(doc);

    expect(metrics.sentences).toBe(2);
    expect(metrics.words).toBe(doc.tokens.filter((t) => t.isWord).length);
    expect(metrics.wordsPerSentence).toBe(metrics.words / metrics.sentences);
  });

  it("frases mais longas em média reduzem o Flesch-PT em relação a frases curtas", () => {
    const curto = runMetrics(buildDocument("O gato subiu. O cão correu."));
    const longo = runMetrics(
      buildDocument(
        "O gato subiu rapidamente pelo telhado alto da casa vizinha durante a tarde. " +
          "O cão correu atrás dele por muito tempo sem nunca conseguir alcançá-lo.",
      ),
    );
    expect(longo.fleschPt).toBeLessThan(curto.fleschPt);
  });
});

describe("runMetrics — arredondamento na fronteira de saída", () => {
  it("respeita config.metrics.decimalPlaces para os três campos derivados", () => {
    const doc = buildDocument("O gato subiu no telhado. O cachorro correu muito rápido pelo jardim.");

    const comUmaCasa = runMetrics(doc, { ...DEFAULT_CONFIG, metrics: { decimalPlaces: 1 } });
    const comZeroCasas = runMetrics(doc, { ...DEFAULT_CONFIG, metrics: { decimalPlaces: 0 } });
    const comTresCasas = runMetrics(doc, { ...DEFAULT_CONFIG, metrics: { decimalPlaces: 3 } });

    for (const m of [comUmaCasa, comZeroCasas, comTresCasas]) {
      expect(m.words).toBe(comUmaCasa.words);
      expect(m.sentences).toBe(comUmaCasa.sentences);
      expect(m.syllables).toBe(comUmaCasa.syllables);
    }

    expect(Number.isInteger(comZeroCasas.fleschPt)).toBe(true);
    expect(Number.isInteger(comZeroCasas.wordsPerSentence)).toBe(true);
    expect(Number.isInteger(comZeroCasas.syllablesPerWord)).toBe(true);
  });

  it("nenhum float bruto vaza para o JSON — casas decimais respeitam o limite configurado", () => {
    const doc = buildDocument("O gato subiu rapidamente pelo telhado da casa vizinha durante a tarde de domingo.");
    const metrics = runMetrics(doc, { ...DEFAULT_CONFIG, metrics: { decimalPlaces: 2 } });

    for (const campo of ["fleschPt", "wordsPerSentence", "syllablesPerWord"] as const) {
      const texto = String(metrics[campo]);
      const casas = texto.includes(".") ? texto.split(".")[1].length : 0;
      expect(casas).toBeLessThanOrEqual(2);
    }
  });
});

describe("runMetrics — Unicode NFC/NFD", () => {
  it("produz as mesmas métricas para texto equivalente em NFC e NFD", () => {
    const nfc = "A política pública precisa ser clara e acessível para todos os cidadãos.";
    const nfd = nfc.normalize("NFD");

    const metricsNfc = runMetrics(buildDocument(nfc));
    const metricsNfd = runMetrics(buildDocument(nfd));

    expect(metricsNfd).toEqual(metricsNfc);
  });
});

describe("runMetrics — determinismo (execução repetida byte-idêntica)", () => {
  it("mesma entrada produz sempre o mesmo JSON", () => {
    const source =
      "O Sr. Dr. João A. Silva, nascido em 1.234, escreveu para contato@exemplo.com.br. " +
      "Veja https://exemplo.com/pagina. Isso é ótimo! A saída foi rápida e a saúde, ótima.";

    const doc = buildDocument(source);
    const m1 = JSON.stringify(runMetrics(doc));
    const m2 = JSON.stringify(runMetrics(doc));
    const m3 = JSON.stringify(runMetrics(buildDocument(source)));

    expect(m2).toBe(m1);
    expect(m3).toBe(m1);
  });
});
