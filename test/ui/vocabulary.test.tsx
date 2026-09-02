import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { analyze, DEFAULT_CONFIG, type OrgTerm } from "@/lucid";
import { buildBaseline, serializeBaseline } from "@/app/lib/baseline";
import { readWorkspace } from "@/app/lib/workspace";
import { mountStudio } from "./support/mount-studio";
import { auditReady } from "./support/points";

const TEXT =
  "O termo de fomento será assinado pela comissão.\n\n" +
  "A pactuação depende do envio do plano de trabalho pelo proponente até o prazo.";

const withTerms = (terms: readonly OrgTerm[]) => ({
  ...DEFAULT_CONFIG,
  vocabulario: { ...DEFAULT_CONFIG.vocabulario, terms },
});

const openCoverage = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("tab", { name: /revisão/i }));
  await user.click(await screen.findByRole("radio", { name: /^todos os pontos/i }));
  await user.click(await screen.findByRole("button", { name: /sem nenhum ponto encontrado/i }));
};

const openSettings = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /configurar análise/i }));
};

describe("declaring a term the curated glossary never had", () => {
  it("puts it in the panel and finds it in the document", async () => {
    const user = userEvent.setup();
    mountStudio({ text: TEXT });
    await auditReady();

    await openSettings(user);
    await user.type(screen.getByLabelText(/^Termo$/i), "termo de fomento");
    await user.type(screen.getByLabelText(/equivalente simples/i), "acordo de repasse");
    await user.type(screen.getByLabelText(/^Motivo$/i), "ninguém fora da administração usa isto");
    await user.click(screen.getByRole("button", { name: /declarar termo/i }));

    const declared = screen.getByRole("list", { name: undefined }).closest("div")!;
    expect(within(declared).getByText("termo de fomento")).toBeInTheDocument();
    expect(screen.getByText(/Equivalente registrado: “acordo de repasse”/)).toBeInTheDocument();
  });

  it("survives a reload, because a vocabulary that dies with the tab is not a vocabulary", async () => {
    const user = userEvent.setup();
    mountStudio({ text: TEXT });
    await auditReady();

    await openSettings(user);
    await user.type(screen.getByLabelText(/^Termo$/i), "pactuação");
    await user.click(screen.getByRole("button", { name: /declarar termo/i }));

    expect(readWorkspace()?.config.vocabulario.terms).toEqual([{ term: "pactuação", plain: null, reason: "" }]);
  });

  it("refuses to declare the same term twice", async () => {
    const user = userEvent.setup();
    mountStudio({ text: TEXT, config: withTerms([{ term: "pactuação", plain: null, reason: "" }]) });
    await auditReady();

    await openSettings(user);
    await user.type(screen.getByLabelText(/^Termo$/i), "PACTUAÇÃO");

    expect(screen.getByRole("button", { name: /declarar termo/i })).toBeDisabled();
    expect(screen.getByText(/já está declarado/i)).toBeInTheDocument();
  });
});

describe("what the declared term does to the audit", () => {
  it("raises a point that cites the organisation, never a clause of the standard", async () => {
    mountStudio({ text: TEXT, config: withTerms([{ term: "pactuação", plain: null, reason: "" }]) });
    await auditReady();

    const points = await screen.findAllByRole("button", { name: /vocabulário da organização/i });
    expect(points.length).toBeGreaterThan(0);
  });

  it("counts its occurrences back in the panel, so the author sees what the term is worth", async () => {
    const user = userEvent.setup();
    mountStudio({
      text: TEXT,
      config: withTerms([{ term: "termo de fomento", plain: "acordo de repasse", reason: "" }]),
    });
    await auditReady();

    await openSettings(user);
    expect(screen.getByText(/·\s*1 ocorrência/)).toBeInTheDocument();
  });

  it("says a term with no equivalent only signals", async () => {
    const user = userEvent.setup();
    mountStudio({ text: TEXT, config: withTerms([{ term: "pactuação", plain: null, reason: "" }]) });
    await auditReady();

    await openSettings(user);

    expect(screen.getByText(/só sinaliza, não propõe troca/i)).toBeInTheDocument();
  });
});

describe("the zero of a criterion says what kind of zero it is", () => {
  it("separates a list-bound zero from a measured one", async () => {
    const user = userEvent.setup();
    mountStudio({ text: TEXT });
    await auditReady();

    await openCoverage(user);

    expect(screen.getAllByText(/confere uma lista curada/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/reconhece o padrão no texto/i).length).toBeGreaterThan(0);
  });

  it("tells the author a zero measured nothing while no term is declared", async () => {
    const user = userEvent.setup();
    mountStudio({ text: TEXT });
    await auditReady();

    await openCoverage(user);

    expect(screen.getByText(/nenhum termo declarado ainda/i)).toBeInTheDocument();
  });
});

describe("carrying the vocabulary between documents", () => {
  it("adopts the terms in a .lucid.json without dropping the ones already declared", async () => {
    const user = userEvent.setup();
    mountStudio({ text: TEXT, config: withTerms([{ term: "pactuação", plain: null, reason: "" }]) });
    await auditReady();

    const d = analyze(TEXT);
    const file = new File(
      [
        serializeBaseline(
          buildBaseline({
            title: "Edital anterior",
            savedAt: "01/01/2026",
            text: d.text,
            blocks: null,
            diagnostic: d,
            findings: d.findings,
            profileId: "base",
            config: DEFAULT_CONFIG,
            marks: {},
            vocabulary: [{ term: "instrumento congênere", plain: "acordo parecido", reason: "vem do arquivo" }],
          }),
        ),
      ],
      "ponto.lucid.json",
      { type: "application/json" },
    );

    await user.click(screen.getByRole("tab", { name: /alterações/i }));
    const picker = document.querySelector<HTMLInputElement>('input[type="file"][accept*="json"]')!;
    await user.upload(picker, file);

    const terms = readWorkspace()!.config.vocabulario.terms.map((t) => t.term);
    expect(terms).toEqual(["pactuação", "instrumento congênere"]);
  });
});
