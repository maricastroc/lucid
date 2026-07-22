import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { buildScore } from "../src/lucid/core/score";
import { PASSES } from "../src/locales/pt-BR/passes/registry";
import { DEFAULT_CONFIG } from "../src/lucid/core/config";
import type { Config } from "../src/lucid/core/config";
import type { Finding } from "../src/lucid/core/types";

const TEXTO_4 =
  "É preciso fazer a verificação do relatório supramencionado, que foi assinado pelo gestor " +
  "responsável, doravante, antes do prazo final estabelecido no edital publicado.";

describe("score — forma e limites", () => {
  it("sempre expõe os critérios registrados, mesmo sem findings", () => {
    const d = analyze("O gato dorme.");
    expect(d.score.byCriterion.map((c) => c.criterion)).toEqual([
      "long_sentence",
      "passive_voice",
      "nominalization",
      "jargon",
      "mais_que_perfeito_sintetico",
      "gerundismo",
      "adverbio_mente_denso",
      "redundancia",
      "perifrase_inflada",
      "paragraph_length",
      "prose_enumeration",
      "mesoclise",
      "dupla_negacao",
      "subordinacao_densa",
      "leitor_terceira_pessoa",
      "salto_de_nivel_titulo",
    ]);
    for (const c of d.score.byCriterion) {
      expect(c.count).toEqual({ info: 0, warning: 0, error: 0 });
      expect(c.densityPer100Words).toBe(0);
      expect(c.principle).toMatch(/^5\.\d/);
    }
  });

  it("contagens e densidade nunca são negativas; totalFindings = soma das contagens", () => {
    const d = analyze(TEXTO_4);
    let soma = 0;
    for (const c of d.score.byCriterion) {
      expect(c.count.info).toBeGreaterThanOrEqual(0);
      expect(c.count.warning).toBeGreaterThanOrEqual(0);
      expect(c.count.error).toBeGreaterThanOrEqual(0);
      expect(c.densityPer100Words).toBeGreaterThanOrEqual(0);
      soma += c.count.info + c.count.warning + c.count.error;
    }
    expect(d.score.totalFindings).toBe(soma);
    expect(d.score.totalFindings).toBe(d.findings.length);
  });

  it("não há vocabulário de aprovação/certificação/garantia em nenhum lugar do score", () => {
    const json = JSON.stringify(analyze(TEXTO_4).score).toLowerCase();
    for (const proibido of ["aprovad", "approved", "certific", "garant", "selo", '"ok"', "passou"]) {
      expect(json).not.toContain(proibido);
    }
  });
});

describe("score — independência de ordem e ausência de contagem dupla", () => {
  it("embaralhar a ordem dos findings não muda o score (buildScore direto)", () => {
    const d = analyze(TEXTO_4);
    const emOrdem = buildScore(d.findings, PASSES, d.metrics.words, DEFAULT_CONFIG);
    const invertido = buildScore([...d.findings].reverse(), PASSES, d.metrics.words, DEFAULT_CONFIG);
    expect(invertido).toEqual(emOrdem);
    expect(invertido).toEqual(d.score);
  });

  it("cada finding é contado exatamente uma vez, mesmo com spans sobrepostos", () => {
    const d = analyze(TEXTO_4);
    // 5 findings, um deles (long_sentence) contém os outros; o score conta 5, não menos nem mais
    expect(d.findings).toHaveLength(5);
    expect(d.score.totalFindings).toBe(5);
    const jargon = d.score.byCriterion.find((c) => c.criterion === "jargon")!;
    expect(jargon.count.warning).toBe(2); // exatamente as duas ocorrências, sem fusão
  });
});

describe("score — critérios desabilitados", () => {
  it("desabilitar um pass zera o seu critério no placar, mas o critério permanece listado", () => {
    const config: Partial<Config> = { jargon: { enabled: false, frequencyRankCutoff: 5000, suggestFromGlossary: true } };
    const d = analyze(TEXTO_4, config);
    const jargon = d.score.byCriterion.find((c) => c.criterion === "jargon")!;
    expect(jargon).toBeDefined();
    expect(jargon.count).toEqual({ info: 0, warning: 0, error: 0 });
    expect(d.findings.some((f) => f.criterion === "jargon")).toBe(false);
  });

  it("desabilitar sugestões não altera as CONTAGENS do score (sugestão não é contada)", () => {
    const comSug = analyze(TEXTO_4);
    const semSug = analyze(TEXTO_4, {
      nominalization: { enabled: true, suggest: false },
      jargon: { enabled: true, frequencyRankCutoff: 5000, suggestFromGlossary: false },
    });
    // mesmos findings (só a presença de suggestion muda), logo mesmas contagens de score
    const contagens = (findings: readonly Finding[]) =>
      buildScore(findings, PASSES, comSug.metrics.words, DEFAULT_CONFIG).byCriterion.map((c) => c.count);
    expect(contagens(semSug.findings)).toEqual(contagens(comSug.findings));
  });
});

describe("score — derivação: métricas vs findings", () => {
  it("mudar limiar de frase (métrica de contagem) muda o score sem mexer nos outros critérios", () => {
    const base = analyze(TEXTO_4);
    const comErro = analyze(TEXTO_4, { sentenceLength: { warnAbove: 5, errorAbove: 10 } });
    const longoBase = base.score.byCriterion.find((c) => c.criterion === "long_sentence")!;
    const longoErro = comErro.score.byCriterion.find((c) => c.criterion === "long_sentence")!;
    expect(longoBase.count).toEqual({ info: 0, warning: 1, error: 0 });
    expect(longoErro.count).toEqual({ info: 0, warning: 0, error: 1 });

    for (const criterion of ["passive_voice", "nominalization", "jargon"] as const) {
      const a = base.score.byCriterion.find((c) => c.criterion === criterion)!;
      const b = comErro.score.byCriterion.find((c) => c.criterion === criterion)!;
      expect(b.count).toEqual(a.count);
    }
  });

  it("densidade é findings-por-100-palavras, derivada de words das métricas", () => {
    const d = analyze("O documento supracitado vale.");
    const jargon = d.score.byCriterion.find((c) => c.criterion === "jargon")!;
    expect(jargon.count.warning).toBe(1);
    expect(jargon.densityPer100Words).toBe(25);
  });
});

describe("score — texto vazio e muito curto", () => {
  it("texto vazio: critérios zerados, densidade 0 (sem divisão por zero)", () => {
    const d = analyze("");
    expect(d.score.totalFindings).toBe(0);
    expect(d.score.byCriterion).toHaveLength(16);
    for (const c of d.score.byCriterion) {
      expect(c.count).toEqual({ info: 0, warning: 0, error: 0 });
      expect(c.densityPer100Words).toBe(0);
      expect(Number.isFinite(c.densityPer100Words)).toBe(true);
    }
  });

  it("texto só com espaços: idêntico ao vazio no score", () => {
    expect(analyze("     ").score).toEqual(analyze("").score);
  });

  it("texto muito curto sem finding: densidade 0, contagens 0", () => {
    const d = analyze("Oi.");
    expect(d.score.totalFindings).toBe(0);
    for (const c of d.score.byCriterion) expect(c.densityPer100Words).toBe(0);
  });
});

describe("score — estabilidade", () => {
  it("mesma entrada produz score profundamente igual", () => {
    expect(analyze(TEXTO_4).score).toEqual(analyze(TEXTO_4).score);
  });
});
