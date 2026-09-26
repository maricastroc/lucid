import { describe, expect, it } from "vitest";
import { analyze } from "../src/locales/pt-BR";
import type { Finding, Span } from "../src/lucid/core/types";
import { verifyRewrite, type AgentDeclaration, type VerifyOptions } from "../src/report/rewrite";

const TEXT = "O pedido foi indeferido ontem. A decisão foi comunicada ao interessado.";
const PARAGRAPH: Span = { start: 0, end: TEXT.length, text: TEXT };

function passive(excerpt: string): Finding {
  const found = analyze(TEXT).findings.find((f) => f.criterion === "passive_voice" && f.span.text.includes(excerpt));
  if (!found) throw new Error(`no passive at ${excerpt}`);
  return found;
}

function verifyParagraph(proposed: string, options: VerifyOptions) {
  return verifyRewrite(
    TEXT,
    PARAGRAPH,
    { proposerId: "test", original: TEXT, proposed },
    {
      criterion: "passive_voice",
      ...options,
    },
  );
}

function targetProof(v: Awaited<ReturnType<typeof verifyParagraph>>) {
  return v.proofs.find((p) => p.check === "target_resolved")!;
}

const RESOLVED_FIRST = "A comissão indeferiu o pedido ontem. A decisão foi comunicada ao interessado.";

describe("target_resolved — only what the rewrite had the information to resolve", () => {
  it("both passives are agentless, so the fixture really has one open point and one left for the author", () => {
    expect(passive("indeferido").meta?.hasAgent).toBe(false);
    expect(passive("comunicada").meta?.hasAgent).toBe(false);
  });

  it("passes when the open point is resolved and the other agentless passive stays, and says so in a notice", async () => {
    const focus = passive("indeferido");
    const declarations: AgentDeclaration[] = [{ span: focus.span, agent: "a comissão" }];
    const v = await verifyParagraph(RESOLVED_FIRST, { focus: focus.span, declarations });

    expect(targetProof(v).passed).toBe(true);
    expect(targetProof(v).detail).toMatch(/exceto em «foi comunicada»/);
    expect(v.notices).toHaveLength(1);
    expect(v.notices[0].detail).toContain("«foi comunicada»");
    expect(v.hasBlockingFailure).toBe(false);
  });

  it("fails when the open point itself is still a passive", async () => {
    const focus = passive("indeferido");
    const v = await verifyParagraph(TEXT, { focus: focus.span });

    expect(targetProof(v).passed).toBe(false);
    expect(targetProof(v).detail).toBe("O Lucid ainda aponta «Voz passiva» no trecho reescrito (1 vez).");
    expect(v.notices).toHaveLength(1);
  });

  it("without an open point it stays as strict as before: every passive left counts", async () => {
    const v = await verifyParagraph(RESOLVED_FIRST, {});

    expect(targetProof(v).passed).toBe(false);
    expect(v.notices).toEqual([]);
  });

  it("a passive the author chose to keep impersonal is neither required nor announced", async () => {
    const focus = passive("indeferido");
    const kept = passive("comunicada");
    const declarations: AgentDeclaration[] = [
      { span: focus.span, agent: "a comissão" },
      { span: kept.span, agent: null },
    ];
    const v = await verifyParagraph(RESOLVED_FIRST, { focus: focus.span, declarations });

    expect(targetProof(v).passed).toBe(true);
    expect(targetProof(v).detail).toMatch(/manter a forma impessoal/);
    expect(v.notices).toEqual([]);
  });

  it("a passive whose agent the author gave is required like the open point", async () => {
    const focus = passive("indeferido");
    const other = passive("comunicada");
    const declarations: AgentDeclaration[] = [{ span: other.span, agent: "o relator" }];
    const v = await verifyParagraph(RESOLVED_FIRST, { focus: focus.span, declarations });

    expect(targetProof(v).passed).toBe(false);
    expect(v.notices).toEqual([]);
  });
});
