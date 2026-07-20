import { describe, expect, it } from "vitest";
import { buildDocument } from "../src/lucid/core/document/model";
import { runMetrics } from "../src/lucid/core/metrics";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";

describe("runMetrics — documento vazio", () => {
  it("texto vazio devolve todas as métricas zeradas, sem NaN/Infinity", () => {
    const doc = buildDocument("");
    const metricas = runMetrics(doc);

    expect(metricas).toEqual({
      fleschPt: 0,
      palavras: 0,
      frases: 0,
      silabas: 0,
      palavrasPorFrase: 0,
      silabasPorPalavra: 0,
    });
  });

  it("texto só com espaços/quebras de linha também zera (sem frases nem palavras)", () => {
    const doc = buildDocument("   \n\n  \t  ");
    const metricas = runMetrics(doc);
    expect(metricas.frases).toBe(0);
    expect(metricas.palavras).toBe(0);
    expect(metricas.fleschPt).toBe(0);
  });

  it("texto só com pontuação (sem nenhuma palavra) zera palavras/sílabas sem quebrar", () => {
    const doc = buildDocument("!!! ??? ...");
    const metricas = runMetrics(doc);
    expect(metricas.palavras).toBe(0);
    expect(metricas.silabas).toBe(0);
    expect(metricas.fleschPt).toBe(0);
    expect(Number.isFinite(metricas.fleschPt)).toBe(true);
  });
});

describe("runMetrics — texto com uma frase", () => {
  it("calcula totais e Flesch-PT para uma única frase", () => {
    const doc = buildDocument("O gato subiu no telhado.");
    const metricas = runMetrics(doc);

    expect(metricas.frases).toBe(1);
    expect(metricas.palavras).toBe(5);
    expect(metricas.palavrasPorFrase).toBe(5);
    expect(metricas.silabasPorPalavra).toBe(metricas.silabas / metricas.palavras);

    // "esperado" usa as médias BRUTAS (não-arredondadas); metricas.fleschPt já vem
    // arredondado a config.metrics.decimais (1 casa, default) — por isso a tolerância
    // é de 1 casa decimal, não uma comparação exata.
    const esperado = 248.835 - 1.015 * (metricas.palavras / metricas.frases) - 84.6 * (metricas.silabas / metricas.palavras);
    expect(metricas.fleschPt).toBeCloseTo(esperado, 1);
  });
});

describe("runMetrics — texto com várias frases", () => {
  it("agrega totais do documento inteiro, não só da última frase", () => {
    const source = "O gato subiu no telhado. O cachorro correu muito rápido pelo jardim ontem.";
    const doc = buildDocument(source);
    const metricas = runMetrics(doc);

    expect(metricas.frases).toBe(2);
    expect(metricas.palavras).toBe(doc.tokens.filter((t) => t.isWord).length);
    expect(metricas.palavrasPorFrase).toBe(metricas.palavras / metricas.frases);
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
  it("respeita config.metrics.decimais para os três campos derivados", () => {
    const doc = buildDocument("O gato subiu no telhado. O cachorro correu muito rápido pelo jardim.");

    const comUmaCasa = runMetrics(doc, { ...DEFAULT_CONFIG, metrics: { decimais: 1 } });
    const comZeroCasas = runMetrics(doc, { ...DEFAULT_CONFIG, metrics: { decimais: 0 } });
    const comTresCasas = runMetrics(doc, { ...DEFAULT_CONFIG, metrics: { decimais: 3 } });

    for (const m of [comUmaCasa, comZeroCasas, comTresCasas]) {
      expect(m.palavras).toBe(comUmaCasa.palavras);
      expect(m.frases).toBe(comUmaCasa.frases);
      expect(m.silabas).toBe(comUmaCasa.silabas);
    }

    expect(Number.isInteger(comZeroCasas.fleschPt)).toBe(true);
    expect(Number.isInteger(comZeroCasas.palavrasPorFrase)).toBe(true);
    expect(Number.isInteger(comZeroCasas.silabasPorPalavra)).toBe(true);
  });

  it("nenhum float bruto vaza para o JSON — casas decimais respeitam o limite configurado", () => {
    const doc = buildDocument("O gato subiu rapidamente pelo telhado da casa vizinha durante a tarde de domingo.");
    const metricas = runMetrics(doc, { ...DEFAULT_CONFIG, metrics: { decimais: 2 } });

    for (const campo of ["fleschPt", "palavrasPorFrase", "silabasPorPalavra"] as const) {
      const texto = String(metricas[campo]);
      const casas = texto.includes(".") ? texto.split(".")[1].length : 0;
      expect(casas).toBeLessThanOrEqual(2);
    }
  });
});

describe("runMetrics — Unicode NFC/NFD", () => {
  it("produz as mesmas métricas para texto equivalente em NFC e NFD", () => {
    const nfc = "A política pública precisa ser clara e acessível para todos os cidadãos.";
    const nfd = nfc.normalize("NFD");

    const metricasNfc = runMetrics(buildDocument(nfc));
    const metricasNfd = runMetrics(buildDocument(nfd));

    expect(metricasNfd).toEqual(metricasNfc);
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
