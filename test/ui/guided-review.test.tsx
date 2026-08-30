import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { auditPanel } from "./support/panels";
import { auditReady } from "./support/points";

const BIG = Array.from(
  { length: 6 },
  (_, i) =>
    `O pedido ${i} foi indeferido pela comissão em sede de procedimento administrativo instaurado para ` +
    `a verificação das condições supracitadas exigidas para a concessão do benefício requerido pelo interessado.`,
).join("\n\n");

const ramp = () =>
  auditPanel()
    .getByRole("button", { name: /começar pela etapa 1:|continuar a etapa \d+:/i })
    .closest("div")!.parentElement!;
const progress = () =>
  auditPanel()
    .getAllByText(/não alteram o resultado da auditoria/i)[0]
    .closest("div")!;

describe("the guided review turns a long audit into a path", () => {
  it("opens with the mechanical step first", async () => {
    mountStudio({ text: BIG });
    await auditReady();
    expect(auditPanel().getByRole("button", { name: /ver as \d+ trocas? direta/i })).toBeInTheDocument();
  });

  it("offers the heaviest criterion, and the lighter ones after it", async () => {
    mountStudio({ text: BIG });
    await auditReady();
    const walks = within(ramp())
      .getAllByRole("button", { name: /percorrer/i })
      .map((b) => b.textContent ?? "");
    expect(walks.length).toBeGreaterThan(1);
    expect(walks[0]).toMatch(/jargão/i);
    expect(walks[1]).not.toMatch(/jargão/i);
  });

  it("shows where the review stands, and keeps showing it after the first mark", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await user.click(within(ramp()).getAllByRole("button", { name: /percorrer/i })[0]);
    await user.click(auditPanel().getAllByRole("button", { name: /^Marcar .+ como revisado$/i })[0]);

    expect(within(progress()).getByText(/1 revisados · 0 ignorados/)).toBeInTheDocument();
    expect(within(progress()).getByText(/não alteram o resultado da auditoria/i)).toBeInTheDocument();
  });

  it("never counts a dismissed point as a resolved one", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await user.click(within(ramp()).getAllByRole("button", { name: /percorrer/i })[0]);
    await user.click(auditPanel().getAllByRole("button", { name: /^Ignorar /i })[0]);

    expect(within(progress()).getByText(/0 revisados · 1 ignorado/)).toBeInTheDocument();
    expect(within(progress()).queryByText(/saiu do texto|saíram do texto/i)).not.toBeInTheDocument();
  });

  it("says plainly that seen and dismissed are not resolved", async () => {
    mountStudio({ text: BIG });
    await auditReady();
    expect(within(ramp()).getByText(/apenas uma ordem sugerida/i)).toBeInTheDocument();
  });

  it("puts the path where the reader lands, with one way in", async () => {
    mountStudio({ text: BIG });
    await auditReady();
    expect(auditPanel().getAllByText(/percurso de revisão/i).length).toBeGreaterThan(0);
    expect(auditPanel().getByRole("button", { name: /^começar a revisão$/i })).toBeInTheDocument();
    expect(auditPanel().getByText(/começa na etapa 1:/i)).toBeInTheDocument();
  });

  it("counts the path as a whole once there is something to count, and not before", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    expect(within(ramp()).queryByText(/0 de \d+ revisados/i)).not.toBeInTheDocument();
    expect(within(ramp()).queryByText(/0 de \d+ etapas? conclu/i)).not.toBeInTheDocument();

    await user.click(auditPanel().getAllByRole("button", { name: /percorrer/i })[0]);
    await user.click(auditPanel().getAllByRole("button", { name: /^Marcar .+ como revisado$/i })[0]);
    await user.click(auditPanel().getByRole("button", { name: /sair do percurso/i }));

    expect(within(ramp()).getAllByText(/1 de \d+ revisados/i).length).toBeGreaterThan(0);
    expect(within(ramp()).getByText(/0 de \d+ etapas? conclu/i)).toBeInTheDocument();
  });

  it("leaves the reader free to open any criterion, in any order", async () => {
    mountStudio({ text: BIG });
    await auditReady();
    const criteria = auditPanel()
      .getAllByRole("button")
      .filter((b) => /pontos?/.test(b.textContent ?? ""));
    expect(criteria.length).toBeGreaterThan(1);
  });
});
