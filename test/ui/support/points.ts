import type { UserEvent } from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { auditPanel } from "./panels";

/** Every flow starts by waiting for the audited panel, whatever the finding count turns out to be. */
export const auditReady = () => screen.findByRole("complementary", { name: /auditoria/i });

/** The list numbers each row and quotes the excerpt: `1“foi indeferido…”`. */
export const pointRow = (excerpt: string | RegExp) =>
  auditPanel().getByRole("button", {
    name: new RegExp(`^\\d+“${typeof excerpt === "string" ? excerpt : excerpt.source}`),
  });

/** Groups start collapsed, so reaching any point means opening its criterion first. */
export async function expandCriterion(user: UserEvent, label: string | RegExp): Promise<void> {
  await user.click(auditPanel().getByRole("button", { name: new RegExp(`^${typeof label === "string" ? label : label.source}`) }));
}

/** Opens the note for one point — the state four of the six flows start from. */
export async function openPoint(user: UserEvent, criterion: string, excerpt: string): Promise<void> {
  await expandCriterion(user, criterion);
  await user.click(pointRow(excerpt));
}
