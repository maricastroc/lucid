import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { readWorkspace } from "@/app/lib/workspace";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, documentRegion, openChanges } from "./support/panels";
import { auditReady, openPoint } from "./support/points";
import { PASSIVE_AND_JARGON, PLAIN_FIRST_SENTENCE } from "./support/documents";

type User = ReturnType<typeof mountStudio>["user"];
const section = () =>
  auditPanel()
    .getByRole("heading", { name: /antes e depois/i })
    .closest("section")!;
const draft = () => documentRegion().getByRole("textbox", { name: /texto do documento/i }) as HTMLTextAreaElement;

async function applyRegisteredEdit(user: User): Promise<void> {
  await openPoint(user, "Voz passiva", "foi indeferido pela comissão");
  await user.click(auditPanel().getByRole("button", { name: /editar ou colar minha versão/i }));
  const editor = auditPanel().getByRole("textbox", { name: /editar esta frase/i });
  await user.clear(editor);
  await user.type(editor, PLAIN_FIRST_SENTENCE);
  await user.click(auditPanel().getByRole("button", { name: /verificar minha versão/i }));
  await auditPanel().findByText(/nenhuma falha encontrada/i);
  await user.click(auditPanel().getByRole("button", { name: /^usar como rascunho/i }));
}

async function typeFreely(user: User, from: string, to: string): Promise<void> {
  await user.click(screen.getByRole("tab", { name: /^escrever$/i }));
  const field = draft();
  const at = field.value.indexOf(from);
  expect(at).toBeGreaterThanOrEqual(0);
  field.focus();
  field.setSelectionRange(at, at + from.length);
  await user.keyboard(to);
  await user.click(screen.getByRole("tab", { name: /^revisar$/i }));
  await auditReady();
}

describe("before and after, criterion by criterion", () => {
  it("shows the weight and count of the whole revision once something changed", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openChanges(user);
    expect(auditPanel().queryByRole("heading", { name: /antes e depois/i })).not.toBeInTheDocument();

    await applyRegisteredEdit(user);
    await openChanges(user);
    expect(within(section()).getByText(/pontos encontrados: \d+ → \d+/i)).toBeInTheDocument();
    expect(within(section()).getByText(/de peso/i)).toBeInTheDocument();
  });

  it("names the criterion that improved and by how much", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await applyRegisteredEdit(user);
    await openChanges(user);

    const rows = within(section()).getAllByRole("listitem");
    const passiva = rows.find((row) => /voz passiva/i.test(row.textContent ?? ""))!;
    expect(passiva).toBeDefined();
    expect(passiva).toHaveTextContent(/melhorou/i);
  });

  it("never claims approval from a smaller weight", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await applyRegisteredEdit(user);
    await openChanges(user);
    expect(auditPanel().getByText(/um peso menor não significa que o texto está/i)).toBeInTheDocument();
  });
});

describe("free typing is recorded as one session, not one keystroke", () => {
  it("writes a single trail entry for a stretch of typing", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await typeFreely(user, "foi indeferido pela comissão", "a comissão indeferiu");

    const ledger = readWorkspace()!.ledger;
    expect(ledger).toHaveLength(1);
    expect(ledger[0].source).toBe("typing");
  });

  it("attributes what that stretch did, criterion by criterion", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await typeFreely(user, "foi indeferido pela comissão", "a comissão indeferiu");

    const [entry] = readWorkspace()!.ledger;
    const passive = entry.attribution!.changes.find((c) => c.criterion === "passive_voice")!;
    expect(passive).toMatchObject({ before: 1, after: 0, kind: "resolved", scope: "region" });
  });

  it("says out loud that inside a hand-rewritten region occurrences cannot be told apart", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await typeFreely(user, "foi indeferido pela comissão", "a comissão indeferiu");
    await openChanges(user);
    expect(auditPanel().getByText(/não dá para dizer qual ocorrência é qual/i)).toBeInTheDocument();
  });

  it("closes the session when the author leaves the draft, not on every key", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await user.click(screen.getByRole("tab", { name: /^escrever$/i }));
    const field = draft();
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
    await user.keyboard(" Uma frase nova.");

    expect(readWorkspace()!.ledger).toHaveLength(0);
    await user.click(screen.getByRole("tab", { name: /^revisar$/i }));
    await auditReady();
    expect(readWorkspace()!.ledger).toHaveLength(1);
  });

  it("records nothing when the typing left the text as it was", async () => {
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await user.click(screen.getByRole("tab", { name: /^escrever$/i }));
    await user.click(screen.getByRole("tab", { name: /^revisar$/i }));
    await auditReady();
    expect(readWorkspace()!.ledger).toHaveLength(0);
  });
});
