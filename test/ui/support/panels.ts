import { screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

export const documentRegion = () => within(screen.getByRole("region", { name: /documento em revisão/i }));
export const auditPanel = () => within(screen.getByRole("complementary", { name: /auditoria/i }));

export async function goToView(user: UserEvent, name: RegExp): Promise<void> {
  await user.click(auditPanel().getByRole("tab", { name }));
}

export const openOverview = (user: UserEvent) => goToView(user, /^panorama/i);
export const openReview = (user: UserEvent) => goToView(user, /^revisão/i);
export const openChanges = (user: UserEvent) => goToView(user, /^alterações/i);
export const openMetrics = (user: UserEvent) => goToView(user, /^métricas/i);

export async function browseAllPoints(user: UserEvent): Promise<void> {
  await openReview(user);
  await user.click(auditPanel().getByRole("radio", { name: /^todos os pontos/i }));
}

export async function openSettings(user: UserEvent): Promise<void> {
  await user.click(auditPanel().getByRole("button", { name: /configurar análise/i }));
}
