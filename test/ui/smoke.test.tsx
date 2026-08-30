import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { mountStudio } from "./support/mount-studio";
import { PASSIVE_AND_JARGON } from "./support/documents";

describe("studio boots", () => {
  it("audits the restored document and shows the count of points to review", async () => {
    mountStudio({ text: PASSIVE_AND_JARGON });

    expect(await screen.findByText(/pontos encontrados/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /documento em revisão/i })).toHaveTextContent(/o pedido foi indeferido/i);
  });

  it("boots empty when there is no persisted document", async () => {
    mountStudio();

    expect(await screen.findByRole("button", { name: /carregar exemplo/i })).toBeInTheDocument();
    expect(screen.queryByText(/pontos encontrados/)).not.toBeInTheDocument();
  });
});
