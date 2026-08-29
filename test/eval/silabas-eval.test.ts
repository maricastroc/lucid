import { describe, expect, it } from "vitest";
import { countSyllables } from "../../src/locales/pt-BR/services/syllables";
import { GOLDEN_SILABAS } from "./silabas-golden";
import { evaluateSyllables, formatRate } from "./compute";

describe("countSyllables evaluation — golden set", () => {
  const { results, summary } = evaluateSyllables();
  const exactRate = summary.exactRate;
  const meanAbsoluteError = summary.meanAbsoluteError;
  const incorrectCases = results.filter((r) => !r.acertou);

  it("report: exact-match rate and mean absolute error over the full golden set", () => {
    console.log(
      `\n[eval syllables] ${results.length} words · ` +
        `exact-match rate: ${formatRate(exactRate)} · ` +
        `mean absolute error: ${meanAbsoluteError === null ? "—" : meanAbsoluteError.toFixed(3)}`,
    );
    if (incorrectCases.length > 0) {
      console.log(
        "[eval syllables] incorrect cases:\n" +
          incorrectCases
            .map((r) => `  - "${r.palavra}": expected=${r.real}, actual=${r.atual} (${r.estado})`)
            .join("\n"),
      );
    }

    expect(results.length).toBeGreaterThan(0);
  });

  it("every 'limitacao_conhecida' entry has a documented motivo", () => {
    for (const entry of GOLDEN_SILABAS) {
      if (entry.estado === "limitacao_conhecida") {
        expect(entry.motivo, `"${entry.palavra}" está marcada como limitação mas não tem motivo`).toBeTruthy();
      }
    }
  });

  it("no 'correto' entry is actually incorrect (regression)", () => {
    const corretasComFalha = results.filter((r) => r.estado === "correto" && !r.acertou);
    expect(
      corretasComFalha,
      `entries marcadas "correto" mas que falharam: ${JSON.stringify(corretasComFalha)}`,
    ).toEqual([]);
  });

  describe.each(GOLDEN_SILABAS.filter((e) => e.estado === "correto"))("entry correta: '$palavra'", (entry) => {
    it(`countSyllables('${entry.palavra}') === ${entry.real}`, () => {
      expect(countSyllables(entry.palavra)).toBe(entry.real);
    });
  });
});
