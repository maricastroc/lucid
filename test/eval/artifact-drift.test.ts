import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildEvalArtifact, serializeEvalArtifact } from "./compute";

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
