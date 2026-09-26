import { afterEach, describe, expect, it, vi } from "vitest";
import { mountStudio } from "./support/mount-studio";
import { auditPanel } from "./support/panels";
import { auditReady, openPoint } from "./support/points";
import { PASSIVE_AND_JARGON } from "./support/documents";

const NO_AGENT = "O recurso foi negado ontem. O prazo para recorrer é de dez dias.";

afterEach(() => vi.unstubAllGlobals());

describe("the agent question lives in the AI rewrite panel", () => {
  it("is not asked under “Como seguir”, only once the AI panel is open", async () => {
    const { user } = mountStudio({ text: NO_AGENT });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi negado");

    await user.click(auditPanel().getByRole("button", { name: /como seguir/i }));
    expect(auditPanel().getByText(/reescreva nomeando quem a praticou/i)).toBeInTheDocument();
    expect(auditPanel().queryByLabelText(/quem pratica essa ação/i)).not.toBeInTheDocument();

    await user.click(auditPanel().getByRole("button", { name: /reescrita por ia/i }));
    expect(auditPanel().getByLabelText(/quem pratica essa ação/i)).toBeInTheDocument();
  });

  it("is not asked when the sentence already names who acts", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    await user.click(auditPanel().getByRole("button", { name: /reescrita por ia/i }));
    expect(auditPanel().queryByLabelText(/quem pratica essa ação/i)).not.toBeInTheDocument();
  });

  it("sends the answer to the AI as the agent it must name", async () => {
    const fetchMock = vi.fn(
      async () => ({ ok: false, status: 500, json: async () => ({ error: "erro interno do servidor" }) }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);
    const { user } = mountStudio({ text: NO_AGENT });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi negado");

    await user.click(auditPanel().getByRole("button", { name: /reescrita por ia/i }));
    await user.type(auditPanel().getByLabelText(/quem pratica essa ação/i), "o relator");
    expect(auditPanel().getByText(/a ia vai usar «o relator»/i)).toBeInTheDocument();

    await user.click(auditPanel().getByRole("button", { name: /gerar e verificar/i }));
    await auditPanel().findByText(/não foi possível gerar a reescrita/i);

    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.strategy).toBe("directed");
    expect(body.declarations).toEqual([expect.objectContaining({ agent: "o relator" })]);
  });
});
