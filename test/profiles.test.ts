import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeDocument, buildDocument, buildStructuredDocument, DEFAULT_CONFIG, ptDocumentServices } from "@/lucid";
import { htmlToRawBlocks } from "@/importers/html-blocks";
import { buildAuditReport } from "@/app/lib/audit-report";
import {
  PROFILE_IDS,
  PROFILE_VERSION,
  isProfileId,
  profileConfig,
  profileDifferences,
  profileHash,
  profileOf,
} from "@/app/lib/profiles";
import { GDOCS_HTML } from "./fixtures/gdocs-clipboard";

const EDITAL = buildStructuredDocument(htmlToRawBlocks(GDOCS_HTML), ptDocumentServices);
const LEI = buildDocument(readFileSync("corpus/v1/text/planalto-leis__1989-1994-l8000.txt", "utf8"));
const count = (doc: typeof LEI, id: (typeof PROFILE_IDS)[number], criterion?: string) => {
  const findings = analyzeDocument(doc, profileConfig(id)).findings;
  return criterion === undefined ? findings.length : findings.filter((f) => f.criterion === criterion).length;
};

describe("a purpose is a different measure, not a different label", () => {
  it("gives every profile its own configHash", () => {
    const hashes = PROFILE_IDS.map(profileHash);
    expect(new Set(hashes).size).toBe(PROFILE_IDS.length);
  });

  it("changes what the same document scores", () => {
    const totals = PROFILE_IDS.map((id) => count(EDITAL, id));
    expect(new Set(totals).size).toBe(PROFILE_IDS.length);
  });

  it("loosens the sentence limit for normative text and tightens it for the public", () => {
    expect(count(EDITAL, "normativo", "long_sentence")).toBeLessThan(count(EDITAL, "base", "long_sentence"));
    expect(count(EDITAL, "publico", "long_sentence")).toBeGreaterThan(count(EDITAL, "base", "long_sentence"));
  });

  it("separates the two strict profiles by what each one is strict about", () => {
    expect(count(EDITAL, "digital", "paragraph_length")).toBeGreaterThan(count(EDITAL, "publico", "paragraph_length"));
    expect(count(EDITAL, "publico", "subordinacao_densa")).toBeGreaterThan(
      count(EDITAL, "digital", "subordinacao_densa"),
    );
  });

  it("carries the same difference into legal text", () => {
    expect(count(LEI, "normativo", "long_sentence")).toBeLessThan(count(LEI, "base", "long_sentence"));
    expect(count(LEI, "publico", "long_sentence")).toBeGreaterThan(count(LEI, "base", "long_sentence"));
  });

  it("declares each difference against the default, field by field", () => {
    expect(profileDifferences("base")).toEqual([]);
    for (const id of PROFILE_IDS.filter((x) => x !== "base")) {
      const differences = profileDifferences(id);
      expect(differences.length).toBeGreaterThan(0);
      for (const d of differences) expect(d.base).not.toBe(d.value);
    }
  });

  it("recognises the config it produced, and refuses an unknown name", () => {
    for (const id of PROFILE_IDS) expect(profileOf(profileConfig(id))).toBe(id);
    expect(profileOf({ ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 7, errorAbove: 9 } })).toBeNull();
    expect(isProfileId("cartilha")).toBe(false);
    expect(isProfileId("publico")).toBe(true);
  });
});

describe("the report carries the profile it was produced under", () => {
  const findings = analyzeDocument(LEI, profileConfig("normativo")).findings;
  const report = (id: (typeof PROFILE_IDS)[number]) =>
    buildAuditReport(
      analyzeDocument(LEI, profileConfig(id)),
      findings,
      { generatedAt: "x" },
      [],
      null,
      profileConfig(id),
      null,
      null,
      id,
    );

  it("names the purpose, the version and the hash", () => {
    const md = report("normativo");
    expect(md).toContain("**Finalidade declarada:** Normativo ou contratual");
    expect(md).toContain(`versão ${PROFILE_VERSION}`);
    expect(md).toContain(profileHash("normativo"));
  });

  it("states the limits of comparing that score with another", () => {
    expect(report("normativo")).toContain("não é comparável a um padrão");
    expect(report("publico")).toContain("perfil errado para aquele documento");
    expect(report("digital")).toContain("quatro critérios ficam sem objeto");
  });

  it("says when the thresholds are the profile's own, with no hand adjustment", () => {
    expect(report("normativo")).toContain("sem ajuste manual");
  });

  it("stays silent for the default profile with no adjustment", () => {
    expect(report("base")).not.toContain("## Perfil editorial");
  });
});
