import { describe, expect, it } from "vitest";
import { analyze, type Finding } from "@/lucid";
import { totalBurden } from "@/report/rewrite";
import { buildConfidence, detectedProse, detectionHeadline } from "@/app/lib/narrative";

const AMBIGUOS = ["A resposta é adequada.", "O servidor é aposentado.", "O caso é complicado."];
const CONFIANTES = ["A proposta foi aprovada.", "O pedido será analisado pelo setor."];

const passivas = (text: string): Finding[] => analyze(text).findings.filter((f) => f.criterion === "passive_voice");

describe("the present with no agent is an observation, not a warning", () => {
  it.each(AMBIGUOS)("%s → info, still in the audit, still the author's call", (text) => {
    const [finding] = passivas(text);
    expect(finding).toBeDefined();
    expect(finding.severity).toBe("info");
    expect(finding.requiresHuman).toBe(true);
    expect(finding.meta).toMatchObject({ eventiveness: "ambiguous_present" });
  });

  it.each(CONFIANTES)("%s → keeps the severity a confirmed passive always had", (text) => {
    const [finding] = passivas(text);
    expect(finding).toBeDefined();
    expect(finding.severity).toBe("warning");
  });

  it("still asks for a human only where the agent is missing, which the downgrade does not touch", () => {
    expect(passivas("A proposta foi aprovada.")[0].requiresHuman).toBe(true);
    expect(passivas("O pedido será analisado pelo setor.")[0].requiresHuman).toBe(false);
  });

  it("names the other readings and asks the author to settle it from the context", () => {
    const [finding] = passivas(AMBIGUOS[0]);
    for (const piece of ["Possível voz passiva", "estado ou característica", "confirme o sentido pelo contexto"]) {
      expect(finding.justification).toContain(piece);
    }
  });

  it("never says outright that the sentence is in the passive voice", () => {
    for (const text of AMBIGUOS) expect(passivas(text)[0].justification).not.toContain("Frase na voz passiva");
    for (const text of CONFIANTES) expect(passivas(text)[0].justification).toContain("Frase na voz passiva");
  });
});

describe("what the downgrade changes downstream", () => {
  it("weighs a third of a confirmed passive, instead of the same", () => {
    expect(totalBurden(passivas("O caso é complicado."))).toBeCloseTo(0.3);
    expect(totalBurden(passivas("A proposta foi aprovada."))).toBeCloseTo(1);
  });

  it("moves the count from the warning column to the observation one, without leaving the score", () => {
    const score = analyze("O caso é complicado.").score.byCriterion.find((c) => c.criterion === "passive_voice")!;
    expect(score.count).toEqual({ info: 1, warning: 0, error: 0 });
    expect(analyze("O caso é complicado.").score.totalFindings).toBe(analyze("O caso é complicado.").findings.length);
  });

  it("leaves every other reading of the passive alone", () => {
    const comAgente = passivas("O laudo foi assinado por João.")[0];
    const eventiva = passivas("O processo será encaminhado ao setor.")[0];
    expect([comAgente.severity, eventiva.severity]).toEqual(["warning", "warning"]);
    expect(comAgente.meta).toMatchObject({ eventiveness: "agent" });
    expect(eventiva.meta).toMatchObject({ eventiveness: "eventive_tense" });
  });

  it("does not touch the synthetic passive, which is a criterion of its own", () => {
    const findings = analyze("Aplica-se a multa ao infrator.").findings.filter(
      (f) => f.criterion === "passiva_sintetica",
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("warning");
  });
});

describe("what the reader is told about an ambiguous point", () => {
  it.each(AMBIGUOS)("%s → the headline stops short of calling it a passive", (text) => {
    expect(detectionHeadline(passivas(text)[0], "pt-BR")).toBe("Pode ser voz passiva");
  });

  it.each(CONFIANTES)("%s → the headline still names the passive it is", (text) => {
    expect(detectionHeadline(passivas(text)[0], "pt-BR")).toMatch(/^Voz passiva (com|sem) agente$/);
  });

  it("spells out the three readings, in both languages", () => {
    expect(detectedProse(passivas(AMBIGUOS[0])[0], "pt-BR")).toContain("um estado e para uma característica");
    expect(detectedProse(passivas(AMBIGUOS[0])[0], "en")).toContain("a state and a plain characteristic");
  });

  it("offers marking it as seen, which a confirmed passive never does", () => {
    const ambiguo = JSON.stringify(buildConfidence(passivas(AMBIGUOS[0])[0], "pt-BR"));
    const confirmada = JSON.stringify(buildConfidence(passivas(CONFIANTES[0])[0], "pt-BR"));
    expect(ambiguo).toContain("marcado como visto");
    expect(confirmada).not.toContain("marcado como visto");
  });
});
