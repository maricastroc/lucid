import { describe, expect, it } from "vitest";
import { createDataView } from "../../src/locales/pt-BR/datasets/registry";
import { nominalizationPass } from "../../src/locales/pt-BR/passes/nominalization";
import { DEFAULT_CONFIG } from "../../src/lucid/core/config";
import { buildDocument } from "../support/pt";
import { GOLDEN_NOMINALIZACAO } from "./nominalization-golden";
import { formatRate, evaluateNominalization } from "./compute";

describe("nominalizationPass evaluation — golden set", () => {
  const { results, summary } = evaluateNominalization();

  const emittedSuggestions = results.filter((r) => r.sugestaoEmitida);
  const wrongClassifications = results.filter((r) => r.classificacaoErrada);
  const detectionErrors = results.filter((r) => r.fp > 0 || r.fn > 0);

  it("report: TP/FP/FN, precision, recall, mapping classification", () => {
    console.log(
      `\n[eval nominalization] ${summary.cases} examples (${summary.negatives} negatives) · ` +
        `TP=${summary.tp} FP=${summary.fp} FN=${summary.fn} · precision=${formatRate(summary.precision)} · recall=${formatRate(summary.recall)} · ` +
        `wrong classifications=${wrongClassifications.length} · suggestions emitted=${emittedSuggestions.length} (must be 0)`,
    );
    if (detectionErrors.length > 0) {
      console.log(
        "[eval nominalization] detection errors:\n" +
          detectionErrors
            .map((r) => `  - "${r.texto}": expected=${r.expectedCount}, actual=${r.actualCount} (${r.estado})`)
            .join("\n"),
      );
    }

    expect(summary.cases).toBeGreaterThan(0);
  });

  it("the golden has NEGATIVE cases — without them precision would be 100% by construction", () => {
    expect(summary.negatives).toBeGreaterThan(0);
  });

  it("the engine never emits a composed suggestion — hard invariant of ADR-054", () => {
    expect(emittedSuggestions, `suggestions emitted: ${JSON.stringify(emittedSuggestions)}`).toEqual([]);
  });

  it("the mapping classification (requiresHuman) matches the curation", () => {
    expect(wrongClassifications, `wrong classifications: ${JSON.stringify(wrongClassifications)}`).toEqual([]);
  });

  it("every 'limitacao_conhecida' entry has a documented motivo", () => {
    for (const entry of GOLDEN_NOMINALIZACAO) {
      if (entry.estado === "limitacao_conhecida") {
        expect(entry.motivo, `"${entry.texto}" is flagged as a limitation but has no motivo`).toBeTruthy();
      }
    }
  });

  it("no 'correto' entry is actually incorrect (regression)", () => {
    const correctButFailing = results.filter(
      (r) => r.estado === "correto" && (r.fp > 0 || r.fn > 0 || r.sugestaoEmitida || r.classificacaoErrada),
    );
    expect(correctButFailing, `"correto" entries that failed: ${JSON.stringify(correctButFailing)}`).toEqual([]);
  });

  describe.each(GOLDEN_NOMINALIZACAO.filter((e) => e.estado === "correto"))("correct entry: '$texto'", (entry) => {
    it(`produces exactly ${entry.expectedCount} finding(s), with no suggestion and the right classification`, () => {
      const doc = buildDocument(entry.texto);
      const findings = nominalizationPass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });
      expect(findings).toHaveLength(entry.expectedCount);
      for (const f of findings) expect(f.suggestion).toBeUndefined();

      if (entry.expectedCount === 1 && entry.expectRequiresHuman !== undefined) {
        expect(findings[0].requiresHuman).toBe(entry.expectRequiresHuman);
      }
    });
  });
});
