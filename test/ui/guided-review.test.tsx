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
    .getByRole("button", { name: /começar pela etapa 1 ·|retomar a etapa \d+ ·/i })
    .closest("div")!.parentElement!;
const progress = () =>
  auditPanel()
    .getAllByText(/não altera o placar/i)[0]
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
    await user.click(auditPanel().getAllByRole("button", { name: /^Marcar .+ como vista$/i })[0]);

    expect(within(progress()).getByText(/1 vista · 0 ignoradas/)).toBeInTheDocument();
    expect(within(progress()).getByText(/não altera o placar/i)).toBeInTheDocument();
  });

  it("never counts a dismissed point as a resolved one", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await user.click(within(ramp()).getAllByRole("button", { name: /percorrer/i })[0]);
    await user.click(auditPanel().getAllByRole("button", { name: /^Dispensar /i })[0]);

    expect(within(progress()).getByText(/0 vistas · 1 ignorada/)).toBeInTheDocument();
    expect(within(progress()).queryByText(/saiu do texto|saíram do texto/i)).not.toBeInTheDocument();
  });

  it("says plainly that seen and dismissed are not resolved", async () => {
    mountStudio({ text: BIG });
    await auditReady();
    expect(within(ramp()).getByText(/sugestão de ordem, não regra/i)).toBeInTheDocument();
  });

  it("puts the path where the reader lands, with one way in", async () => {
    mountStudio({ text: BIG });
    await auditReady();
    expect(auditPanel().getAllByText(/percurso de revisão/i).length).toBeGreaterThan(0);
    expect(auditPanel().getByRole("button", { name: /^começar o percurso$/i })).toBeInTheDocument();
    expect(auditPanel().getByText(/começa na etapa 1 ·/i)).toBeInTheDocument();
  });

  it("counts the path as a whole once there is something to count, and not before", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    expect(within(ramp()).queryByText(/0 de \d+ revisadas/i)).not.toBeInTheDocument();
    expect(within(ramp()).queryByText(/0 de \d+ etapas? conclu/i)).not.toBeInTheDocument();

    await user.click(auditPanel().getAllByRole("button", { name: /percorrer/i })[0]);
    await user.click(auditPanel().getAllByRole("button", { name: /^Marcar .+ como vista$/i })[0]);
    await user.click(auditPanel().getByRole("button", { name: /sair do percurso/i }));

    expect(within(ramp()).getByText(/1 de \d+ revisadas/i)).toBeInTheDocument();
    expect(within(ramp()).getByText(/0 de \d+ etapas? conclu/i)).toBeInTheDocument();
  });

  it("leaves the reader free to open any criterion, in any order", async () => {
    mountStudio({ text: BIG });
    await auditReady();
    const criteria = auditPanel()
      .getAllByRole("button")
      .filter((b) => /ocorrências?/.test(b.textContent ?? ""));
    expect(criteria.length).toBeGreaterThan(1);
  });
});
