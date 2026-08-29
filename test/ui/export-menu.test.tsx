import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { mountStudio } from "./support/mount-studio";
import { auditReady } from "./support/points";
import { PASSIVE_AND_JARGON } from "./support/documents";

const trigger = () => screen.getByRole("button", { name: /^exportar$/i });

describe("the export menu dismisses the way a menu should", () => {
  it("opens on the trigger and puts the focus on the first item", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();

    await user.click(trigger());

    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("menuitem")[0]).toHaveFocus();
  });

  it("closes on Escape and hands the focus back to the trigger", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await user.click(trigger());

    await user.keyboard("{Escape}");

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveFocus();
  });

  it("closes on a click outside, without stealing the focus back", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await user.click(trigger());

    await user.click(screen.getByRole("region", { name: /documento em revisão/i }));

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("cycles through the items with the arrows, wrapping at both ends", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await user.click(trigger());
    const items = screen.getAllByRole("menuitem");

    await user.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();

    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(items[items.length - 1]).toHaveFocus();
  });
});
