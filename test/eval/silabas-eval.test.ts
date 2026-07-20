/**
 * Avaliação de `countSyllables()` contra o golden set de `silabas-golden.ts` — separado
 * dos testes unitários de propósito (docs/DECISOES.md, ADR-004).
 *
 * Regra de honestidade (pedida explicitamente pelo usuário): entradas marcadas
 * `limitacao_conhecida` NUNCA recebem `expect(...).toBe(real)` — isso registraria uma
 * contagem sabidamente errada como se fosse o comportamento correto esperado. Elas só
 * são medidas e reportadas (taxa de acerto, erro absoluto médio); se o algoritmo um dia
 * passar a acertá-las, o teste não quebra — ele só reporta uma taxa de acerto melhor.
 *
 * Só entradas `correto` viram asserção dura: se uma delas falhar, é uma regressão real.
 */
import { describe, expect, it } from "vitest";
import { countSyllables } from "../../src/lucid/core/document/syllables";
import { GOLDEN_SILABAS } from "./silabas-golden";

interface ResultadoAvaliacao {
  palavra: string;
  real: number;
  atual: number;
  estado: "correto" | "limitacao_conhecida";
  acertou: boolean;
  erroAbsoluto: number;
}

function avaliar(): ResultadoAvaliacao[] {
  return GOLDEN_SILABAS.map((entrada) => {
    const atual = countSyllables(entrada.palavra);
    return {
      palavra: entrada.palavra,
      real: entrada.real,
      atual,
      estado: entrada.estado,
      acertou: atual === entrada.real,
      erroAbsoluto: Math.abs(atual - entrada.real),
    };
  });
}

describe("avaliação de countSyllables — golden set", () => {
  const resultados = avaliar();

  const taxaDeAcerto = resultados.filter((r) => r.acertou).length / resultados.length;
  const erroAbsolutoMedio = resultados.reduce((soma, r) => soma + r.erroAbsoluto, 0) / resultados.length;
  const casosIncorretos = resultados.filter((r) => !r.acertou);

  it("relatório: taxa de acerto exata e erro absoluto médio no golden set completo", () => {
    console.log(
      `\n[eval silabas] ${resultados.length} palavras · ` +
        `taxa de acerto exata: ${(taxaDeAcerto * 100).toFixed(1)}% · ` +
        `erro absoluto médio: ${erroAbsolutoMedio.toFixed(3)}`,
    );
    if (casosIncorretos.length > 0) {
      console.log(
        "[eval silabas] casos incorretos:\n" +
          casosIncorretos
            .map((r) => `  - "${r.palavra}": real=${r.real}, atual=${r.atual} (${r.estado})`)
            .join("\n"),
      );
    }

    expect(resultados.length).toBeGreaterThan(0);
  });

  it("toda entrada 'limitacao_conhecida' tem motivo documentado", () => {
    for (const entrada of GOLDEN_SILABAS) {
      if (entrada.estado === "limitacao_conhecida") {
        expect(entrada.motivo, `"${entrada.palavra}" está marcada como limitação mas não tem motivo`).toBeTruthy();
      }
    }
  });

  it("nenhuma entrada 'correto' está, na verdade, incorreta (regressão)", () => {
    const corretasComFalha = resultados.filter((r) => r.estado === "correto" && !r.acertou);
    expect(
      corretasComFalha,
      `entradas marcadas "correto" mas que falharam: ${JSON.stringify(corretasComFalha)}`,
    ).toEqual([]);
  });

  describe.each(GOLDEN_SILABAS.filter((e) => e.estado === "correto"))(
    "entrada correta: '$palavra'",
    (entrada) => {
      it(`countSyllables('${entrada.palavra}') === ${entrada.real}`, () => {
        expect(countSyllables(entrada.palavra)).toBe(entrada.real);
      });
    },
  );

  // Entradas "limitacao_conhecida" são deliberadamente NÃO verificadas com toBe(real)
  // aqui — ver cabeçalho do arquivo. Ficam só no relatório acima.
});
