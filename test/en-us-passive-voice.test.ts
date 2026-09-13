import { describe, expect, it } from "vitest";
import { analyzeWithLocale } from "@/lucid";
import { localeEnUS } from "@/locales/en-US";
import { analysisLocale } from "@/app/locale/active";
import { detectedProse, detectionHeadline } from "@/app/lib/narrative";
import { metaFor } from "@/app/lib/criteria";

const passives = (text: string) =>
  analyzeWithLocale(text, localeEnUS).findings.filter((f) => f.criterion === "passive_voice");

describe("en-US passive_voice — what one finding carries", () => {
  it("with an agent: the span runs to the end of the agent, and the finding does not ask for a human", () => {
    const [f] = passives("The application was approved by the director.");
    expect(f.span.text).toBe("was approved by the director");
    expect(f.meta).toMatchObject({ hasAgent: true, form: "past", agentTruncated: false });
    expect(f.requiresHuman).toBe(false);
    expect(f.suggestion).toBeUndefined();
    expect(f.normativeReference).toEqual({ standard: "ISO 24495-1", section: "5.3.3" });
  });

  it("without an agent: the finding asks for a human, because only the author knows who acts", () => {
    const [f] = passives("Your application was denied.");
    expect(f.meta).toMatchObject({ hasAgent: false, form: "past" });
    expect(f.requiresHuman).toBe(true);
    expect(f.justification).toMatch(/does not supply the missing agent/);
  });

  it("perfect and modal forms start at the auxiliary", () => {
    expect(passives("The deadline has not been extended.")[0].span.text).toBe("has not been extended");
    expect(passives("Late payments will not be accepted.")[0].span.text).toBe("will not be accepted");
    expect(passives("The deadline has been extended.")[0].meta?.form).toBe("perfect");
    expect(passives("Your case is being reviewed.")[0].meta?.form).toBe("progressive");
  });

  it("a 'by' of time or means is not an agent", () => {
    for (const text of ["Payments must be made by check.", "The form must be received by March 31."]) {
      const [f] = passives(text);
      expect(f.meta?.hasAgent, text).toBe(false);
      expect(f.requiresHuman, text).toBe(true);
    }
  });

  it("the present tense without an agent says the construction may be a state", () => {
    const [f] = passives("Applications are reviewed within 30 days.");
    expect(f.meta?.form).toBe("present");
    expect(f.justification).toMatch(/can also describe a state/);
  });

  it("a participle that names a state after 'be' is not flagged", () => {
    expect(passives("The office is located on Main Street. She is interested in the program.")).toEqual([]);
  });

  it("writes the justification in English", () => {
    for (const f of passives("The claim was reviewed by a specialist. The form was lost.")) {
      expect(f.justification).not.toMatch(/[ãõçáéíóú]/);
    }
  });
});

describe("en-US passive_voice — presented as English passive, never as the Portuguese one", () => {
  const [agentless] = passives("Your application was denied.");
  const [withAgent] = passives("The claim was reviewed by a benefits specialist.");

  it("the signal names 'be', not 'ser', in both interface languages", () => {
    expect(metaFor("en-US", "passive_voice", "pt-BR").signal).toMatch(/“be”/);
    expect(metaFor("en-US", "passive_voice", "pt-BR").signal).not.toMatch(/“ser”/);
    expect(metaFor("en-US", "passive_voice", "en").signal).toMatch(/“be”/);
    expect(metaFor("pt-BR", "passive_voice", "pt-BR").signal).toMatch(/“ser”/);
  });

  it("the prose follows the English detection in both interface languages", () => {
    expect(detectedProse(agentless, "en-US", "pt-BR")).toMatch(/forma de “be”/);
    expect(detectedProse(agentless, "en-US", "pt-BR")).not.toMatch(/“ser”/);
    expect(detectedProse(withAgent, "en-US", "en")).toMatch(/introduced by “by”/);
    expect(detectionHeadline(withAgent, "en-US", "pt-BR")).toBe("Voz passiva com agente");
  });

  it("the facade and the presentation agree on which locale owns the criterion", () => {
    expect(analysisLocale("en-US").criteria).toContain("passive_voice");
  });
});
