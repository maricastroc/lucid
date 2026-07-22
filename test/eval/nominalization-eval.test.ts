import { describe, expect, it } from "vitest";
import { createDataView } from "../../src/locales/pt-BR/datasets/registry";
import { nominalizationPass } from "../../src/locales/pt-BR/passes/nominalization";
import { DEFAULT_CONFIG } from "../../src/lucid/core/config";
import { buildDocument } from "../support/pt";
import { GOLDEN_NOMINALIZACAO } from "./nominalization-golden";

interface ResultadoAvaliacao {
  texto: string;
  expectedCount: number;
  actualCount: number;
  expectSuggestion: boolean | undefined;
  expectedSuggestion: string | undefined;
  actualSuggestion: string | undefined;
  estado: "correto" | "limitacao_conhecida";
  tp: number;
  fp: number;
  fn: number;
  sugestaoInsegura: boolean;
  sugestaoCorreta: boolean;
}

function avaliar(): ResultadoAvaliacao[] {
  return GOLDEN_NOMINALIZACAO.map((entrada) => {
    const doc = buildDocument(entrada.texto);
    const findings = nominalizationPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });
    const actualCount = findings.length;
    const actualSuggestion = actualCount === 1 ? findings[0].suggestion : undefined;

    const esperaSugestao = entrada.expectedCount === 1 && entrada.expectSuggestion === true;
    const naoEsperaSugestao = entrada.expectedCount === 1 && entrada.expectSuggestion === false;

    const sugestaoCorreta = esperaSugestao && actualCount === 1 && actualSuggestion === entrada.expectedSuggestion;
    const sugestaoInsegura =
      (naoEsperaSugestao && actualCount === 1 && actualSuggestion !== undefined) ||
      (esperaSugestao && actualCount === 1 && actualSuggestion !== undefined && actualSuggestion !== entrada.expectedSuggestion);

    return {
      texto: entrada.texto,
      expectedCount: entrada.expectedCount,
      actualCount,
      expectSuggestion: entrada.expectSuggestion,
      expectedSuggestion: entrada.expectedSuggestion,
      actualSuggestion,
      estado: entrada.estado,
      tp: Math.min(actualCount, entrada.expectedCount),
      fp: Math.max(0, actualCount - entrada.expectedCount),
      fn: Math.max(0, entrada.expectedCount - actualCount),
      sugestaoInsegura,
      sugestaoCorreta,
    };
  });
}

describe("avaliação de nominalizationPass — golden set", () => {
  const resultados = avaliar();

  const totalTP = resultados.reduce((soma, r) => soma + r.tp, 0);
  const totalFP = resultados.reduce((soma, r) => soma + r.fp, 0);
  const totalFN = resultados.reduce((soma, r) => soma + r.fn, 0);
  const precisao = totalTP + totalFP === 0 ? 1 : totalTP / (totalTP + totalFP);
  const recall = totalTP + totalFN === 0 ? 1 : totalTP / (totalTP + totalFN);

  const sugestoesEsperadas = resultados.filter((r) => r.expectSuggestion === true);
  const sugestoesCorretas = sugestoesEsperadas.filter((r) => r.sugestaoCorreta);
  const sugestoesInseguras = resultados.filter((r) => r.sugestaoInsegura);

  const errosDeteccao = resultados.filter((r) => r.fp > 0 || r.fn > 0);

  it("relatório: TP/FP/FN, precisão, recall, sugestões corretas e sugestões inseguras", () => {
    console.log(
      `\n[eval nominalização] ${resultados.length} exemplos · ` +
        `TP=${totalTP} FP=${totalFP} FN=${totalFN} · precisão=${(precisao * 100).toFixed(1)}% · recall=${(recall * 100).toFixed(1)}% · ` +
        `sugestões corretas=${sugestoesCorretas.length}/${sugestoesEsperadas.length} · ` +
        `sugestões inseguras=${sugestoesInseguras.length}`,
    );
    if (errosDeteccao.length > 0) {
      console.log(
        "[eval nominalização] erros de detecção:\n" +
          errosDeteccao
            .map((r) => `  - "${r.texto}": esperado=${r.expectedCount}, atual=${r.actualCount} (${r.estado})`)
            .join("\n"),
      );
    }
    if (sugestoesInseguras.length > 0) {
      console.log(
        "[eval nominalização] SUGESTÕES INSEGURAS (deveriam ser zero):\n" +
          sugestoesInseguras
            .map((r) => `  - "${r.texto}": esperado="${r.expectedSuggestion}", atual="${r.actualSuggestion}"`)
            .join("\n"),
      );
    }

    expect(resultados.length).toBeGreaterThan(0);
  });

  it("nenhuma sugestão insegura é emitida (métrica prioritária)", () => {
    expect(sugestoesInseguras, `sugestões inseguras: ${JSON.stringify(sugestoesInseguras)}`).toEqual([]);
  });

  it("toda entrada 'limitacao_conhecida' tem motivo documentado", () => {
    for (const entrada of GOLDEN_NOMINALIZACAO) {
      if (entrada.estado === "limitacao_conhecida") {
        expect(entrada.motivo, `"${entrada.texto}" está marcada como limitação mas não tem motivo`).toBeTruthy();
      }
    }
  });

  it("nenhuma entrada 'correto' está, na verdade, incorreta (regressão)", () => {
    const corretasComErro = resultados.filter(
      (r) => r.estado === "correto" && (r.fp > 0 || r.fn > 0 || r.sugestaoInsegura),
    );
    expect(corretasComErro, `entradas "correto" que falharam: ${JSON.stringify(corretasComErro)}`).toEqual([]);
  });

  describe.each(GOLDEN_NOMINALIZACAO.filter((e) => e.estado === "correto"))("entrada correta: '$texto'", (entrada) => {
    it(`produz exatamente ${entrada.expectedCount} finding(s) e sugestão consistente`, () => {
      const doc = buildDocument(entrada.texto);
      const findings = nominalizationPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });
      expect(findings).toHaveLength(entrada.expectedCount);

      if (entrada.expectedCount === 1 && entrada.expectSuggestion !== undefined) {
        if (entrada.expectSuggestion) {
          expect(findings[0].suggestion).toBe(entrada.expectedSuggestion);
          expect(findings[0].requiresHuman).toBe(false);
        } else {
          expect(findings[0].suggestion).toBeUndefined();
          expect(findings[0].requiresHuman).toBe(true);
        }
      }
    });
  });
});
