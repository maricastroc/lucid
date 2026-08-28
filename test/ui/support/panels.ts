import { screen, within } from "@testing-library/react";

/**
 * The two landmarks the app exposes. Scoping every query to one of them keeps the tests off the
 * component tree: the same excerpt appears both in the document and in the audit panel, and a
 * bare query would match whichever the current structure renders first.
 */
export const documentRegion = () => within(screen.getByRole("region", { name: /documento em revisão/i }));
export const auditPanel = () => within(screen.getByRole("complementary", { name: /auditoria/i }));
