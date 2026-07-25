import { describe, expect, it } from "vitest";
import { createDataView } from "../../src/locales/pt-BR/datasets/registry";
import { jargonPass } from "../../src/locales/pt-BR/passes/jargon";
import { DEFAULT_CONFIG } from "../../src/lucid/core/config";
import { buildDocument } from "../support/pt";
import { GOLDEN_JARGAO } from "./jargon-golden";
import { evaluateJargon } from "./compute";

describe("avaliação de jargonPass — golden set", () => {
  // O MESMO cálculo que alimenta o artefato publicado (./compute).
  const { results: resultados, summary, suggestions } = evaluateJargon();

  const sugestoesEsperadas = resultados.filter((r) => r.expectSuggestion === true);
  const sugestoesCorretas = sugestoesEsperadas.filter((r) => r.sugestaoCorreta);
  const sugestoesInseguras = resultados.filter((r) => r.sugestaoInsegura);
  const disparosSemCadastro = resultados.filter((r) => r.disparouSemCadastro);

  const errosDeteccao = resultados.filter((r) => r.fp > 0 || r.fn > 0);

  it("relatório: TP/FP/FN, precisão, recall, sugestões e findings sem cadastro", () => {
    console.log(
      `\n[eval jargão] ${summary.cases} exemplos (${summary.negatives} negativos) · ` +
        `TP=${summary.tp} FP=${summary.fp} FN=${summary.fn} · precisão=${(summary.precision * 100).toFixed(1)}% · recall=${(summary.recall * 100).toFixed(1)}% · ` +
        `sugestões corretas=${sugestoesCorretas.length}/${sugestoesEsperadas.length} · ` +
        `sugestões inseguras=${sugestoesInseguras.length} · ` +
        `findings sem cadastro (deve ser 0)=${disparosSemCadastro.length}`,
    );
    if (errosDeteccao.length > 0) {
      console.log(
        "[eval jargão] erros de detecção:\n" +
          errosDeteccao
            .map((r) => `  - [${r.categoria}] "${r.texto}": esperado=${r.expectedCount}, atual=${r.actualCount} (${r.estado})`)
            .join("\n"),
      );
    }
    if (sugestoesInseguras.length > 0) {
      console.log(
        "[eval jargão] SUGESTÕES INSEGURAS (deveriam ser zero):\n" +
          sugestoesInseguras
            .map((r) => `  - "${r.texto}": esperado="${r.expectedSuggestion}", atual="${r.actualSuggestion}"`)
            .join("\n"),
      );
    }

    expect(summary.cases).toBeGreaterThan(0);
  });

  it("o golden tem casos NEGATIVOS — sem eles a precisão seria 100% por construção", () => {
    expect(summary.negatives).toBeGreaterThan(0);
    expect(suggestions.firedWithoutEntry).toBe(0);
  });

  it("nenhuma sugestão insegura é emitida (métrica prioritária 1)", () => {
    expect(sugestoesInseguras, `sugestões inseguras: ${JSON.stringify(sugestoesInseguras)}`).toEqual([]);
  });

  it("nenhum finding dispara sobre texto sem termo cadastrado (métrica prioritária 3)", () => {
    expect(disparosSemCadastro, `findings indevidos: ${JSON.stringify(disparosSemCadastro)}`).toEqual([]);
  });

  it("toda entrada 'limitacao_conhecida' tem motivo documentado", () => {
    for (const entrada of GOLDEN_JARGAO) {
      if (entrada.estado === "limitacao_conhecida") {
        expect(entrada.motivo, `"${entrada.texto}" está marcada como limitação mas não tem motivo`).toBeTruthy();
      }
    }
  });

  it("nenhuma entrada 'correto' está, na verdade, incorreta (regressão)", () => {
    const corretasComErro = resultados.filter(
      (r) => r.estado === "correto" && (r.fp > 0 || r.fn > 0 || r.sugestaoInsegura || r.disparouSemCadastro),
    );
    expect(corretasComErro, `entradas "correto" que falharam: ${JSON.stringify(corretasComErro)}`).toEqual([]);
  });

  describe.each(GOLDEN_JARGAO.filter((e) => e.estado === "correto"))("entrada correta: '$texto'", (entrada) => {
    it(`produz exatamente ${entrada.expectedCount} finding(s) e sugestão consistente`, () => {
      const doc = buildDocument(entrada.texto);
      const findings = jargonPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });
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
