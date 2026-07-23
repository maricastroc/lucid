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
  expectRequiresHuman: boolean | undefined;
  actualRequiresHuman: boolean | undefined;
  estado: "correto" | "limitacao_conhecida";
  tp: number;
  fp: number;
  fn: number;
  sugestaoEmitida: boolean;
  classificacaoErrada: boolean;
}

function avaliar(): ResultadoAvaliacao[] {
  return GOLDEN_NOMINALIZACAO.map((entrada) => {
    const doc = buildDocument(entrada.texto);
    const findings = nominalizationPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });
    const actualCount = findings.length;
    const actualRequiresHuman = actualCount === 1 ? findings[0].requiresHuman : undefined;

    const sugestaoEmitida = findings.some((f) => f.suggestion !== undefined);
    const classificacaoErrada =
      entrada.expectedCount === 1 &&
      entrada.expectRequiresHuman !== undefined &&
      actualCount === 1 &&
      actualRequiresHuman !== entrada.expectRequiresHuman;

    return {
      texto: entrada.texto,
      expectedCount: entrada.expectedCount,
      actualCount,
      expectRequiresHuman: entrada.expectRequiresHuman,
      actualRequiresHuman,
      estado: entrada.estado,
      tp: Math.min(actualCount, entrada.expectedCount),
      fp: Math.max(0, actualCount - entrada.expectedCount),
      fn: Math.max(0, entrada.expectedCount - actualCount),
      sugestaoEmitida,
      classificacaoErrada,
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

  const sugestoesEmitidas = resultados.filter((r) => r.sugestaoEmitida);
  const classificacoesErradas = resultados.filter((r) => r.classificacaoErrada);
  const errosDeteccao = resultados.filter((r) => r.fp > 0 || r.fn > 0);

  it("relatório: TP/FP/FN, precisão, recall, classificação do mapeamento", () => {
    console.log(
      `\n[eval nominalização] ${resultados.length} exemplos · ` +
        `TP=${totalTP} FP=${totalFP} FN=${totalFN} · precisão=${(precisao * 100).toFixed(1)}% · recall=${(recall * 100).toFixed(1)}% · ` +
        `classificações erradas=${classificacoesErradas.length} · sugestões emitidas=${sugestoesEmitidas.length} (deve ser 0)`,
    );
    if (errosDeteccao.length > 0) {
      console.log(
        "[eval nominalização] erros de detecção:\n" +
          errosDeteccao
            .map((r) => `  - "${r.texto}": esperado=${r.expectedCount}, atual=${r.actualCount} (${r.estado})`)
            .join("\n"),
      );
    }

    expect(resultados.length).toBeGreaterThan(0);
  });

  it("a engine nunca emite sugestão composta — invariante dura do ADR-054", () => {
    expect(sugestoesEmitidas, `sugestões emitidas: ${JSON.stringify(sugestoesEmitidas)}`).toEqual([]);
  });

  it("a classificação do mapeamento (requiresHuman) confere com a curadoria", () => {
    expect(classificacoesErradas, `classificações erradas: ${JSON.stringify(classificacoesErradas)}`).toEqual([]);
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
      (r) => r.estado === "correto" && (r.fp > 0 || r.fn > 0 || r.sugestaoEmitida || r.classificacaoErrada),
    );
    expect(corretasComErro, `entradas "correto" que falharam: ${JSON.stringify(corretasComErro)}`).toEqual([]);
  });

  describe.each(GOLDEN_NOMINALIZACAO.filter((e) => e.estado === "correto"))("entrada correta: '$texto'", (entrada) => {
    it(`produz exatamente ${entrada.expectedCount} finding(s), sem sugestão e com classificação certa`, () => {
      const doc = buildDocument(entrada.texto);
      const findings = nominalizationPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });
      expect(findings).toHaveLength(entrada.expectedCount);
      for (const f of findings) expect(f.suggestion).toBeUndefined();

      if (entrada.expectedCount === 1 && entrada.expectRequiresHuman !== undefined) {
        expect(findings[0].requiresHuman).toBe(entrada.expectRequiresHuman);
      }
    });
  });
});
