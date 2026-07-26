import { describe, expect, it } from "vitest";
import { EVAL_SCHEMA_VERSION } from "../src/report/eval/contract";
import { SUPPORTED_SCHEMA_VERSION } from "../src/app/avaliacao/page";
import artifact from "../eval/report.json";

describe("evaluation page — compatibility with the artifact contract", () => {
  it("the page supports the schema version the artifact declares", () => {
    expect(SUPPORTED_SCHEMA_VERSION).toBe(artifact.schemaVersion);
  });

  it("the page supports the version the emitter produces today", () => {
    expect(SUPPORTED_SCHEMA_VERSION).toBe(EVAL_SCHEMA_VERSION);
  });
});
