import { describe, expect, it } from "vitest";
import { createDataView } from "../../src/lucid/core/data/registry";
import { passiveVoicePass } from "../../src/lucid/core/passes/passive-voice";
import { DEFAULT_CONFIG } from "../../src/lucid/core/config";
import { buildDocument } from "../../src/lucid/core/document/model";
import { GOLDEN_VOZ_PASSIVA } from "./passive-voice-golden";

interface ResultadoAvaliacao {
  texto: string;
  expectedCount: number;
  actualCount: number;
  estado: "correto" | "limitacao_conhecida";
  tp: number;
  fp: number;
  fn: number;
}

function avaliar(): ResultadoAvaliacao[] {
  return GOLDEN_VOZ_PASSIVA.map((entrada) => {
    const doc = buildDocument(entrada.texto);
    const actualCount = passiveVoicePass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) }).length;

    return {
      texto: entrada.texto,
      expectedCount: entrada.expectedCount,
      actualCount,
      estado: entrada.estado,
      tp: Math.min(actualCount, entrada.expectedCount),
      fp: Math.max(0, actualCount - entrada.expectedCount),
      fn: Math.max(0, entrada.expectedCount - actualCount),
    };
  });
}

describe("avaliação de passiveVoicePass — golden set", () => {
  const resultados = avaliar();

  const totalTP = resultados.reduce((soma, r) => soma + r.tp, 0);
  const totalFP = resultados.reduce((soma, r) => soma + r.fp, 0);
  const totalFN = resultados.reduce((soma, r) => soma + r.fn, 0);
  const precisao = totalTP + totalFP === 0 ? 1 : totalTP / (totalTP + totalFP);
  const recall = totalTP + totalFN === 0 ? 1 : totalTP / (totalTP + totalFN);

  const errados = resultados.filter((r) => r.fp > 0 || r.fn > 0);

  it("relatório: TP/FP/FN, precisão e recall no golden set completo", () => {
    console.log(
      `\n[eval voz-passiva] ${resultados.length} exemplos · ` +
        `TP=${totalTP} FP=${totalFP} FN=${totalFN} · ` +
        `precisão=${(precisao * 100).toFixed(1)}% · recall=${(recall * 100).toFixed(1)}%`,
    );
    if (errados.length > 0) {
      console.log(
        "[eval voz-passiva] erros:\n" +
          errados
            .map(
              (r) =>
                `  - "${r.texto}": esperado=${r.expectedCount}, atual=${r.actualCount} ` +
                `(fp=${r.fp}, fn=${r.fn}, ${r.estado})`,
            )
            .join("\n"),
      );
    }

    expect(resultados.length).toBeGreaterThan(0);
  });

  it("toda entrada 'limitacao_conhecida' tem motivo documentado", () => {
    for (const entrada of GOLDEN_VOZ_PASSIVA) {
      if (entrada.estado === "limitacao_conhecida") {
        expect(entrada.motivo, `"${entrada.texto}" está marcada como limitação mas não tem motivo`).toBeTruthy();
      }
    }
  });

  it("nenhuma entrada 'correto' está, na verdade, incorreta (regressão)", () => {
    const corretasComErro = resultados.filter((r) => r.estado === "correto" && (r.fp > 0 || r.fn > 0));
    expect(corretasComErro, `entradas "correto" que falharam: ${JSON.stringify(corretasComErro)}`).toEqual([]);
  });

  describe.each(GOLDEN_VOZ_PASSIVA.filter((e) => e.estado === "correto"))("entrada correta: '$texto'", (entrada) => {
    it(`produz exatamente ${entrada.expectedCount} finding(s)`, () => {
      const doc = buildDocument(entrada.texto);
      const findings = passiveVoicePass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });
      expect(findings).toHaveLength(entrada.expectedCount);
    });
  });
});
