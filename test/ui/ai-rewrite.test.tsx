import { afterEach, describe, expect, it, vi } from "vitest";
import { waitFor, within } from "@testing-library/react";
import { analyze } from "@/locales/pt-BR";
import {
  PROOF_CHECKS,
  proposeAndVerify,
  StubRewriteProposer,
  type Proof,
  type VerifiedRewrite,
} from "@/report/rewrite";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";
import { rewriteTargetAt } from "@/app/lib/paragraphs";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, documentRegion, openChanges } from "./support/panels";
import { auditReady, openPoint } from "./support/points";
import { PASSIVE_AND_JARGON, PLAIN_FIRST_SENTENCE, REWRITE_LOSING_THE_NUMBER } from "./support/documents";
import { analysisLocale } from "../../src/app/locale/active";

const PT = analysisLocale("pt-BR");

async function answerWith(proposed: string): Promise<VerifiedRewrite> {
  const finding = analyze(PASSIVE_AND_JARGON).findings[0];
  const target = rewriteTargetAt(PASSIVE_AND_JARGON, finding.span.start, PT).span;
  return proposeAndVerify(
    PASSIVE_AND_JARGON,
    target,
    new StubRewriteProposer({ [target.text]: proposed }, "stub-test@1"),
    { criterion: finding.criterion, locale: rewriteLocalePtBR },
  );
}

function stubRewriteEndpoint(verified: VerifiedRewrite): void {
  vi.stubGlobal("fetch", async () => ({ ok: true, status: 200, json: async () => verified }) as unknown as Response);
}

async function runRewrite(user: Awaited<ReturnType<typeof mountStudio>>["user"]): Promise<void> {
  await user.click(auditPanel().getByRole("button", { name: /reescrita por ia/i }));
  await user.click(auditPanel().getByRole("button", { name: /gerar e verificar/i }));
}

afterEach(() => vi.unstubAllGlobals());

describe("flow 5 · asking for an AI rewrite and applying it", () => {
  it("shows the engine's verdict on the proposal, not the model's word", async () => {
    stubRewriteEndpoint(await answerWith(PLAIN_FIRST_SENTENCE));
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    await runRewrite(user);

    expect(await auditPanel().findByText(/não encontrou divergência no que verifica/i)).toBeInTheDocument();
    expect(auditPanel().getByText(/medição, não aprovação/i)).toBeInTheDocument();
    expect(auditPanel().getByText(PLAIN_FIRST_SENTENCE)).toBeInTheDocument();
  });

  it("applies the proposal as the author's draft and records who proposed it", async () => {
    stubRewriteEndpoint(await answerWith(PLAIN_FIRST_SENTENCE));
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    await runRewrite(user);
    await auditPanel().findByText(/não encontrou divergência no que verifica/i);
    await user.click(auditPanel().getByRole("button", { name: /^usar como rascunho/i }));

    expect(documentRegion().getByRole("article")).toHaveTextContent(/a comissão negou o pedido/i);
    await openChanges(user);
    expect(auditPanel().getByText(/stub-test@1/)).toBeInTheDocument();
  });
});

describe("flow 5 · a proposal the engine blocks", () => {
  it("names the failed proof instead of offering a clean apply", async () => {
    stubRewriteEndpoint(await answerWith(REWRITE_LOSING_THE_NUMBER));
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    await runRewrite(user);

    expect(await auditPanel().findByText(/há divergência entre o trecho original e a proposta/i)).toBeInTheDocument();
    expect(within(auditPanel().getByRole("group", { name: "Não confirmado" })).getByRole("listitem")).toHaveTextContent(
      "O número «3» do trecho original não foi encontrado na proposta com a mesma grafia.",
    );
    expect(auditPanel().queryByRole("button", { name: /^usar como rascunho/i })).not.toBeInTheDocument();
  });

  it("still lets the author override, saying plainly that it is their call", async () => {
    stubRewriteEndpoint(await answerWith(REWRITE_LOSING_THE_NUMBER));
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    await runRewrite(user);
    await auditPanel().findByText(/há divergência entre o trecho original e a proposta/i);
    const override = auditPanel().getByRole("button", { name: /usar mesmo assim como rascunho/i });
    expect(override).toBeEnabled();

    await user.click(override);

    expect(documentRegion().getByRole("article")).toHaveTextContent(/a comissão negou o pedido/i);
  });

  it("records in the trail that the version was used anyway, and with which divergence", async () => {
    stubRewriteEndpoint(await answerWith(REWRITE_LOSING_THE_NUMBER));
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    await runRewrite(user);
    await user.click(await auditPanel().findByRole("button", { name: /usar mesmo assim como rascunho/i }));
    await openChanges(user);

    expect(auditPanel().getByText(/usado mesmo assim, com estas divergências/i)).toBeInTheDocument();
    expect(
      auditPanel().getByText("O número «3» do trecho original não foi encontrado na proposta com a mesma grafia."),
    ).toBeInTheDocument();
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("lucid-workspace") ?? "{}");
      expect(stored.version).toBe(12);
      expect(stored.ledger.at(-1)).toMatchObject({
        source: "ai",
        decision: "used_anyway",
        verification: { notConfirmed: [{ check: "numbers_kept" }], additions: [] },
      });
    });
  });
});

describe("flow 5 · a passive left for the author does not block the proposal", () => {
  const TWO_AGENTLESS = "O pedido foi indeferido ontem e a decisão foi comunicada ao interessado.";

  it("resolves the open point, keeps the other passive as a notice and does not veto the version", async () => {
    const focus = analyze(TWO_AGENTLESS).findings.find((f) => f.span.text.includes("indeferido"))!;
    const target = rewriteTargetAt(TWO_AGENTLESS, focus.span.start, PT).span;
    const verified = await proposeAndVerify(
      TWO_AGENTLESS,
      target,
      new StubRewriteProposer(
        { [target.text]: "A comissão indeferiu o pedido ontem e a decisão foi comunicada ao interessado." },
        "stub-test@1",
      ),
      {
        criterion: focus.criterion,
        focus: focus.span,
        declarations: [{ span: focus.span, agent: "a comissão" }],
        locale: rewriteLocalePtBR,
      },
    );
    stubRewriteEndpoint(verified);
    const { user } = mountStudio({ text: TWO_AGENTLESS });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido");

    await runRewrite(user);

    expect(await auditPanel().findByText(/não encontrou divergência no que verifica/i)).toBeInTheDocument();
    expect(auditPanel().getByText(/continua em «foi comunicada»/i)).toBeInTheDocument();
    expect(auditPanel().getByRole("button", { name: /^usar como rascunho/i })).toBeEnabled();
  });
});

describe("flow 5 · the proposal comes right after the verdict", () => {
  it("puts the proposal before the checks and keeps what does not apply behind a toggle", async () => {
    stubRewriteEndpoint(await answerWith(PLAIN_FIRST_SENTENCE));
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    await runRewrite(user);

    await auditPanel().findByText(/não encontrou divergência no que verifica/i);
    const proposed = auditPanel().getByText(PLAIN_FIRST_SENTENCE);
    const kept = auditPanel().getByText(/o número «3» do trecho original aparece na proposta, com a mesma grafia/i);
    expect(proposed.compareDocumentPosition(kept) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      auditPanel().queryByText(/o trecho original não tem data escrita só com algarismos/i),
    ).not.toBeInTheDocument();

    await user.click(auditPanel().getByRole("button", { name: /^ver as outras \d+ verificações/i }));
    expect(auditPanel().getByText(/o trecho original não tem data escrita só com algarismos/i)).toBeInTheDocument();
  });

  it("shows a failed proof above the proposal, where the override note says the reason is", async () => {
    stubRewriteEndpoint(await answerWith(REWRITE_LOSING_THE_NUMBER));
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    await runRewrite(user);

    const failure = await auditPanel().findByText(/o número «3» do trecho original não foi encontrado na proposta/i);
    const proposed = auditPanel().getByText(REWRITE_LOSING_THE_NUMBER);
    expect(failure.compareDocumentPosition(proposed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(auditPanel().getByText(/se você entendeu o motivo acima/i)).toBeInTheDocument();
  });
});

const ADDS_A_REFERENCE = "A comissão negou o pedido porque faltaram os 3 documentos citados no § 1º.";
const KEEPS_THE_PASSIVE = "O pedido foi indeferido pela comissão porque faltaram os 3 documentos citados acima.";

function failing(verified: VerifiedRewrite): string[] {
  return verified.verification.proofs
    .filter((p) => !p.passed)
    .map((p) => `${PROOF_CHECKS[p.check].kind}:${p.outcome}`)
    .sort();
}

async function showCard(proposed: string): Promise<VerifiedRewrite> {
  const verified = await answerWith(proposed);
  stubRewriteEndpoint(verified);
  const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
  await auditReady();
  await openPoint(user, "Voz passiva", "foi indeferido pela comissão");
  await runRewrite(user);
  await auditPanel().findByText(proposed);
  return verified;
}

describe("flow 5 · the card says what was confirmed and what was not verified", () => {
  it("the fixtures reach every state the card distinguishes", async () => {
    expect(failing(await answerWith(PLAIN_FIRST_SENTENCE))).toEqual([]);
    expect(failing(await answerWith(REWRITE_LOSING_THE_NUMBER))).toEqual(["guarantee:not_confirmed"]);
    expect(failing(await answerWith(ADDS_A_REFERENCE))).toEqual(["guarantee:addition"]);
    expect(failing(await answerWith(KEEPS_THE_PASSIVE))).toEqual(["effect:not_confirmed"]);
  });

  it.each([
    [PLAIN_FIRST_SENTENCE, /^usar como rascunho/i, /não encontrou divergência no que verifica/i],
    [REWRITE_LOSING_THE_NUMBER, /usar mesmo assim como rascunho/i, /há divergência/i],
    [ADDS_A_REFERENCE, /usar mesmo assim como rascunho/i, /há divergência/i],
    [KEEPS_THE_PASSIVE, /usar mesmo assim como rascunho/i, /ainda aponta problemas no trecho reescrito/i],
  ])("for «%s» the headline and the button follow the state", async (proposed, button, headline) => {
    await showCard(proposed);

    expect(auditPanel().getByText(headline)).toBeInTheDocument();
    expect(auditPanel().getByRole("button", { name: button })).toBeEnabled();
    expect(auditPanel().getByRole("group", { name: "Não verificado" })).toHaveTextContent(
      /o lucid não verifica: obrigações, permissões e proibições; condições e exceções;/i,
    );
    expect(auditPanel().queryByText(/nenhuma falha/i)).not.toBeInTheDocument();
    expect(document.querySelector('[style*="safe-weak"]')).toBeNull();
  });

  it("shows an addition with its exact text, under its own heading", async () => {
    await showCard(ADDS_A_REFERENCE);

    expect(
      within(auditPanel().getByRole("group", { name: "Acréscimo para conferir" })).getByRole("listitem"),
    ).toHaveTextContent("A proposta contém o número «1», que não aparece em algarismos no trecho original.");
    expect(auditPanel().queryByRole("group", { name: "Não confirmado" })).not.toBeInTheDocument();
  });

  it("lists under Confirmado only the guarantees that were confirmed, never a signal or an effect", async () => {
    const verified = await showCard(PLAIN_FIRST_SENTENCE);
    const guarantee = (p: Proof) => PROOF_CHECKS[p.check].kind === "guarantee";

    const listed = within(auditPanel().getByRole("group", { name: "Confirmado" }))
      .getAllByRole("listitem")
      .map((li) => li.textContent?.replace(/^✓/u, ""));
    expect(listed).toEqual(
      verified.verification.proofs.filter((p) => guarantee(p) && p.outcome === "confirmed").map((p) => p.detail),
    );
    for (const s of verified.verification.signals) expect(listed).not.toContain(s.detail);
  });

  it("puts an effect the rewrite did not reach under Efeito no texto, not under the guarantees", async () => {
    await showCard(KEEPS_THE_PASSIVE);

    expect(
      within(auditPanel().getByRole("group", { name: "Efeito no texto" })).getByRole("listitem"),
    ).toHaveTextContent("O Lucid ainda aponta «Voz passiva» no trecho reescrito (1 vez).");
    expect(auditPanel().queryByRole("group", { name: "Não confirmado" })).not.toBeInTheDocument();
  });
});
