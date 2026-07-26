import { describe, expect, it } from "vitest";
import { REGISTRY, DOCUMENT_DATASETS, datasetFingerprint, dataHashFor, type DatasetId } from "../src/locales/pt-BR/datasets/registry";
import { analyze } from "../src/lucid";
import { PASSES } from "../src/locales/pt-BR/passes/registry";
import { localePtBR } from "../src/locales/pt-BR";

describe("data registry — fingerprints", () => {
  it("every dataset has an 8 hex char fingerprint, stable across calls", () => {
    for (const id of Object.keys(REGISTRY) as DatasetId[]) {
      const fp = datasetFingerprint(id);
      expect(fp).toMatch(/^[0-9a-f]{8}$/);
      expect(datasetFingerprint(id)).toBe(fp);
    }
  });

  it("every record carries an id and non-empty provenance (inline auditability)", () => {
    for (const id of Object.keys(REGISTRY) as DatasetId[]) {
      expect(REGISTRY[id].id).toBe(id);
      expect(REGISTRY[id].provenance.length).toBeGreaterThan(0);
    }
  });
});

describe("data registry — dataHash", () => {
  it("is deterministic and independent of the order/duplication of ids", () => {
    const a = dataHashFor(["jargao.pt", "verbos-ser.pt"]);
    const b = dataHashFor(["verbos-ser.pt", "jargao.pt", "jargao.pt"]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it("changes when the set of datasets in play changes", () => {
    const one = dataHashFor(["jargao.pt"]);
    const two = dataHashFor(["jargao.pt", "verbos-ser.pt"]);
    expect(one).not.toBe(two);
  });
});

describe("data registry — integration with analyze", () => {
  it("analyze stamps dataHash into meta", () => {
    const d = analyze("O relatório foi analisado pela comissão.");
    expect(d.meta.dataHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("analyze's dataHash matches the hash of the declared deps (doc + passes + metrics)", () => {
    const expected = dataHashFor([
      ...DOCUMENT_DATASETS,
      ...PASSES.flatMap((p) => p.dataDeps ?? []),
      ...(localePtBR.metrics.dataDeps ?? []),
    ] as DatasetId[]);
    const d = analyze("Qualquer texto.");
    expect(d.meta.dataHash).toBe(expected);
  });

  it("every dataDep declared by a pass exists in the registry", () => {
    for (const pass of PASSES) {
      for (const dep of pass.dataDeps ?? []) {
        expect(REGISTRY[dep as DatasetId]).toBeDefined();
      }
    }
  });
});
