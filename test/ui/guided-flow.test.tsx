import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, browseAllPoints, openReview } from "./support/panels";
import { auditReady, startRoute } from "./support/points";

const BIG = Array.from(
  { length: 5 },
  (_, i) =>
    `O pedido ${i} foi indeferido pela comissão em sede de procedimento administrativo instaurado para ` +
    `a verificação das condições supracitadas exigidas para a concessão do benefício.`,
).join("\n\n");

type User = ReturnType<typeof mountStudio>["user"];

const header = () =>
  auditPanel()
    .getByText(/etapa \d+ de \d+/i)
    .closest("div")!.parentElement!;
const B = (name: RegExp) => auditPanel().getAllByRole("button", { name });
const advance = () => auditPanel().queryByRole("button", { name: /marcar como revisado e (avançar|concluir)/i });

async function enter(user: User): Promise<void> {
  await openReview(user);
  await startRoute(user);
}

async function walkTheStep(user: User): Promise<void> {
  await user.click(B(/^\d+“/)[0]);
  for (let i = 0; i < 16; i++) {
    const mark = advance();
    if (mark === null) break;
    await user.click(mark);
  }
}

describe("the guided path stays with the reader", () => {
  it("shows step, name, purpose and progress once a step starts", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    expect(auditPanel().queryByText(/etapa \d+ de \d+/i)).not.toBeInTheDocument();

    await enter(user);
    expect(within(header()).getByText(/etapa 1 de \d+/i)).toBeInTheDocument();
    expect(within(header()).getByText(/0 de \d+ pontos desta etapa/i)).toBeInTheDocument();
    expect(within(header()).getByText(/depois: etapa \d+ ·/i)).toBeInTheDocument();
  });

  it("counts inside the step and across the path, each with the noun it counts", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);

    expect(within(header()).getByText(/\d+ de \d+ pontos desta etapa/i)).toBeInTheDocument();
    expect(within(header()).getByText(/\d+ de \d+ pontos no percurso/i)).toBeInTheDocument();
    expect(auditPanel().getByText(/\d+ de \d+ etapas? conclu/i)).toBeInTheDocument();
  });

  it("offers exactly one primary action to open the step", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);
    expect(
      within(header()).getAllByRole("button", { name: /abrir o primeiro ponto|continuar de onde parou/i }),
    ).toHaveLength(1);
  });

  it("keeps the header while the reader is inside an occurrence", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);
    await user.click(B(/^\d+“/)[0]);
    expect(auditPanel().getByText(/etapa 1 de \d+/i)).toBeInTheDocument();
  });

  it("puts the walking chrome away so the step is the only thing to do", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await browseAllPoints(user);
    expect(auditPanel().getByRole("searchbox", { name: /buscar/i })).toBeInTheDocument();

    await enter(user);
    expect(auditPanel().queryByRole("searchbox", { name: /buscar/i })).not.toBeInTheDocument();
    expect(auditPanel().queryByRole("button", { name: /^todos$/i })).not.toBeInTheDocument();
    expect(auditPanel().queryByRole("button", { name: /limpar filtros/i })).not.toBeInTheDocument();
  });

  it("advances to the next occurrence when one is marked", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);
    await user.click(B(/^\d+“/)[0]);
    const excerpt = () => auditPanel().getByRole("blockquote").textContent;
    const before = excerpt();
    await user.click(advance()!);
    expect(excerpt()).not.toBe(before);
  });

  it("says on the last pending occurrence that the click ends the step", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);
    await user.click(B(/^\d+“/)[0]);
    expect(auditPanel().getByRole("button", { name: /marcar como revisado e avançar/i })).toBeInTheDocument();

    for (let i = 0; i < 16; i++) {
      const mark = auditPanel().queryByRole("button", { name: /marcar como revisado e avançar/i });
      if (mark === null) break;
      await user.click(mark);
    }
    expect(auditPanel().getByRole("button", { name: /marcar como revisado e concluir a etapa/i })).toBeInTheDocument();
  });

  it("announces the finished step and offers the next one", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);
    await walkTheStep(user);

    expect(within(header()).getByText(/etapa concluída:/i)).toBeInTheDocument();
    expect(within(header()).getByText(/pontos revisados/i)).toBeInTheDocument();
    expect(within(header()).getByRole("button", { name: /continuar para a etapa \d+:/i })).toBeInTheDocument();
  });

  it("keeps the step number where it was, even after finishing it", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);
    const at = within(header()).getByText(/etapa \d+ de \d+/i).textContent;
    await walkTheStep(user);
    expect(within(header()).getByText(/etapa \d+ de \d+/i).textContent).toBe(at);
  });

  it("leaves the path and comes back to the same step", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);
    const at = within(header()).getByText(/etapa \d+ de \d+/i).textContent;

    await user.click(within(header()).getByRole("button", { name: /sair do percurso/i }));
    expect(auditPanel().queryByText(/etapa \d+ de \d+/i)).not.toBeInTheDocument();

    await startRoute(user);
    expect(within(header()).getByText(/etapa \d+ de \d+/i).textContent).toBe(at);
  });

  it("hides the full plan while a step is being walked, and brings it back on leaving", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await openReview(user);
    expect(auditPanel().getByText(/etapas do percurso/i)).toBeInTheDocument();

    await startRoute(user);
    expect(auditPanel().queryByRole("button", { name: /percorrer “jargão”/i })).not.toBeInTheDocument();

    await user.click(within(header()).getByRole("button", { name: /sair do percurso/i }));
    expect(auditPanel().getByRole("button", { name: /^começar a revisão$/i })).toBeInTheDocument();
  });

  it("gives a step the same number in the plan and in the header", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await openReview(user);
    const row = auditPanel().getAllByRole("button", { name: /percorrer/i })[1];
    const number = /^\d+/.exec(row.textContent ?? "")![0];

    await user.click(row);
    expect(within(header()).getByText(/etapa \d+ de \d+/i).textContent).toBe(`Etapa ${number} de 4`);
  });

  it("jumps to another step from the trail, and the header follows", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);

    await user.click(within(header()).getByRole("button", { name: /etapa 3 de 4:/i }));
    expect(within(header()).getByText(/etapa \d+ de \d+/i).textContent).toBe("Etapa 3 de 4");
  });

  it("comes back to the list and announces the finish when the last occurrence is marked", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);
    await walkTheStep(user);

    expect(auditPanel().queryByRole("button", { name: /voltar à etapa/i })).not.toBeInTheDocument();
    expect(within(header()).getByText(/etapa concluída:/i)).toBeInTheDocument();
  });

  it("ends the path when the reader walks out of the occurrence and out of the route", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);
    await user.click(B(/^\d+“/)[0]);

    await user.click(auditPanel().getByRole("button", { name: /sair do percurso/i }));
    expect(auditPanel().queryByText(/etapa \d+ de \d+/i)).not.toBeInTheDocument();
    expect(auditPanel().getByRole("button", { name: /^começar a revisão$/i })).toBeInTheDocument();
  });

  it("stops offering a step to resume once every step is walked", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await openReview(user);
    for (let step = 0; step < 5; step++) {
      const entry = auditPanel()
        .queryAllByRole("button", { name: /percorrer/i })
        .find((button) => /pendente/.test(button.textContent ?? ""));
      if (entry === undefined) break;
      await user.click(entry);
      await user.click(
        within(header()).getByRole("button", { name: /abrir o primeiro ponto|continuar de onde parou/i }),
      );
      for (let i = 0; i < 16; i++) {
        const mark = advance();
        if (mark === null) break;
        await user.click(mark);
      }
      await user.click(within(header()).getByRole("button", { name: /sair do percurso|voltar ao panorama/i }));
    }

    expect(auditPanel().getAllByText(/percurso concluído/i).length).toBeGreaterThan(0);
    expect(auditPanel().queryByRole("button", { name: /continuar a etapa/i })).not.toBeInTheDocument();
  });

  it("enters the step instead of stacking one more filter on top", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await browseAllPoints(user);
    await user.click(auditPanel().getByRole("button", { name: /^com troca direta$/i }));
    await user.type(auditPanel().getByRole("searchbox", { name: /buscar/i }), "sede");

    await enter(user);
    const pending = /faltam? (\d+)/i.exec(within(header()).getByText(/faltam?/i).textContent ?? "")![1];
    expect(auditPanel().getAllByRole("button", { name: /^\d+“/ })).toHaveLength(Number(pending));
  });

  it("announces the finish instead of leaving it to be noticed", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);
    await walkTheStep(user);

    const status = auditPanel().getAllByRole("status");
    expect(status.some((el) => /etapa concluída:/i.test(el.textContent ?? ""))).toBe(true);
  });

  it("marks one step as the way in, and leaves the others plainly ahead", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await openReview(user);
    const steps = auditPanel().getAllByRole("button", { name: /percorrer/i });
    expect(steps[0].textContent).toMatch(/começar daqui/i);
    for (const later of steps.slice(1)) expect(later.textContent).not.toMatch(/começar daqui|continuar daqui/i);
  });

  it("comes back to the step the reader left open in the last session", async () => {
    mountStudio({ text: BIG, guidedStep: "passive_voice" });
    await auditReady();
    expect(auditPanel().getByText(/etapa \d+ de \d+/i)).toBeInTheDocument();
    expect(auditPanel().getAllByText(/voz passiva/i).length).toBeGreaterThan(0);
  });

  it("drops a stored step whose criterion the text no longer has", async () => {
    const { user } = mountStudio({ text: BIG, guidedStep: "long_sentence_not_a_criterion" });
    await auditReady();
    expect(auditPanel().queryByText(/etapa \d+ de \d+/i)).not.toBeInTheDocument();
    await openReview(user);
    expect(auditPanel().getByRole("button", { name: /^começar a revisão$/i })).toBeInTheDocument();
  });
});

describe("the guided path and free lookup are two named ways to work", () => {
  it("names both, and shows only one at a time", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await openReview(user);

    expect(auditPanel().getByRole("radio", { name: /^percurso/i })).toHaveAttribute("aria-checked", "true");
    expect(auditPanel().getByRole("radio", { name: /^todos os pontos/i })).toHaveAttribute("aria-checked", "false");
    expect(auditPanel().queryByRole("searchbox", { name: /buscar/i })).not.toBeInTheDocument();
  });

  it("keeps the open step while the reader looks something up, and offers the way back", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);
    const at = within(header()).getByText(/etapa \d+ de \d+/i).textContent;

    await user.click(auditPanel().getByRole("radio", { name: /^todos os pontos/i }));
    expect(auditPanel().getByRole("searchbox", { name: /buscar/i })).toBeInTheDocument();
    expect(auditPanel().getByText(/nada aqui altera o percurso/i)).toBeInTheDocument();

    await user.click(auditPanel().getByRole("button", { name: /voltar ao percurso · etapa/i }));
    expect(within(header()).getByText(/etapa \d+ de \d+/i).textContent).toBe(at);
  });

  it("shows every point in free lookup, not only the ones the open step holds", async () => {
    const { user } = mountStudio({ text: BIG });
    await auditReady();
    await enter(user);
    await user.click(auditPanel().getByRole("radio", { name: /^todos os pontos/i }));

    expect(auditPanel().getByText(/^exibindo (os )?\d+/i)).toBeInTheDocument();
    expect(auditPanel().queryByRole("button", { name: /limpar filtros/i })).not.toBeInTheDocument();
  });
});
