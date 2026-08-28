import { screen, within } from "@testing-library/react";

export const documentRegion = () => within(screen.getByRole("region", { name: /documento em revisão/i }));
export const auditPanel = () => within(screen.getByRole("complementary", { name: /auditoria/i }));
