import { describe, expect, it } from "vitest";
import { countSyllables } from "../../src/locales/pt-BR/services/syllables";
import { GOLDEN_SILABAS } from "./silabas-golden";
import { evaluateSyllables, formatRate } from "./compute";

describe("avaliação de countSyllables — golden set", () => {
  // O MESMO cálculo que alimenta o artefato publicado (./compute).
  const { results: resultados, summary } = evaluateSyllables();
  const taxaDeAcerto = summary.exactRate;
  const erroAbsolutoMedio = summary.meanAbsoluteError;
  const casosIncorretos = resultados.filter((r) => !r.acertou);

  it("relatório: taxa de acerto exata e erro absoluto médio no golden set completo", () => {
    console.log(
      `\n[eval silabas] ${resultados.length} palavras · ` +
        `taxa de acerto exata: ${formatRate(taxaDeAcerto)} · ` +
        `erro absoluto médio: ${erroAbsolutoMedio === null ? "—" : erroAbsolutoMedio.toFixed(3)}`,
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
});
