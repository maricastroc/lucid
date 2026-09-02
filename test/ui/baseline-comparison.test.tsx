import { describe, expect, it } from "vitest";
import { analyze, DEFAULT_CONFIG } from "@/lucid";
import { buildBaseline, serializeBaseline } from "@/app/lib/baseline";
import { EMPTY_MARKS, withMark, withNote } from "@/app/lib/review-marks";
import { readWorkspace } from "@/app/lib/workspace";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, openChanges } from "./support/panels";
import { auditReady } from "./support/points";

type User = ReturnType<typeof mountStudio>["user"];

const V1 =
  "Foi realizada a análise do documento pela comissão competente em sede de procedimento " +
  "administrativo destinado à verificação das condições supracitadas exigidas para a concessão do " +
  "benefício, e a decisão foi comunicada ao interessado no processo.";

const V2 =
  "A comissão analisou o documento em sede de procedimento administrativo. A comissão verificou as " +
  "condições citadas acima e comunicou a decisão ao interessado.";

function baselineFile(over: Record<string, unknown> = {}, text = V1): File {
  const diagnostic = analyze(text);
  const kept = diagnostic.findings.find((f) => f.span.text === "em sede de");
  const marks =
    kept === undefined
      ? EMPTY_MARKS
      : withNote(withMark(EMPTY_MARKS, kept, "dismissed"), kept, "Termo do edital-padrão.");

  const baseline = buildBaseline({
    title: "Edital 04/2026 — v1",
    savedAt: "30/08/2026",
    text,
    blocks: null,
    diagnostic,
    findings: diagnostic.findings,
    profileId: "base",
    config: DEFAULT_CONFIG,
    marks,
    vocabulary: [],
  });
  const payload = JSON.parse(serializeBaseline(baseline)) as Record<string, unknown>;
  return new File([JSON.stringify({ ...payload, ...over })], "v1.lucid.json", { type: "application/json" });
}

const fileInput = () =>
  auditPanel()
    .getByRole("region", { name: /ponto de partida/i })
    .querySelector<HTMLInputElement>('input[type="file"]')!;

async function attach(user: User, file: File): Promise<void> {
  await openChanges(user);
  await user.upload(fileInput(), file);
}

describe("attaching a starting point", () => {
  it("offers the attachment before anything has changed in this session", async () => {
    const { user } = mountStudio({ text: V2 });
    await auditReady();
    await openChanges(user);

    expect(auditPanel().getByRole("region", { name: /ponto de partida/i })).toBeInTheDocument();
    expect(auditPanel().getByText(/anexe um ponto de partida/i)).toBeInTheDocument();
  });

  it("names the starting point it is comparing against, and how to let go of it", async () => {
    const { user } = mountStudio({ text: V2 });
    await auditReady();
    await attach(user, baselineFile());

    expect(await auditPanel().findByText("Edital 04/2026 — v1")).toBeInTheDocument();
    expect(auditPanel().getByRole("button", { name: /desanexar/i })).toBeInTheDocument();
  });

  it("says first that both sides were measured with the same ruler", async () => {
    const { user } = mountStudio({ text: V2 });
    await auditReady();
    await attach(user, baselineFile());

    expect(await auditPanel().findByText(/a régua é a mesma nos dois lados/i)).toBeInTheDocument();
  });

  it("touches nothing in the session: it is a lens, not an import", async () => {
    const { user } = mountStudio({ text: V2 });
    await auditReady();
    const before = readWorkspace()!;
    await attach(user, baselineFile());

    const after = readWorkspace()!;
    expect(after.text).toBe(before.text);
    expect(after.originalText).toBe(before.originalText);
    expect(after.ledger).toEqual(before.ledger);
    expect(after.reviewMarks).toEqual(before.reviewMarks);
  });

  it("stays attached across a reload, so the comparison is not lost with the tab", async () => {
    const { user, unmount } = mountStudio({ text: V2 });
    await auditReady();
    await attach(user, baselineFile());
    await auditPanel().findByText("Edital 04/2026 — v1");
    unmount();

    mountStudio();
    await auditReady();
    expect(readWorkspace()?.baseline?.title).toBe("Edital 04/2026 — v1");
  });

  it("lets go of it on request", async () => {
    const { user } = mountStudio({ text: V2 });
    await auditReady();
    await attach(user, baselineFile());
    await auditPanel().findByText("Edital 04/2026 — v1");

    await user.click(auditPanel().getByRole("button", { name: /desanexar/i }));
    expect(auditPanel().queryByText("Edital 04/2026 — v1")).not.toBeInTheDocument();
    expect(auditPanel().getByText(/anexe um ponto de partida/i)).toBeInTheDocument();
  });
});

describe("what the comparison says, and what it refuses to say", () => {
  it("shows the balance per criterion against the re-measured starting point", async () => {
    const { user } = mountStudio({ text: V2 });
    await auditReady();
    await attach(user, baselineFile());

    const balance = (await auditPanel().findByRole("heading", { name: /antes e depois/i })).closest("section")!;
    expect(balance.textContent).toMatch(/jargão/i);
    expect(balance.textContent).toMatch(/melhorou/i);
  });

  it("lists what was raised before and is raised again, word for word", async () => {
    const { user } = mountStudio({ text: V2 });
    await auditReady();
    await attach(user, baselineFile());

    const list = await auditPanel().findByRole("list", { name: /o que você apontou e continua lá/i });
    expect(list.textContent).toContain("em sede de");
    expect(list.textContent).not.toContain("supracitadas");
  });

  it("brings the earlier decision along, so a surviving point is not re-litigated", async () => {
    const { user } = mountStudio({ text: V2 });
    await auditReady();
    await attach(user, baselineFile());

    const list = await auditPanel().findByRole("list", { name: /o que você apontou e continua lá/i });
    expect(list.textContent).toMatch(/já ignorado/i);
    expect(list.textContent).toContain("Termo do edital-padrão.");
  });

  it("claims nothing about what left the text", async () => {
    const { user } = mountStudio({ text: V2 });
    await auditReady();
    await attach(user, baselineFile());
    await auditPanel().findByRole("list", { name: /o que você apontou e continua lá/i });

    const list = auditPanel().getByRole("list", { name: /o que você apontou e continua lá/i });
    expect(list.textContent).not.toMatch(/resolvid|corrigid|saiu do texto/i);

    expect(auditPanel().queryByText(/deixou de disparar|apareceu nesta versão/i)).toBeNull();
    expect(auditPanel().getByText(/não é possível dizer qual edição produziu qual mudança/i)).toBeInTheDocument();
  });
});

describe("when the ruler has moved", () => {
  it("names what changed and separates it from the text", async () => {
    const { user } = mountStudio({ text: V2 });
    await auditReady();
    const older = baselineFile({
      historical: {
        ...(JSON.parse(await baselineFile().text()) as { historical: Record<string, unknown> }).historical,
        stamp: { ...analyze(V1).meta, dataHash: "antigo", lucidVersion: "0.0.9" },
      },
    });
    await attach(user, older);

    expect(await auditPanel().findByText(/o que mudou na régua desde então/i)).toBeInTheDocument();
    expect(auditPanel().getByText(/dados curados/i)).toBeInTheDocument();
    expect(auditPanel().getByText(/versão do lucid/i)).toBeInTheDocument();
  });

  it("refuses a starting point audited in another language", async () => {
    const { user } = mountStudio({ text: V2 });
    await auditReady();
    const parsed = JSON.parse(await baselineFile().text()) as { historical: { stamp: Record<string, string> } };
    await attach(
      user,
      baselineFile({
        historical: { ...parsed.historical, stamp: { ...parsed.historical.stamp, localeId: "en" } },
      }),
    );

    expect(await auditPanel().findByRole("alert")).toHaveTextContent(/outro idioma/i);
    expect(auditPanel().queryByText("Edital 04/2026 — v1")).not.toBeInTheDocument();
  });

  it("refuses a file that is not a starting point, without blaming a format version", async () => {
    const { user } = mountStudio({ text: V2 });
    await auditReady();
    await openChanges(user);
    await user.upload(fileInput(), new File(["{}"], "x.json", { type: "application/json" }));

    expect(await auditPanel().findByRole("alert")).toHaveTextContent(/não é um ponto de partida/i);
  });
});
