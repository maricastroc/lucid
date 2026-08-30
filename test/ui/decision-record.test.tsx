import { describe, expect, it } from "vitest";
import { readWorkspace } from "@/app/lib/workspace";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, openOverview } from "./support/panels";
import { auditReady, openPoint } from "./support/points";
import { PASSIVE_AND_JARGON } from "./support/documents";

type User = ReturnType<typeof mountStudio>["user"];

const reasonField = () => auditPanel().queryByRole("textbox", { name: /por que você manteve este ponto/i });
const markSeen = () => auditPanel().getByRole("button", { name: /^marcar como revisado$/i });
const dismiss = () => auditPanel().getByRole("button", { name: /^ignorar$/i });
const unmark = () => auditPanel().getByRole("button", { name: /^desmarcar$/i });
const backToList = () => auditPanel().getByRole("button", { name: /voltar à lista/i });
const storedMarks = () => readWorkspace()?.reviewMarks ?? {};
const onlyMark = () => Object.values(storedMarks())[0];

async function openPassive(user: User): Promise<void> {
  await openPoint(user, "Voz passiva", "foi indeferido pela comissão");
}

describe("the author's reason for keeping a point", () => {
  it("offers no field until the author has decided something", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPassive(user);

    expect(reasonField()).toBeNull();
  });

  it("appears once the point is marked, naming which decision it belongs to", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPassive(user);
    await user.click(markSeen());

    expect(reasonField()).toBeInTheDocument();
    expect(auditPanel().getByText(/decisão registrada/i)).toBeInTheDocument();
    expect(auditPanel().getAllByText(/^revisado$/i).length).toBeGreaterThan(0);
  });

  it("offers the same field for a dismissed point", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPassive(user);
    await user.click(dismiss());

    expect(reasonField()).toBeInTheDocument();
    expect(auditPanel().getAllByText(/^ignorado$/i).length).toBeGreaterThan(0);
  });

  it("says the reason is the author's record and moves nothing in the audit", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPassive(user);
    await user.click(markSeen());

    expect(
      auditPanel().getByText(/não altera o placar, o resultado da auditoria nem qualquer estado de conformidade/i),
    ).toBeInTheDocument();
  });

  it("keeps what was typed without waiting for a blur, so no navigation can lose it", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPassive(user);
    await user.click(markSeen());
    await user.type(reasonField()!, "Voz passiva exigida pelo modelo do órgão");

    expect(onlyMark()).toEqual({ kind: "seen", note: "Voz passiva exigida pelo modelo do órgão" });
  });

  it("brings the reason back when the author returns to the point", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPassive(user);
    await user.click(markSeen());
    await user.type(reasonField()!, "Termo do edital");

    await user.click(backToList());
    await openPassive(user);

    expect(reasonField()).toHaveValue("Termo do edital");
  });

  it("keeps the reason when the author changes their mind about the act", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPassive(user);
    await user.click(markSeen());
    await user.type(reasonField()!, "Termo do edital");
    await user.click(dismiss());

    expect(onlyMark()).toEqual({ kind: "dismissed", note: "Termo do edital" });
  });

  it("drops the reason with the mark — no justification outlives the decision it explains", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPassive(user);
    await user.click(markSeen());
    await user.type(reasonField()!, "Termo do edital");
    await user.click(unmark());

    expect(storedMarks()).toEqual({});
    expect(reasonField()).toBeNull();
  });

  it("never lets the reason move a number: the audit counts the same points before and after", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openOverview(user);
    const found = auditPanel().getByText(/pontos? encontrados?/i).previousElementSibling!.textContent;

    await openPassive(user);
    await user.click(markSeen());
    await user.type(reasonField()!, "Um motivo qualquer");
    await user.click(backToList());
    await openOverview(user);

    expect(auditPanel().getByText(/pontos? encontrados?/i).previousElementSibling!.textContent).toBe(found);
  });
});
