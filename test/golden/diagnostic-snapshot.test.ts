import { describe, expect, it } from "vitest";
import { analyze } from "../../src/lucid/core/analyzer";
import { GOLDEN_INTEGRADO } from "./integrated-golden";

const IDS_SNAPSHOT = [
  "texto_vazio",
  "admin_simples_sem_finding",
  "frase_longa",
  "voz_passiva_com_e_sem_agente",
  "nominalizacao_com_sugestao",
  "juridico_com_jargao",
  "quatro_criterios_span_sobreposto",
  "termos_protegidos_por_guardas",
  "unicode_aspas_travessao",
] as const;

const casosSnapshot = IDS_SNAPSHOT.map((id) => {
  const caso = GOLDEN_INTEGRADO.find((c) => c.id === id);
  if (!caso) throw new Error(`caso de snapshot inexistente no golden: ${id}`);
  return caso;
});

describe("estabilidade das âncoras de snapshot (antes de comparar retratos)", () => {
  it("meta é composto só de constantes estáveis e hashes puros (Config + dados)", () => {
    const d = analyze("Um texto qualquer para checar o meta.");
    expect(d.meta.lucidVersion).toBe("0.1.0");
    expect(d.meta.standardVersion).toBe("ABNT NBR ISO 24495-1:2024");
    expect(d.meta.configHash).toMatch(/^[0-9a-f]{8}$/);
    expect(d.meta.dataHash).toMatch(/^[0-9a-f]{8}$/);
    expect(Object.keys(d.meta).sort()).toEqual(["configHash", "dataHash", "lucidVersion", "standardVersion"]);
  });
});

describe("snapshots do Diagnostic completo", () => {
  it.each(casosSnapshot)("$id", (caso) => {
    const diagnostic = analyze(caso.text);
    expect(diagnostic).toMatchSnapshot();
  });
});
