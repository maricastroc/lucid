import { describe, expect, it } from "vitest";
import { createDataView } from "../../src/locales/pt-BR/datasets/registry";
import { passiveVoicePass } from "../../src/locales/pt-BR/passes/passive-voice";
import { DEFAULT_CONFIG } from "../../src/lucid/core/config";
import { buildDocument } from "../support/pt";
import { GOLDEN_VOZ_PASSIVA } from "./passive-voice-golden";
import { evaluatePassiveVoice } from "./compute";

describe("avaliação de passiveVoicePass — golden set", () => {
  // O MESMO cálculo que alimenta o artefato publicado (./compute): a página não pode
  // divergir do CI porque não existe segunda implementação.
  const { results: resultados, summary } = evaluatePassiveVoice();

  const errados = resultados.filter((r) => r.fp > 0 || r.fn > 0);

  it("relatório: TP/FP/FN, precisão e recall no golden set completo", () => {
    console.log(
      `\n[eval voz-passiva] ${summary.cases} exemplos (${summary.negatives} negativos) · ` +
        `TP=${summary.tp} FP=${summary.fp} FN=${summary.fn} · ` +
        `precisão=${(summary.precision * 100).toFixed(1)}% · recall=${(summary.recall * 100).toFixed(1)}%`,
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

    expect(summary.cases).toBeGreaterThan(0);
  });

  it("o golden tem casos NEGATIVOS — sem eles a precisão seria 100% por construção", () => {
    expect(summary.negatives).toBeGreaterThan(0);
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
