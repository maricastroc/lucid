import { describe, expect, it } from "vitest";
import { createDataView } from "../../src/locales/pt-BR/datasets/registry";
import { nominalizationPass } from "../../src/locales/pt-BR/passes/nominalization";
import { DEFAULT_CONFIG } from "../../src/lucid/core/config";
import { buildDocument } from "../support/pt";
import { GOLDEN_NOMINALIZACAO } from "./nominalization-golden";
import { evaluateNominalization } from "./compute";

describe("avaliação de nominalizationPass — golden set", () => {
  // O MESMO cálculo que alimenta o artefato publicado (./compute).
  const { results: resultados, summary } = evaluateNominalization();

  const sugestoesEmitidas = resultados.filter((r) => r.sugestaoEmitida);
  const classificacoesErradas = resultados.filter((r) => r.classificacaoErrada);
  const errosDeteccao = resultados.filter((r) => r.fp > 0 || r.fn > 0);

  it("relatório: TP/FP/FN, precisão, recall, classificação do mapeamento", () => {
    console.log(
      `\n[eval nominalização] ${summary.cases} exemplos (${summary.negatives} negativos) · ` +
        `TP=${summary.tp} FP=${summary.fp} FN=${summary.fn} · precisão=${(summary.precision * 100).toFixed(1)}% · recall=${(summary.recall * 100).toFixed(1)}% · ` +
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

    expect(summary.cases).toBeGreaterThan(0);
  });

  it("o golden tem casos NEGATIVOS — sem eles a precisão seria 100% por construção", () => {
    expect(summary.negatives).toBeGreaterThan(0);
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
