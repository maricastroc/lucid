import type { UserEvent } from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { auditPanel, browseAllPoints } from "./panels";

export const auditReady = () => screen.findByRole("complementary", { name: /auditoria/i });

export const pointRow = (excerpt: string | RegExp) =>
  auditPanel().getByRole("button", {
    name: new RegExp(`^\\d+“${typeof excerpt === "string" ? excerpt : excerpt.source}`),
  });

export async function expandCriterion(user: UserEvent, label: string | RegExp): Promise<void> {
  await user.click(
    auditPanel().getByRole("button", { name: new RegExp(`^${typeof label === "string" ? label : label.source}`) }),
  );
}

export async function openPoint(user: UserEvent, criterion: string, excerpt: string): Promise<void> {
  await browseAllPoints(user);
  await expandCriterion(user, criterion);
  await user.click(pointRow(excerpt));
}

export async function startRoute(user: UserEvent): Promise<void> {
  const toRoute = auditPanel().queryByRole("radio", { name: /^percurso/i });
  if (toRoute !== null && toRoute.getAttribute("aria-checked") === "false") await user.click(toRoute);
  await user.click(auditPanel().getByRole("button", { name: /^(começar|continuar) a revisão$/i }));
}
