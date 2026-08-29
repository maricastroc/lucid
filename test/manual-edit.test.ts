import { describe, expect, it } from "vitest";
import { analyze } from "../src/lucid";
import { rewriteTargetAt } from "../src/app/lib/paragraphs";
import { verifyManualEdit } from "../src/app/lib/rewrite";
import { isManualEditDirty, manualEditReplacement, spliceSpan } from "../src/app/lib/text-edit";

function manualEditTargetFor(text: string, criterion: string) {
  const d = analyze(text);
  const finding = d.findings.find((f) => f.criterion === criterion);
  if (!finding) throw new Error(`no '${criterion}' finding in: ${text}`);
  return { source: d.text, ...rewriteTargetAt(d.text, finding.span.start) };
}

describe("manualEditReplacement — trims the ends, preserves the middle", () => {
  it("removes spaces/line breaks at the edges", () => {
    expect(manualEditReplacement("  minha versão  ")).toBe("minha versão");
    expect(manualEditReplacement("\n  texto \n")).toBe("texto");
  });
  it("leaves internal spacing alone", () => {
    expect(manualEditReplacement("uma  frase. Outra.")).toBe("uma  frase. Outra.");
  });
});

describe("isManualEditDirty — only applies real, different content", () => {
  const original = "A comissão analisou o documento.";
  it("equal to the original (even with edge spaces) → does not apply", () => {
    expect(isManualEditDirty(original, original)).toBe(false);
    expect(isManualEditDirty(original, `  ${original}  `)).toBe(false);
  });
  it("empty or spaces only → does not apply (it does not blank the excerpt)", () => {
    expect(isManualEditDirty(original, "")).toBe(false);
    expect(isManualEditDirty(original, "   \n ")).toBe(false);
  });
  it("different content → applies", () => {
    expect(isManualEditDirty(original, "A comissão leu o documento.")).toBe(true);
  });
});

describe("spliceSpan — replaces exactly the target span", () => {
  it("swaps the range and keeps the rest", () => {
    const text = "Olá mundo cruel.";
    const target = { start: 4, end: 9, text: "mundo" };
    expect(spliceSpan(text, target, "planeta")).toBe("Olá planeta cruel.");
  });
});

describe("the ManualEdit target = the finding's rewrite unit", () => {
  it("a continuous block (no blank line) → the finding's SENTENCE", () => {
    const text = "As contas foram aprovadas pelo conselho fiscal da autarquia federal competente.";
    const { source, span, unit } = manualEditTargetFor(text, "passive_voice");
    expect(unit).toBe("sentence");
    expect(span.text).toBe(source.trim());
  });

  it("text with paragraphs → the finding's PARAGRAPH, and the rest stays intact when applied", () => {
    const text = "As contas foram aprovadas pelo conselho.\n\nO pagamento deve ser feito na hipótese de deferimento.";
    const { source, span, unit } = manualEditTargetFor(text, "passive_voice");
    expect(unit).toBe("paragraph");
    expect(span.text).toBe("As contas foram aprovadas pelo conselho.");

    const replacement = manualEditReplacement("  O conselho aprovou as contas.  ");
    const next = spliceSpan(source, span, replacement);
    expect(next).toBe("O conselho aprovou as contas.\n\nO pagamento deve ser feito na hipótese de deferimento.");
  });

  it("the loop closes: the engine re-analyzes the result of the hand edit", () => {
    const text = "As contas foram aprovadas pelo conselho.\n\nO pagamento deve ser feito na hipótese de deferimento.";
    const { source, span } = manualEditTargetFor(text, "passive_voice");
    const edited = spliceSpan(source, span, manualEditReplacement("O conselho aprovou as contas."));

    const before = analyze(source).findings.filter((f) => f.criterion === "passive_voice").length;
    const after = analyze(edited).findings.filter((f) => f.criterion === "passive_voice").length;

    expect(after).toBeLessThan(before);
  });
});

describe("verifyManualEdit — the author's version is judged by the SAME verifier", () => {
  const text = "As contas foram aprovadas pelo conselho.\n\nO pagamento deve ser feito na hipótese de deferimento.";

  it("stamps the author's provenance, trims the draft and returns PROOFS + metrics, offline (no meaning probe)", async () => {
    const { source, span } = manualEditTargetFor(text, "passive_voice");
    const { proposal, verification } = await verifyManualEdit(source, span, "  O conselho aprovou as contas.  ");

    expect(proposal.proposerId).toBe("sua edição");
    expect(proposal.proposed).toBe("O conselho aprovou as contas.");
    expect(proposal.original).toBe(span.text);
    expect(verification.proofs.length).toBeGreaterThan(0);
    expect(verification.metrics.wordsBefore).toBeGreaterThan(0);
    expect(verification.signals.some((s) => s.check === "meaning_preserved")).toBe(false);
  });

  it("it does not rubber-stamp the author: inventing a 1st person absent from the original is VETOED (the same veto as the AI's)", async () => {
    const { source, span } = manualEditTargetFor(text, "passive_voice");
    const { verification } = await verifyManualEdit(source, span, "Nós aprovamos as contas na nossa reunião.");

    expect(verification.hasBlockingFailure).toBe(true);
    const firstPerson = verification.proofs.find((p) => p.check === "no_invented_first_person");
    expect(firstPerson?.passed).toBe(false);
  });

  it("an edit that only papers over the passive (without resolving the criterion) fails when the criterion is passed — regression", async () => {
    const { source, span } = manualEditTargetFor(text, "passive_voice");
    const { verification } = await verifyManualEdit(
      source,
      span,
      "As contas foram devidamente aprovadas pelo conselho.",
      "passive_voice",
    );

    const targetResolved = verification.proofs.find((p) => p.check === "target_resolved");
    expect(targetResolved?.passed).toBe(false);
    expect(verification.hasBlockingFailure).toBe(true);
  });
});

describe("verifyManualEdit — the agent declaration applies to the author too (ADR-055)", () => {
  const text = "A decisão foi comunicada ao interessado no processo administrativo em curso.";

  function agentlessPassive() {
    const d = analyze(text);
    const finding = d.findings.find((f) => f.criterion === "passive_voice" && f.requiresHuman)!;
    const span = { start: 0, end: d.text.length, text: d.text };
    return { source: d.text, span, finding };
  }

  it("an author version naming the declared agent → the declared_agent_present proof PASSES", async () => {
    const { source, span, finding } = agentlessPassive();
    const { verification } = await verifyManualEdit(
      source,
      span,
      "A comissão comunicou a decisão ao interessado no processo administrativo em curso.",
      undefined,
      [{ span: finding.span, agent: "a comissão" }],
    );

    const proof = verification.proofs.find((p) => p.check === "declared_agent_present");
    expect(proof?.passed).toBe(true);
  });

  it("the author declared one agent and wrote ANOTHER → their own version fails (no source is privileged)", async () => {
    const { source, span, finding } = agentlessPassive();
    const { verification } = await verifyManualEdit(
      source,
      span,
      "O setor comunicou a decisão ao interessado no processo administrativo em curso.",
      undefined,
      [{ span: finding.span, agent: "a comissão" }],
    );

    const proof = verification.proofs.find((p) => p.check === "declared_agent_present");
    expect(proof?.passed).toBe(false);
    expect(verification.hasBlockingFailure).toBe(true);
  });

  it("with no declaration, the proof does not exist (previous behavior intact)", async () => {
    const { source, span } = agentlessPassive();
    const { verification } = await verifyManualEdit(source, span, "A decisão foi comunicada ao interessado.");
    expect(verification.proofs.find((p) => p.check === "declared_agent_present")).toBeUndefined();
  });
});
