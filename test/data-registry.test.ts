import { describe, expect, it } from "vitest";
import { REGISTRY, DOCUMENT_DATASETS, datasetFingerprint, dataHashFor, type DatasetId } from "../src/locales/pt-BR/datasets/registry";
import { analyze } from "../src/lucid";
import { PASSES } from "../src/locales/pt-BR/passes/registry";
import { localePtBR } from "../src/locales/pt-BR";

describe("data registry — fingerprints", () => {
  it("todo dataset tem fingerprint de 8 hex chars, estável entre chamadas", () => {
    for (const id of Object.keys(REGISTRY) as DatasetId[]) {
      const fp = datasetFingerprint(id);
      expect(fp).toMatch(/^[0-9a-f]{8}$/);
      expect(datasetFingerprint(id)).toBe(fp);
    }
  });

  it("cada record carrega id e proveniência não-vazia (auditabilidade inline)", () => {
    for (const id of Object.keys(REGISTRY) as DatasetId[]) {
      expect(REGISTRY[id].id).toBe(id);
      expect(REGISTRY[id].provenance.length).toBeGreaterThan(0);
    }
  });
});

describe("data registry — dataHash", () => {
  it("é determinístico e independe da ordem/duplicação dos ids", () => {
    const a = dataHashFor(["jargao.pt", "verbos-ser.pt"]);
    const b = dataHashFor(["verbos-ser.pt", "jargao.pt", "jargao.pt"]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it("muda quando o conjunto de datasets em jogo muda", () => {
    const um = dataHashFor(["jargao.pt"]);
    const dois = dataHashFor(["jargao.pt", "verbos-ser.pt"]);
    expect(um).not.toBe(dois);
  });
});

describe("data registry — integração com analyze", () => {
  it("analyze estampa dataHash no meta", () => {
    const d = analyze("O relatório foi analisado pela comissão.");
    expect(d.meta.dataHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("o dataHash do analyze bate com o hash dos deps declarados (doc + passes + métricas)", () => {
    const expected = dataHashFor([
      ...DOCUMENT_DATASETS,
      ...PASSES.flatMap((p) => p.dataDeps ?? []),
      ...(localePtBR.metrics.dataDeps ?? []),
    ] as DatasetId[]);
    const d = analyze("Qualquer texto.");
    expect(d.meta.dataHash).toBe(expected);
  });

  it("todo dataDep declarado por um pass existe no registry", () => {
    for (const pass of PASSES) {
      for (const dep of pass.dataDeps ?? []) {
        expect(REGISTRY[dep as DatasetId]).toBeDefined();
      }
    }
  });
});
