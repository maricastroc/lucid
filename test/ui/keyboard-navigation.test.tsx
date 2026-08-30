import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, browseAllPoints, documentRegion } from "./support/panels";
import { auditReady, expandCriterion } from "./support/points";
import { TWO_PASSIVES } from "./support/documents";
import { useListRovingFocus } from "@/app/components/revision-list/use-list-roving-focus";

function ThreeRows() {
  const { ref, onKeyDown } = useListRovingFocus();
  return (
    <div ref={ref} onKeyDown={onKeyDown}>
      {["um", "dois", "três"].map((label) => (
        <button key={label} data-row type="button">
          {label}
        </button>
      ))}
      <button type="button">fora da lista</button>
    </div>
  );
}

describe("up and down walk the rows of a list", () => {
  it("moves the focus one row at a time, and stops at both ends", async () => {
    const user = userEvent.setup();
    render(<ThreeRows />);
    screen.getByRole("button", { name: "um" }).focus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "dois" })).toHaveFocus();

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("button", { name: "três" })).toHaveFocus();

    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
    expect(screen.getByRole("button", { name: "um" })).toHaveFocus();
  });

  it("lands on the first row when the focus was not on a row", async () => {
    const user = userEvent.setup();
    render(<ThreeRows />);
    screen.getByRole("button", { name: "fora da lista" }).focus();

    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("button", { name: "um" })).toHaveFocus();
  });
});

describe("up and down in the audit walk the points themselves", () => {
  it("opens the first point from the list", async () => {
    const { user } = mountStudio({ text: TWO_PASSIVES });
    await auditReady();
    await browseAllPoints(user);
    await expandCriterion(user, "Voz passiva");
    auditPanel().getAllByRole("button", { name: /^\d+“/ })[0].focus();

    await user.keyboard("{ArrowDown}");

    expect(documentRegion().getByRole("button", { name: /“foi indeferido pela comissão/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps walking inside the criterion in scope, wrapping at the end", async () => {
    const { user } = mountStudio({ text: TWO_PASSIVES });
    await auditReady();
    await browseAllPoints(user);
    await expandCriterion(user, "Voz passiva");
    await user.click(auditPanel().getAllByRole("button", { name: /^\d+“/ })[0]);

    await user.keyboard("{ArrowDown}");
    expect(documentRegion().getByRole("button", { name: /“foi negado pelo relator/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.keyboard("{ArrowDown}");
    expect(documentRegion().getByRole("button", { name: /“foi indeferido pela comissão/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
