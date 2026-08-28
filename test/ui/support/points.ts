import type { UserEvent } from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { auditPanel } from "./panels";

export const auditReady = () => screen.findByRole("complementary", { name: /auditoria/i });

export const pointRow = (excerpt: string | RegExp) =>
  auditPanel().getByRole("button", {
    name: new RegExp(`^\\d+“${typeof excerpt === "string" ? excerpt : excerpt.source}`),
  });

export async function expandCriterion(user: UserEvent, label: string | RegExp): Promise<void> {
  await user.click(auditPanel().getByRole("button", { name: new RegExp(`^${typeof label === "string" ? label : label.source}`) }));
}

export async function openPoint(user: UserEvent, criterion: string, excerpt: string): Promise<void> {
  await expandCriterion(user, criterion);
  await user.click(pointRow(excerpt));
}
