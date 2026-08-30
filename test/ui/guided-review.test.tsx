import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, browseAllPoints, openOverview, openReview } from "./support/panels";
import { auditReady } from "./support/points";

const BIG = Array.from(
  { length: 6 },
  (_, i) =>
    `O pedido ${i} foi indeferido pela comissão em sede de procedimento administrativo instaurado para ` +
    `a verificação das condições supracitadas exigidas para a concessão do benefício requerido pelo interessado.`,
).join("\n\n");

type User = ReturnType<typeof mountStudio>["user"];

const plan = () =>
  auditPanel()
    .getByText(/etapas do percurso/i)
    .closest("div")!;
const counts = () => auditPanel().getByRole("group", { name: /estado da revisão/i });

async function markFirstPointOfFirstStep(user: User, how: RegExp): Promise<void> {
  await openReview(user);
  await user.click(within(plan()).getAllByRole("button", { name: /percorrer/i })[0]);
  await user.click(auditPanel().getAllByRole("button", { name: how })[0]);
}

describe("the guided review turns a long audit into a path", () => {
  it("offers the cheapest move as a shortcut, without making it the path", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await openReview(user);
    expect(auditPanel().getByRole("button", { name: /ver as \d+ trocas? direta/i })).toBeInTheDocument();
  });

  it("offers the heaviest criterion, and the lighter ones after it", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await openReview(user);
    const walks = within(plan())
      .getAllByRole("button", { name: /percorrer/i })
      .map((b) => b.textContent ?? "");
    expect(walks.length).toBeGreaterThan(1);
    expect(walks[0]).toMatch(/jargão/i);
    expect(walks[1]).not.toMatch(/jargão/i);
  });

  it("shows where the review stands, and keeps showing it after the first mark", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await markFirstPointOfFirstStep(user, /^Marcar .+ como revisado$/i);

    await openOverview(user);
    expect(counts()).toHaveTextContent(/1\s*revisados?/);
    expect(counts()).toHaveTextContent(/0\s*ignorados?/);
  });

  it("never counts a dismissed point as a resolved one", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await markFirstPointOfFirstStep(user, /^Ignorar /i);

    await openOverview(user);
    expect(counts()).toHaveTextContent(/0\s*revisados?/);
    expect(counts()).toHaveTextContent(/1\s*ignorados?/);
    expect(auditPanel().queryByText(/saiu do texto|saíram do texto/i)).not.toBeInTheDocument();
  });

  it("says plainly that the order is a suggestion, not a rule", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await openReview(user);
    expect(auditPanel().getByText(/apenas uma ordem sugerida/i)).toBeInTheDocument();
  });

  it("puts the path where the reader lands, with one way in", async () => {
    mountStudio({ text: BIG });
    await auditReady();
    expect(auditPanel().getAllByText(/^percurso$/i).length).toBeGreaterThan(0);
    expect(auditPanel().getByRole("button", { name: /^começar a revisão$/i })).toBeInTheDocument();
    expect(auditPanel().getByText(/começa na etapa 1:/i)).toBeInTheDocument();
  });

  it("counts the path as a whole once there is something to count, and not before", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    expect(auditPanel().queryByText(/\d+ de \d+ pontos no percurso/i)).not.toBeInTheDocument();
    expect(auditPanel().queryByText(/\d+ de \d+ etapas? conclu/i)).not.toBeInTheDocument();

    await markFirstPointOfFirstStep(user, /^Marcar .+ como revisado$/i);
    await openOverview(user);

    expect(auditPanel().getByText(/1 de \d+ pontos no percurso/i)).toBeInTheDocument();
    expect(auditPanel().getByText(/0 de \d+ etapas? conclu/i)).toBeInTheDocument();
  });

  it("leaves the reader free to open any criterion, in any order", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await browseAllPoints(user);
    const criteria = auditPanel()
      .getAllByRole("button")
      .filter((b) => /\d+ pontos?/.test(b.textContent ?? ""));
    expect(criteria.length).toBeGreaterThan(1);
  });
});
