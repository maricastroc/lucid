import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildAssistedCorpus, defaultAssistedSources } from "./assisted-corpus";
import { buildEvalArtifact } from "./compute";
import type { AssistedMeasurement, AssistedStratum } from "../../src/report/eval/contract";

const sources = defaultAssistedSources();
const band = buildAssistedCorpus(sources);

const raw = JSON.parse(readFileSync(sources.measurementPath, "utf8")) as {
  criteria: (AssistedMeasurement & { strata: { random: AssistedStratum; cued: AssistedStratum } })[];
};

const rates = (s: AssistedStratum) => [s.precision, s.recall, s.precisionInterval, s.recallInterval];
const counts = (s: AssistedStratum) => ({ cases: s.cases, negatives: s.negatives, tp: s.tp, fp: s.fp, fn: s.fn });

describe("corpus-assisted band — publication invariants", () => {
  it("the band exists in this tree", () => {
    expect(band).not.toBeNull();
  });

  it("a withheld criterion publishes no rate — in either stratum", () => {
    for (const c of band!.criteria.filter((c) => !c.promoted)) {
      expect(rates(c.strata.random), `${c.criterion} random`).toEqual([null, null, null, null]);
      expect(rates(c.strata.cued), `${c.criterion} cued`).toEqual([null, null, null, null]);
    }
  });

  it("a withheld criterion still says, measured, why the number is not published", () => {
    for (const c of band!.criteria.filter((c) => !c.promoted)) {
      expect(c.withheldReason, c.criterion).toBeTruthy();
    }
  });

  it("a promoted criterion carries no withholding reason", () => {
    for (const c of band!.criteria.filter((c) => c.promoted)) {
      expect(c.withheldReason, c.criterion).toBeNull();
    }
  });

  it("redaction removes the rate and keeps the count — counts match the measurement exactly", () => {
    for (const c of band!.criteria) {
      const source = raw.criteria.find((r) => r.criterion === c.criterion)!;
      expect(counts(c.strata.random), `${c.criterion} random`).toEqual(counts(source.strata.random));
      expect(counts(c.strata.cued), `${c.criterion} cued`).toEqual(counts(source.strata.cued));
    }
  });

  it("the enriched stratum never publishes recall, promoted or not — it would measure the cue", () => {
    for (const c of band!.criteria) {
      expect(c.strata.cued.recall, c.criterion).toBeNull();
      expect(c.strata.cued.recallInterval, c.criterion).toBeNull();
    }
  });

  it("every published rate travels with its interval", () => {
    for (const c of band!.criteria) {
      for (const stratum of [c.strata.random, c.strata.cued]) {
        if (stratum.precision !== null) expect(stratum.precisionInterval).not.toBeNull();
        if (stratum.recall !== null) expect(stratum.recallInterval).not.toBeNull();
      }
    }
  });

  it("measuredAssisted and withheld partition the measured criteria", () => {
    const promoted = band!.criteria.filter((c) => c.promoted).map((c) => c.criterion);
    const rest = band!.criteria.filter((c) => !c.promoted).map((c) => c.criterion);
    expect(band!.measuredAssisted).toEqual(promoted);
    expect(band!.withheld).toEqual(rest);
    expect([...band!.measuredAssisted, ...band!.withheld].sort()).toEqual(
      band!.criteria.map((c) => c.criterion).sort(),
    );
  });

  it("the assisted band never merges into the authored partition", () => {
    const artifact = buildEvalArtifact();
    const authored = new Set(artifact.detectors.map((d) => d.criterion));

    for (const c of artifact.assistedCorpus!.measuredAssisted) {
      if (!authored.has(c)) expect(artifact.criteriaCoverage.measured).not.toContain(c);
    }

    expect([...artifact.criteriaCoverage.measured].sort()).toEqual([...authored].sort());
  });

  it("the artifact carries the band and its provenance", () => {
    const artifact = buildEvalArtifact();
    expect(artifact.assistedCorpus).not.toBeNull();
    expect(artifact.assistedCorpus!.labelers.length).toBeGreaterThanOrEqual(2);
    expect(artifact.assistedCorpus!.hashes.passages.length).toBe(64);
    expect(artifact.method.caveats.map((c) => c.id)).toContain("assisted_supervision");
  });

  it("returns null when the corpus was not built in this tree — not an empty band", () => {
    expect(buildAssistedCorpus({ manifestPath: "/nope/manifest.json", measurementPath: "/nope/m.json" })).toBeNull();
  });
});

describe("corpus-assisted band — redaction proven on synthetic input", () => {
  const dir = mkdtempSync(join(tmpdir(), "lucid-assisted-"));
  const manifestPath = join(dir, "manifest.json");
  const measurementPath = join(dir, "measurement.json");

  const fullStratum: AssistedStratum = {
    cases: 20,
    negatives: 12,
    tp: 6,
    fp: 2,
    fn: 1,
    precision: 0.75,
    recall: 0.8571,
    precisionInterval: { low: 0.4091, high: 0.9294 },
    recallInterval: { low: 0.4869, high: 0.9734 },
  };

  const criterion = (name: string, promoted: boolean) => ({
    criterion: name,
    promoted,
    withheldReason: promoted ? null : "AC1 abaixo do piso de 0.7",
    agreementFloor: 0.7,
    agreement: { n: 30, rawAgreement: 0.9, cohenKappa: 0.8, gwetAc1: promoted ? 0.88 : 0.31, positiveRate: 0.4 },
    composition: { human: 4, consensus: 16, modelOnly: 0 },
    consensusAudit: { n: 3, disagreements: 0, errorRate: 0, interval: { low: 0, high: 0.5619 } },
    strata: { random: { ...fullStratum }, cued: { ...fullStratum } },
  });

  writeFileSync(manifestPath, JSON.stringify({ counts: { documents: 9, passages: 99 } }));
  writeFileSync(
    measurementPath,
    JSON.stringify({
      corpusVersion: "vX",
      split: "dev",
      sealed: false,
      hashes: { documents: "d", passages: "p", labels: {} },
      labelers: [{ id: "a", model: "m", promptVersion: "p@1", temperature: 0 }],
      policy: { agreementFloor: 0.7 },
      criteria: [criterion("retido", false), criterion("promovido", true)],
      caveats: [],
    }),
  );

  const synthetic = buildAssistedCorpus({ manifestPath, measurementPath })!;
  const withheld = synthetic.criteria.find((c) => c.criterion === "retido")!;
  const promoted = synthetic.criteria.find((c) => c.criterion === "promovido")!;

  it("strips every rate off the withheld criterion, though the source had all four", () => {
    expect(rates(withheld.strata.random)).toEqual([null, null, null, null]);
    expect(rates(withheld.strata.cued)).toEqual([null, null, null, null]);
  });

  it("keeps the withheld criterion's counts so a dissenter can recompute", () => {
    expect(counts(withheld.strata.random)).toEqual({ cases: 20, negatives: 12, tp: 6, fp: 2, fn: 1 });
  });

  it("preserves the promoted criterion's random-stratum rates and intervals", () => {
    expect(promoted.strata.random.precision).toBe(0.75);
    expect(promoted.strata.random.recall).toBe(0.8571);
    expect(promoted.strata.random.precisionInterval).toEqual({ low: 0.4091, high: 0.9294 });
    expect(promoted.strata.random.recallInterval).toEqual({ low: 0.4869, high: 0.9734 });
  });

  it("still refuses recall on the promoted criterion's enriched stratum, keeping its precision", () => {
    expect(promoted.strata.cued.precision).toBe(0.75);
    expect(promoted.strata.cued.recall).toBeNull();
    expect(promoted.strata.cued.recallInterval).toBeNull();
  });

  it("sorts the two criteria into the right published lists", () => {
    expect(synthetic.measuredAssisted).toEqual(["promovido"]);
    expect(synthetic.withheld).toEqual(["retido"]);
  });
});
