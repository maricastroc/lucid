import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildEvalArtifact, serializeEvalArtifact } from "./compute";

/**
 * DRIFT GUARD — the published artifact must be the one the current code produces.
 *
 * Without this, changing a golden and running `npm test` passes green (the evals pin no
 * values), and `eval/report.json` ends up describing a state that no longer exists — the
 * page would publish a number that is not HEAD's, which is exactly the failure mode that
 * turns an eval into marketing. The `goldenHash` makes the divergence detectable; this
 * test DETECTS it.
 *
 * It deliberately runs in the normal suite (no flag, no git): whoever touches a golden or
 * the engine finds out right away, not in code review.
 */
const ARTIFACT_PATH = resolve(__dirname, "../../eval/report.json");
const REGENERATE = "npm run eval";

describe("eval/report.json — drift guard", () => {
  it("the artifact exists in the repository", () => {
    expect(existsSync(ARTIFACT_PATH), `eval/report.json not found — run \`${REGENERATE}\``).toBe(true);
  });

  it("the committed artifact is byte-identical to what the code produces now", () => {
    const onDisk = readFileSync(ARTIFACT_PATH, "utf8");
    const current = serializeEvalArtifact(buildEvalArtifact());

    // Message before comparing giant strings: vitest's diff is unreadable here, so what
    // must reach the author is the instruction, not the whole JSON.
    if (onDisk !== current) {
      const fromDisk = JSON.parse(onDisk) as { stamp?: Record<string, string> };
      const fromCode = JSON.parse(current) as { stamp?: Record<string, string> };
      const stampDiff = Object.keys(fromCode.stamp ?? {}).filter((k) => fromDisk.stamp?.[k] !== fromCode.stamp?.[k]);
      expect.fail(
        `eval/report.json is STALE with respect to the current code/golden — run \`${REGENERATE}\` and commit the result.` +
          (stampDiff.length > 0
            ? ` Stamp diverges in: ${stampDiff
                .map((k) => `${k} (disk ${fromDisk.stamp?.[k]} ≠ code ${fromCode.stamp?.[k]})`)
                .join(", ")}.`
            : " The stamp is identical, so what changed is measured content (counts, precision, recall or coverage)."),
      );
    }

    expect(onDisk).toBe(current);
  });
});
