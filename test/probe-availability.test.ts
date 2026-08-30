import { describe, expect, it } from "vitest";
import { AUDIT_VIEW_IDS, buildAuditViews } from "../src/app/lib/audit-views";
import { PROBE_SECTION_ENABLED } from "../src/app/lib/probe-availability";
import { COPY } from "../src/app/i18n/copy";
import { GOLDEN_SONDA } from "./eval/probe-golden";

const c = COPY["pt-BR"];

describe("comprehension probe — hidden from production until the meta-eval clears (ADR-090)", () => {
  it("stays disabled: flipping this on is a decision that owes a passing live meta-eval", () => {
    expect(PROBE_SECTION_ENABLED).toBe(false);
  });

  it("the audit panel offers no comprehension destination, even where the surface can host one", () => {
    for (const hasProbe of [true, false]) {
      const built = buildAuditViews({ pending: 5, changes: 0, hasProbe }, c);
      expect(built.map((v) => v.id)).not.toContain("probe");
    }
  });

  it("hiding it is the ONLY gate — the surface still declares it can host the probe", () => {
    const offered = buildAuditViews({ pending: 5, changes: 0, hasProbe: true }, c);
    const notOffered = buildAuditViews({ pending: 5, changes: 0, hasProbe: false }, c);
    expect(offered.map((v) => v.id)).toEqual(notOffered.map((v) => v.id));
  });

  it("nothing was deleted: the id and its copy survive in both interface languages", () => {
    expect(AUDIT_VIEW_IDS).toContain("probe");
    expect(COPY["pt-BR"].views.probe.label.length).toBeGreaterThan(0);
    expect(COPY.en.views.probe.label.length).toBeGreaterThan(0);
    expect(COPY["pt-BR"].probe.title.length).toBeGreaterThan(0);
  });

  it("the evidence that condemned it stays runnable: the labelled golden set is intact", () => {
    expect(GOLDEN_SONDA.length).toBeGreaterThanOrEqual(27);
    expect(GOLDEN_SONDA.some((g) => g.humanoTrava)).toBe(true);
    expect(GOLDEN_SONDA.some((g) => !g.humanoTrava)).toBe(true);
  });
});
