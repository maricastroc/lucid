import { describe, expect, it } from "vitest";
import { analyze } from "../../src/lucid";
import { GOLDEN_INTEGRADO } from "./integrated-golden";

const SNAPSHOT_IDS = [
  "texto_vazio",
  "admin_simples_sem_finding",
  "frase_longa",
  "voz_passiva_com_e_sem_agente",
  "nominalizacao_mapeamento_unico",
  "juridico_com_jargao",
  "quatro_criterios_span_sobreposto",
  "termos_protegidos_por_guardas",
  "unicode_aspas_travessao",
] as const;

const snapshotCases = SNAPSHOT_IDS.map((id) => {
  const testCase = GOLDEN_INTEGRADO.find((c) => c.id === id);
  if (!testCase) throw new Error(`snapshot case missing from the golden set: ${id}`);
  return testCase;
});

describe("stability of the snapshot anchors (before comparing portraits)", () => {
  it("meta is made only of stable constants and pure hashes (Config + data)", () => {
    const d = analyze("Um texto qualquer para checar o meta.");
    expect(d.meta.lucidVersion).toBe("0.1.0");
    expect(d.meta.localeId).toBe("pt-BR");
    expect(d.meta.standardVersion).toBe("ABNT NBR ISO 24495-1:2024");
    expect(d.meta.configHash).toMatch(/^[0-9a-f]{8}$/);
    expect(d.meta.dataHash).toMatch(/^[0-9a-f]{8}$/);
    expect(Object.keys(d.meta).sort()).toEqual([
      "configHash",
      "dataHash",
      "localeId",
      "lucidVersion",
      "standardVersion",
    ]);
  });

  it("without the localeId, meta is byte-identical to the previous contract", () => {
    const d = analyze("Um texto qualquer para checar o meta.");
    const metaWithoutLocale: Record<string, unknown> = { ...d.meta };
    delete metaWithoutLocale.localeId;
    expect(Object.keys(metaWithoutLocale).sort()).toEqual(["configHash", "dataHash", "lucidVersion", "standardVersion"]);
  });
});

describe("snapshots of the full Diagnostic", () => {
  it.each(snapshotCases)("$id", (testCase) => {
    const diagnostic = analyze(testCase.text);
    expect(diagnostic).toMatchSnapshot();
  });
});
