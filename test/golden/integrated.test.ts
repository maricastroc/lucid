import { describe, expect, it } from "vitest";
import { analyze } from "../../src/lucid";
import type { Diagnostic, Finding } from "../../src/lucid/core/types";
import { GOLDEN_INTEGRADO } from "./integrated-golden";
import type { ExpectedFinding, GoldenCase, IntegratedCriterion } from "./integrated-golden";

const CRITERIA: readonly IntegratedCriterion[] = [
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
];

function findActual(diagnostic: Diagnostic, expected: ExpectedFinding): Finding | undefined {
  return diagnostic.findings.find(
    (f) => f.criterion === expected.criterion && f.span.start === expected.start && f.span.end === expected.end,
  );
}

describe("golden integrado — asserções semânticas por caso", () => {
  describe.each(GOLDEN_INTEGRADO)("$id — $description", (caso: GoldenCase) => {
    const diagnostic = analyze(caso.text);

    it("produz exatamente os findings esperados (contagem total)", () => {
      expect(diagnostic.findings).toHaveLength(caso.expected.findings.length);
    });

    it("cada finding esperado existe com proveniência completa e correta", () => {
      for (const esperado of caso.expected.findings) {
        const actual = findActual(diagnostic, esperado);
        expect(actual, `finding ausente: ${esperado.criterion} @[${esperado.start},${esperado.end}] "${esperado.spanText}"`).toBeDefined();
        if (!actual) continue;

        expect(actual.span.text).toBe(esperado.spanText);
        expect(actual.severity).toBe(esperado.severity);
        expect(actual.requiresHuman).toBe(esperado.requiresHuman);
        expect(actual.suggestion).toBe(esperado.suggestion);
        expect(actual.principle).toMatch(/^5\.\d/);
        expect(actual.category).toBeDefined();
        expect(actual.justification.length).toBeGreaterThan(0);
        expect(diagnostic.text.slice(actual.span.start, actual.span.end)).toBe(actual.span.text);
      }
    });

    it("nenhum finding inesperado aparece (sem falso positivo)", () => {
      for (const actual of diagnostic.findings) {
        const previsto = caso.expected.findings.some(
          (e) => e.criterion === actual.criterion && e.start === actual.span.start && e.end === actual.span.end,
        );
        expect(previsto, `finding inesperado: ${actual.criterion} @[${actual.span.start},${actual.span.end}] "${actual.span.text}"`).toBe(true);
      }
    });

    it("métricas principais conferem", () => {
      expect(diagnostic.metrics.words).toBe(caso.expected.metrics.words);
      expect(diagnostic.metrics.sentences).toBe(caso.expected.metrics.sentences);
    });

    it("score é coerente com os findings (contagens derivadas, 4 critérios, sem aprovação)", () => {
      expect(diagnostic.score.byCriterion).toHaveLength(CRITERIA.length);
      expect(diagnostic.score.totalFindings).toBe(diagnostic.findings.length);

      for (const criterion of CRITERIA) {
        const entry = diagnostic.score.byCriterion.find((c) => c.criterion === criterion);
        expect(entry, `critério ausente no placar: ${criterion}`).toBeDefined();
        const esperadoNoCriterio = diagnostic.findings.filter((f) => f.criterion === criterion);
        const somaContagem = entry!.count.info + entry!.count.warning + entry!.count.error;
        expect(somaContagem).toBe(esperadoNoCriterio.length);
      }

      const json = JSON.stringify(diagnostic.score).toLowerCase();
      expect(json).not.toContain("aprovad");
      expect(json).not.toContain("approved");
    });
  });
});

describe("golden integrado — resumo integrado (métricas globais e por critério)", () => {
  interface Acc {
    tp: number;
    fp: number;
    fn: number;
    sugEmitidas: number;
    sugCorretas: number;
    sugInseguras: number;
  }
  const zero = (): Acc => ({ tp: 0, fp: 0, fn: 0, sugEmitidas: 0, sugCorretas: 0, sugInseguras: 0 });

  const global = zero();
  const porCriterio: Record<IntegratedCriterion, Acc> = {
    long_sentence: zero(),
    passive_voice: zero(),
    nominalization: zero(),
    jargon: zero(),
    mais_que_perfeito_sintetico: zero(),
    gerundismo: zero(),
    adverbio_mente_denso: zero(),
    redundancia: zero(),
    perifrase_inflada: zero(),
    paragraph_length: zero(),
    prose_enumeration: zero(),
    mesoclise: zero(),
    dupla_negacao: zero(),
    subordinacao_densa: zero(),
    leitor_terceira_pessoa: zero(),
    salto_de_nivel_titulo: zero(),
  };
  let findingsSobreNaoPrevistos = 0;
  let totalEsperado = 0;

  for (const caso of GOLDEN_INTEGRADO) {
    const diagnostic = analyze(caso.text);
    totalEsperado += caso.expected.findings.length;

    for (const esperado of caso.expected.findings) {
      const actual = findActual(diagnostic, esperado);
      const bucket = porCriterio[esperado.criterion];
      if (actual) {
        global.tp++;
        bucket.tp++;
      } else {
        global.fn++;
        bucket.fn++;
      }

      if (esperado.suggestion !== undefined) {
        if (actual?.suggestion === esperado.suggestion) {
          global.sugEmitidas++;
          global.sugCorretas++;
          bucket.sugEmitidas++;
          bucket.sugCorretas++;
        }
      }
    }

    for (const actual of diagnostic.findings) {
      const criterion = actual.criterion as IntegratedCriterion;
      const esperado = caso.expected.findings.find(
        (e) => e.criterion === actual.criterion && e.start === actual.span.start && e.end === actual.span.end,
      );
      if (!esperado) {
        global.fp++;
        porCriterio[criterion].fp++;
        findingsSobreNaoPrevistos++;
        if (actual.suggestion !== undefined) {
          global.sugInseguras++;
          porCriterio[criterion].sugInseguras++;
        }
        continue;
      }

      if (actual.suggestion !== undefined && actual.suggestion !== esperado.suggestion) {
        global.sugInseguras++;
        porCriterio[criterion].sugInseguras++;
      }
    }
  }

  const precisao = global.tp + global.fp === 0 ? 1 : global.tp / (global.tp + global.fp);
  const recall = global.tp + global.fn === 0 ? 1 : global.tp / (global.tp + global.fn);

  it("relatório integrado", () => {
    const linhas: string[] = [
      `\n[eval integrada] documentos=${GOLDEN_INTEGRADO.length} · findings esperados=${totalEsperado} · ` +
        `TP=${global.tp} FP=${global.fp} FN=${global.fn} · precisão=${(precisao * 100).toFixed(1)}% · recall=${(recall * 100).toFixed(1)}%`,
      `[eval integrada] sugestões: emitidas=${global.sugEmitidas} corretas=${global.sugCorretas} inseguras=${global.sugInseguras} · ` +
        `findings sobre termos não previstos (deve ser 0)=${findingsSobreNaoPrevistos}`,
    ];
    for (const criterion of CRITERIA) {
      const b = porCriterio[criterion];
      linhas.push(
        `[eval integrada]   ${criterion}: TP=${b.tp} FP=${b.fp} FN=${b.fn} · sugestões corretas=${b.sugCorretas}/${b.sugEmitidas} · inseguras=${b.sugInseguras}`,
      );
    }
    console.log(linhas.join("\n"));
    expect(GOLDEN_INTEGRADO.length).toBeGreaterThan(0);
  });

  it("zero sugestões inseguras (prioridade 1)", () => {
    expect(global.sugInseguras).toBe(0);
  });

  it("precisão 100% e zero findings sobre termos não previstos (prioridade 2)", () => {
    expect(global.fp).toBe(0);
    expect(findingsSobreNaoPrevistos).toBe(0);
    expect(precisao).toBe(1);
  });

  it("recall total sobre o golden de referência", () => {
    expect(global.fn).toBe(0);
    expect(recall).toBe(1);
  });
});
