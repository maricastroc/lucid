import { describe, expect, it } from "vitest";
import { EVAL_SCHEMA_VERSION } from "../src/report/eval/contract";
import { SUPPORTED_SCHEMA_VERSION } from "../src/app/avaliacao/page";
import artifact from "../eval/report.json";

/**
 * The evaluation page is PRESENTATION: it reads `eval/report.json` and recalculates nothing.
 * The only coupling that can rot silently is the schema version — if the artifact changes
 * shape and the page is not updated, the user would see the incompatibility state in
 * production. This test makes that mismatch break the build.
 */
describe("evaluation page — compatibility with the artifact contract", () => {
  it("the page supports the schema version the artifact declares", () => {
    expect(SUPPORTED_SCHEMA_VERSION).toBe(artifact.schemaVersion);
  });

  it("the page supports the version the emitter produces today", () => {
    expect(SUPPORTED_SCHEMA_VERSION).toBe(EVAL_SCHEMA_VERSION);
  });
});
