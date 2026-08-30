import { describe, expect, it } from "vitest";
import {
  AUDIT_VIEW_IDS,
  buildAuditViews,
  isAuditViewId,
  stepView,
  viewHeadingId,
  viewPanelId,
  viewTabId,
} from "../src/app/lib/audit-views";
import { PROBE_SECTION_ENABLED } from "../src/app/lib/probe-availability";
import { COPY } from "../src/app/i18n/copy";

const c = COPY["pt-BR"];
const en = COPY.en;
const views = (pending = 8, changes = 0, hasProbe = false) => buildAuditViews({ pending, changes, hasProbe }, c);

describe("audit destinations — the single navigation axis", () => {
  it("offers state, then work, then record, then measurement — in that order", () => {
    expect(views().map((v) => v.id)).toEqual(["overview", "review", "changes", "metrics"]);
  });

  it("declares a purpose for every destination, in both interface languages", () => {
    for (const id of AUDIT_VIEW_IDS) {
      expect(c.views[id].label.length).toBeGreaterThan(0);
      expect(c.views[id].purpose.length).toBeGreaterThan(0);
      expect(en.views[id].label.length).toBeGreaterThan(0);
      expect(en.views[id].purpose.length).toBeGreaterThan(0);
    }
  });

  it("keeps analysis settings off the axis: configuration is a control, not a result", () => {
    expect(views().map((v) => v.id)).not.toContain("settings");
  });

  it("never shows a bare number: every badge carries the noun it counts", () => {
    for (const view of views(8, 3)) {
      if (view.badge === null) continue;
      expect(view.badge.noun.trim().length).toBeGreaterThan(0);
    }
  });

  it("counts pending points on Review and recorded changes on Changes", () => {
    const built = views(8, 3);
    expect(built.find((v) => v.id === "review")?.badge?.value).toBe(8);
    expect(built.find((v) => v.id === "changes")?.badge?.value).toBe(3);
  });

  it("drops a badge at zero instead of decorating a destination with nothing to do", () => {
    const built = views(0, 0);
    expect(built.find((v) => v.id === "review")?.badge).toBeNull();
    expect(built.find((v) => v.id === "changes")?.badge).toBeNull();
  });

  it("derives distinct, stable DOM ids for the tab, its panel and its heading", () => {
    expect(viewTabId("review")).toBe("aba-review");
    expect(viewPanelId("review")).toBe("painel-review");
    expect(viewHeadingId("review")).toBe("painel-review-titulo");
    const ids = AUDIT_VIEW_IDS.flatMap((id) => [viewTabId(id), viewPanelId(id), viewHeadingId(id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("recognises its own ids and rejects anything else", () => {
    expect(isAuditViewId("review")).toBe(true);
    expect(isAuditViewId("settings")).toBe(false);
    expect(isAuditViewId(3)).toBe(false);
  });
});

describe("audit destinations — moving between them with the keyboard", () => {
  it("walks right and left through the strip", () => {
    expect(stepView(views(), "overview", 1)).toBe("review");
    expect(stepView(views(), "review", -1)).toBe("overview");
  });

  it("wraps at both ends so the arrow keys never dead-end", () => {
    expect(stepView(views(), "overview", -1)).toBe("metrics");
    expect(stepView(views(), "metrics", 1)).toBe("overview");
  });

  it("leaves the current destination alone when the strip is empty", () => {
    expect(stepView([], "review", 1)).toBe("review");
  });
});

describe("audit destinations — the probe stays wired but out of sight", () => {
  it("never reaches the strip while the flag is off, whatever the surface offers", () => {
    for (const hasProbe of [true, false]) {
      expect(views(5, 0, hasProbe).map((v) => v.id)).not.toContain("probe");
    }
    expect(PROBE_SECTION_ENABLED).toBe(false);
  });

  it("keeps the id and its copy alive in both languages, so flipping the flag is enough", () => {
    expect(AUDIT_VIEW_IDS).toContain("probe");
    expect(c.views.probe.purpose.length).toBeGreaterThan(0);
    expect(en.views.probe.purpose.length).toBeGreaterThan(0);
  });
});
