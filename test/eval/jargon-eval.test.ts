import { describe, expect, it } from "vitest";
import { createDataView } from "../../src/locales/pt-BR/datasets/registry";
import { jargonPass } from "../../src/locales/pt-BR/passes/jargon";
import { DEFAULT_CONFIG } from "../../src/lucid/core/config";
import { buildDocument } from "../support/pt";
import { GOLDEN_JARGAO } from "./jargon-golden";
import { formatRate, evaluateJargon } from "./compute";

describe("jargonPass evaluation — golden set", () => {
  const { results, summary, suggestions } = evaluateJargon();

  const expectedSuggestions = results.filter((r) => r.expectSuggestion === true);
  const correctSuggestions = expectedSuggestions.filter((r) => r.sugestaoCorreta);
  const unsafeSuggestions = results.filter((r) => r.sugestaoInsegura);
  const firedWithoutEntry = results.filter((r) => r.disparouSemCadastro);

  const detectionErrors = results.filter((r) => r.fp > 0 || r.fn > 0);

  it("report: TP/FP/FN, precision, recall, suggestions and findings without a glossary entry", () => {
    console.log(
      `\n[eval jargon] ${summary.cases} examples (${summary.negatives} negatives) · ` +
        `TP=${summary.tp} FP=${summary.fp} FN=${summary.fn} · precision=${formatRate(summary.precision)} · recall=${formatRate(summary.recall)} · ` +
        `correct suggestions=${correctSuggestions.length}/${expectedSuggestions.length} · ` +
        `unsafe suggestions=${unsafeSuggestions.length} · ` +
        `findings without entry (must be 0)=${firedWithoutEntry.length}`,
    );
    if (detectionErrors.length > 0) {
      console.log(
        "[eval jargon] detection errors:\n" +
          detectionErrors
            .map((r) => `  - [${r.categoria}] "${r.texto}": expected=${r.expectedCount}, actual=${r.actualCount} (${r.estado})`)
            .join("\n"),
      );
    }
    if (unsafeSuggestions.length > 0) {
      console.log(
        "[eval jargon] UNSAFE SUGGESTIONS (should be zero):\n" +
          unsafeSuggestions
            .map((r) => `  - "${r.texto}": expected="${r.expectedSuggestion}", actual="${r.actualSuggestion}"`)
            .join("\n"),
      );
    }

    expect(summary.cases).toBeGreaterThan(0);
  });

  it("the golden has NEGATIVE cases — without them precision would be 100% by construction", () => {
    expect(summary.negatives).toBeGreaterThan(0);
    expect(suggestions.firedWithoutEntry).toBe(0);
  });

  it("no unsafe suggestion is emitted (priority metric 1)", () => {
    expect(unsafeSuggestions, `unsafe suggestions: ${JSON.stringify(unsafeSuggestions)}`).toEqual([]);
  });

  it("no finding fires on text without a registered term (priority metric 3)", () => {
    expect(firedWithoutEntry, `undue findings: ${JSON.stringify(firedWithoutEntry)}`).toEqual([]);
  });

  it("every 'limitacao_conhecida' entry has a documented motivo", () => {
    for (const entry of GOLDEN_JARGAO) {
      if (entry.estado === "limitacao_conhecida") {
        expect(entry.motivo, `"${entry.texto}" is flagged as a limitation but has no motivo`).toBeTruthy();
      }
    }
  });

  it("no 'correto' entry is actually incorrect (regression)", () => {
    const correctButFailing = results.filter(
      (r) => r.estado === "correto" && (r.fp > 0 || r.fn > 0 || r.sugestaoInsegura || r.disparouSemCadastro),
    );
    expect(correctButFailing, `"correto" entries that failed: ${JSON.stringify(correctButFailing)}`).toEqual([]);
  });

  describe.each(GOLDEN_JARGAO.filter((e) => e.estado === "correto"))("correct entry: '$texto'", (entry) => {
    it(`produces exactly ${entry.expectedCount} finding(s) with a consistent suggestion`, () => {
      const doc = buildDocument(entry.texto);
      const findings = jargonPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });
      expect(findings).toHaveLength(entry.expectedCount);

      if (entry.expectedCount === 1 && entry.expectSuggestion !== undefined) {
        if (entry.expectSuggestion) {
          expect(findings[0].suggestion).toBe(entry.expectedSuggestion);
          expect(findings[0].requiresHuman).toBe(false);
        } else {
          expect(findings[0].suggestion).toBeUndefined();
          expect(findings[0].requiresHuman).toBe(true);
        }
      }
    });
  });
});
