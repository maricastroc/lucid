import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/locales/pt-BR";
import type { PtConfig as Config } from "@/locales/pt-BR";
import { analyze } from "@/locales/pt-BR";
import { buildAuditReport } from "../src/app/lib/audit-report";
import { describeDeviation, disabledCriteria } from "../src/app/lib/profile";
import { configDeviations } from "@/lucid";
import { analysisLocale } from "../src/app/locale/active";

const PT = analysisLocale("pt-BR");

const TEXT = "Foi realizada a análise do documento pela comissão competente em sede de procedimento administrativo.";
const META = { generatedAt: "27/07/2026 05:00" };

function report(config: Config | null): string {
  const diagnostic = analyze(TEXT, config ?? undefined);
  return buildAuditReport(diagnostic, diagnostic.findings, META, [], null, config);
}

describe("audit report — the editorial profile travels with the audit", () => {
  it("says nothing about the profile when it is the default", () => {
    expect(report(DEFAULT_CONFIG)).not.toContain("## Perfil editorial");
  });

  it("names every departure and the value it replaced", () => {
    const md = report({ ...DEFAULT_CONFIG, sentenceLength: { warnAbove: 60 } });
    expect(md).toContain("## Perfil editorial");
    expect(md).toContain("Inspecionar frases acima de 60 (padrão: 20)");
    expect(md).toContain("não** rodou com os limiares padrão");
  });

  it("states that a disabled criterion means 'did not look', not 'did not find'", () => {
    const md = report({ ...DEFAULT_CONFIG, passiveVoice: { enabled: false } });
    expect(md).toContain("Voz passiva: desligado (padrão: ligado)");
    expect(md).toContain("não procurei");
    expect(md).toContain("não é comparável a um placar padrão");
  });

  it("keeps the profile section out when the report is built without one", () => {
    expect(report(null)).not.toContain("## Perfil editorial");
  });
});

describe("describeDeviation — every deviation reads as prose, in the criterion's own name", () => {
  it("uses the criterion label for a toggle", () => {
    const config = { ...DEFAULT_CONFIG, mesoclise: { enabled: false } };
    expect(configDeviations(config, DEFAULT_CONFIG).map((d) => describeDeviation(d, "pt-BR", PT))).toEqual([
      "Mesóclise: desligado (padrão: ligado)",
    ]);
  });

  it("uses the knob label for a threshold", () => {
    const config = { ...DEFAULT_CONFIG, paragraphLength: { enabled: true, maxSentences: 9 } };
    expect(configDeviations(config, DEFAULT_CONFIG).map((d) => describeDeviation(d, "pt-BR", PT))).toEqual([
      "Parágrafo longo — acima de (frases) 9 (padrão: 5)",
    ]);
  });

  it("lists disabled criteria by their human label", () => {
    const config = {
      ...DEFAULT_CONFIG,
      passiveVoice: { enabled: false },
      jargon: { enabled: false, suggestFromGlossary: true },
    };
    expect(disabledCriteria(config, "pt-BR", PT)).toEqual(["Voz passiva", "Jargão"]);
  });
});
