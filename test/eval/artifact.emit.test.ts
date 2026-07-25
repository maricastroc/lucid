import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildEvalArtifact, serializeEvalArtifact } from "./compute";

/**
 * Emissor do artefato de eval — GATEADO, roda só via `npm run eval`.
 *
 * Fica atrás de um flag pelo mesmo motivo do benchmark (`BENCHMARK=1`): escrever arquivo
 * em toda rodada de `npm test` sujaria o working tree e transformaria o artefato em ruído
 * de git. As INVARIANTES do artefato são cobertas sem flag em `artifact.test.ts`, então o
 * CI valida o conteúdo mesmo sem gravar.
 */
const RUN = process.env.EVAL_ARTIFACT === "1";
const OUT = resolve(__dirname, "../../eval/report.json");

describe.skipIf(!RUN)("emissão do artefato de eval", () => {
  it("escreve eval/report.json com a estampa da rodada", () => {
    const artifact = buildEvalArtifact();
    const serialized = serializeEvalArtifact(artifact);

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, serialized, "utf8");

    const { stamp, detectors, criteriaCoverage } = artifact;
    console.log(
      `\n[eval] artefato escrito em eval/report.json\n` +
        `  lucid ${stamp.lucidVersion} · locale ${stamp.localeId} · config ${stamp.configHash} · data ${stamp.dataHash}\n` +
        detectors
          .map(
            (d) =>
              `  ${d.criterion} (${d.coverage}): ${d.summary.cases} casos, ${d.summary.negatives} negativos · ` +
              `precisão ${(d.summary.precision * 100).toFixed(1)}% · recall ${(d.summary.recall * 100).toFixed(1)}% · ` +
              `${d.summary.limitations} limitação(ões)`,
          )
          .join("\n") +
        `\n  cobertura: ${criteriaCoverage.measured.length} medidos · ` +
        `${criteriaCoverage.goldenLabelledOnly.length} só rotulados · ` +
        `${criteriaCoverage.unitTestsOnly.length} só teste unitário (de ${criteriaCoverage.total})`,
    );

    expect(serialized.length).toBeGreaterThan(0);
  });
});
