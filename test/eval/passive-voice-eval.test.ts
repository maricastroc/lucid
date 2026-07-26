import { describe, expect, it } from "vitest";
import { createDataView } from "../../src/locales/pt-BR/datasets/registry";
import { passiveVoicePass } from "../../src/locales/pt-BR/passes/passive-voice";
import { DEFAULT_CONFIG } from "../../src/lucid/core/config";
import { buildDocument } from "../support/pt";
import { GOLDEN_VOZ_PASSIVA } from "./passive-voice-golden";
import { formatRate, evaluatePassiveVoice } from "./compute";

describe("passiveVoicePass evaluation — golden set", () => {

  const { results, summary } = evaluatePassiveVoice();

  const wrong = results.filter((r) => r.fp > 0 || r.fn > 0);

  it("report: TP/FP/FN, precision and recall over the full golden set", () => {
    console.log(
      `\n[eval passive-voice] ${summary.cases} examples (${summary.negatives} negatives) · ` +
        `TP=${summary.tp} FP=${summary.fp} FN=${summary.fn} · ` +
        `precision=${formatRate(summary.precision)} · recall=${formatRate(summary.recall)}`,
    );
    if (wrong.length > 0) {
      console.log(
        "[eval passive-voice] errors:\n" +
          wrong
            .map(
              (r) =>
                `  - "${r.texto}": expected=${r.expectedCount}, actual=${r.actualCount} ` +
                `(fp=${r.fp}, fn=${r.fn}, ${r.estado})`,
            )
            .join("\n"),
      );
    }

    expect(summary.cases).toBeGreaterThan(0);
  });

  it("the golden has NEGATIVE cases — without them precision would be 100% by construction", () => {
    expect(summary.negatives).toBeGreaterThan(0);
  });

  it("every 'limitacao_conhecida' entry has a documented motivo", () => {
    for (const entry of GOLDEN_VOZ_PASSIVA) {
      if (entry.estado === "limitacao_conhecida") {
        expect(entry.motivo, `"${entry.texto}" is flagged as a limitation but has no motivo`).toBeTruthy();
      }
    }
  });

  it("no 'correto' entry is actually incorrect (regression)", () => {
    const correctButFailing = results.filter((r) => r.estado === "correto" && (r.fp > 0 || r.fn > 0));
    expect(correctButFailing, `"correto" entries that failed: ${JSON.stringify(correctButFailing)}`).toEqual([]);
  });

  describe.each(GOLDEN_VOZ_PASSIVA.filter((e) => e.estado === "correto"))("correct entry: '$texto'", (entry) => {
    it(`produces exactly ${entry.expectedCount} finding(s)`, () => {
      const doc = buildDocument(entry.texto);
      const findings = passiveVoicePass.run({ doc, config: DEFAULT_CONFIG, data: createDataView([]) });
      expect(findings).toHaveLength(entry.expectedCount);
    });
  });
});
