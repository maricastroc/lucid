import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildEvalArtifact, formatRate, serializeEvalArtifact } from "./compute";

const RUN = process.env.EVAL_ARTIFACT === "1";
const OUT = resolve(__dirname, "../../eval/report.json");

describe.skipIf(!RUN)("eval artifact emission", () => {
  it("writes eval/report.json with the stamp of this run", () => {
    const artifact = buildEvalArtifact();
    const serialized = serializeEvalArtifact(artifact);

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, serialized, "utf8");

    const { stamp, detectors, criteriaCoverage } = artifact;
    console.log(
      `\n[eval] artifact written to eval/report.json\n` +
        `  lucid ${stamp.lucidVersion} · locale ${stamp.localeId} · config ${stamp.configHash} · data ${stamp.dataHash}\n` +
        detectors
          .map(
            (d) =>
              `  ${d.criterion} (${d.coverage}): ${d.summary.cases} cases, ${d.summary.negatives} negatives · ` +
              `precision ${formatRate(d.summary.precision)} · recall ${formatRate(d.summary.recall)} · ` +
              `${d.summary.limitations} limitation(s)`,
          )
          .join("\n") +
        `\n  coverage: ${criteriaCoverage.measured.length} measured · ` +
        `${criteriaCoverage.goldenLabelledOnly.length} labelled only · ` +
        `${criteriaCoverage.unitTestsOnly.length} unit tests only (of ${criteriaCoverage.total})`,
    );

    expect(serialized.length).toBeGreaterThan(0);
  });
});
