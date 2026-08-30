import { describe, expect, it } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, documentRegion } from "./support/panels";
import { auditReady } from "./support/points";

const LONG = Array.from(
  { length: 20 },
  (_, i) =>
    `Foi realizada a análise ${i} do documento pela comissão competente em sede de procedimento ` +
    `administrativo destinado à verificação das condições supracitadas exigidas para a concessão do benefício.`,
).join("\n\n");

/**
 * jsdom does no layout, so height cannot be measured here. What can be checked is the
 * structural cause: a flex item whose height must be bounded by its parent needs
 * `min-h-0`, otherwise its automatic minimum size is its content and the scroller inside
 * grows with the document instead of scrolling. Measured in a real browser before this
 * guard existed: the document scroller reported clientHeight 33584 for a 24-paragraph
 * document, and scrollTop never moved.
 */
function flexChainTo(element: Element, stopAt: (el: Element) => boolean): Element[] {
  const chain: Element[] = [];
  let node = element.parentElement;
  while (node !== null && !stopAt(node)) {
    if (node.classList.contains("flex")) chain.push(node);
    node = node.parentElement;
  }
  return chain;
}

const isShell = (el: Element): boolean => el.classList.contains("h-dvh");

describe("both panes scroll, whatever the document's length", () => {
  it("bounds every flex ancestor of the document scroller, so it can never grow with the text", async () => {
    mountStudio({ text: LONG });
    await auditReady();

    const scroller = documentRegion().getByRole("article").closest(".overflow-y-auto")!;
    const chain = flexChainTo(scroller, isShell);

    expect(chain.length).toBeGreaterThan(0);
    for (const ancestor of chain) {
      expect(
        ancestor.classList.contains("min-h-0"),
        `flex ancestor without min-h-0: ${ancestor.className}`,
      ).toBe(true);
    }
  });

  it("bounds every flex ancestor of the audit panel's scroller too", async () => {
    mountStudio({ text: LONG });
    await auditReady();

    const panel = auditPanel().getByRole("tabpanel");
    const chain = flexChainTo(panel, isShell);

    expect(chain.length).toBeGreaterThan(0);
    for (const ancestor of chain) {
      expect(
        ancestor.classList.contains("min-h-0"),
        `flex ancestor without min-h-0: ${ancestor.className}`,
      ).toBe(true);
    }
  });

  it("keeps the scrollers themselves shrinkable, which is what makes the bound work", async () => {
    mountStudio({ text: LONG });
    await auditReady();

    const scroller = documentRegion().getByRole("article").closest(".overflow-y-auto")!;
    expect(scroller.classList.contains("min-h-0")).toBe(true);
    expect(auditPanel().getByRole("tabpanel").classList.contains("min-h-0")).toBe(true);
  });

  it("clips at the shell, so the page itself never becomes the scroller", async () => {
    mountStudio({ text: LONG });
    await auditReady();

    const shell = documentRegion().getByRole("article").closest(".h-dvh")!;
    expect(shell.classList.contains("overflow-hidden")).toBe(true);
  });
});
