/**
 * Avaliação de `jargonPass` contra o golden set de `jargon-golden.ts` — separado dos
 * testes unitários de propósito (mesmo padrão de `nominalization-eval.test.ts`).
 *
 * Métricas prioritárias, na ordem do pedido: (1) zero sugestões semanticamente
 * inseguras; (2) precisão alta na detecção; (3) zero findings motivados apenas por
 * raridade — aqui verificado como "zero findings em texto sem termo cadastrado"
 * (`mustNotFire`), já que este pass não tem heurística de raridade nenhuma.
 *
 * Regra de honestidade: entradas `limitacao_conhecida` nunca viram asserção de
 * acerto — só são medidas e reportadas.
 */
import { describe, expect, it } from "vitest";
import { createDataView } from "../../src/lucid/core/data/registry";
import { jargonPass } from "../../src/lucid/core/passes/jargon";
import { DEFAULT_CONFIG } from "../../src/lucid/core/config";
import { buildDocument } from "../../src/lucid/core/document/model";
import { GOLDEN_JARGAO } from "./jargon-golden";

interface ResultadoAvaliacao {
  texto: string;
  categoria: string;
  expectedCount: number;
  actualCount: number;
  expectSuggestion: boolean | undefined;
  expectedSuggestion: string | undefined;
  actualSuggestion: string | undefined;
  mustNotFire: boolean;
  estado: "correto" | "limitacao_conhecida";
  tp: number;
  fp: number;
  fn: number;
  sugestaoInsegura: boolean;
  sugestaoCorreta: boolean;
  disparouSemCadastro: boolean;
}

function avaliar(): ResultadoAvaliacao[] {
  return GOLDEN_JARGAO.map((entrada) => {
    const doc = buildDocument(entrada.texto);
    const findings = jargonPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });
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
      categoria: entrada.categoria,
      expectedCount: entrada.expectedCount,
      actualCount,
      expectSuggestion: entrada.expectSuggestion,
      expectedSuggestion: entrada.expectedSuggestion,
      actualSuggestion,
      mustNotFire: entrada.mustNotFire === true,
      estado: entrada.estado,
      tp: Math.min(actualCount, entrada.expectedCount),
      fp: Math.max(0, actualCount - entrada.expectedCount),
      fn: Math.max(0, entrada.expectedCount - actualCount),
      sugestaoInsegura,
      sugestaoCorreta,
      disparouSemCadastro: entrada.mustNotFire === true && actualCount > 0,
    };
  });
}

describe("avaliação de jargonPass — golden set", () => {
  const resultados = avaliar();

  const totalTP = resultados.reduce((soma, r) => soma + r.tp, 0);
  const totalFP = resultados.reduce((soma, r) => soma + r.fp, 0);
  const totalFN = resultados.reduce((soma, r) => soma + r.fn, 0);
  const precisao = totalTP + totalFP === 0 ? 1 : totalTP / (totalTP + totalFP);
  const recall = totalTP + totalFN === 0 ? 1 : totalTP / (totalTP + totalFN);

  const sugestoesEsperadas = resultados.filter((r) => r.expectSuggestion === true);
  const sugestoesCorretas = sugestoesEsperadas.filter((r) => r.sugestaoCorreta);
  const sugestoesInseguras = resultados.filter((r) => r.sugestaoInsegura);
  const disparosSemCadastro = resultados.filter((r) => r.disparouSemCadastro);

  const errosDeteccao = resultados.filter((r) => r.fp > 0 || r.fn > 0);

  it("relatório: TP/FP/FN, precisão, recall, sugestões e findings sem cadastro", () => {
    console.log(
      `\n[eval jargão] ${resultados.length} exemplos · ` +
        `TP=${totalTP} FP=${totalFP} FN=${totalFN} · precisão=${(precisao * 100).toFixed(1)}% · recall=${(recall * 100).toFixed(1)}% · ` +
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

    expect(resultados.length).toBeGreaterThan(0);
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

  // Entradas "limitacao_conhecida" são deliberadamente NÃO verificadas com toHaveLength
  // aqui — ver cabeçalho do arquivo. Ficam só no relatório acima.
});
