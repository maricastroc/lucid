import { afterEach, describe, expect, it, vi } from "vitest";
import { analyze } from "@/lucid";
import { proposeAndVerify, StubRewriteProposer, type VerifiedRewrite } from "@/report/rewrite";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";
import { rewriteTargetAt } from "@/app/lib/paragraphs";
import { mountStudio } from "./support/mount-studio";
import { auditPanel, documentRegion } from "./support/panels";
import { auditReady, openPoint } from "./support/points";
import {
  PASSIVE_AND_JARGON,
  PLAIN_FIRST_SENTENCE,
  REWRITE_LOSING_THE_NUMBER,
} from "./support/documents";

/**
 * The panel talks to /api/rewrite. The response is built here by the real proposer and the real
 * verifier, so the verdict under test is the engine's own — only the network hop is replaced.
 */
async function answerWith(proposed: string): Promise<VerifiedRewrite> {
  const finding = analyze(PASSIVE_AND_JARGON).findings[0];
  const target = rewriteTargetAt(PASSIVE_AND_JARGON, finding.span.start).span;
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

    expect(await auditPanel().findByText(/nenhuma falha encontrada/i)).toBeInTheDocument();
    expect(auditPanel().getByText(/medição, não aprovação/i)).toBeInTheDocument();
    expect(auditPanel().getByText(PLAIN_FIRST_SENTENCE)).toBeInTheDocument();
  });

  it("applies the proposal as the author's draft and records who proposed it", async () => {
    stubRewriteEndpoint(await answerWith(PLAIN_FIRST_SENTENCE));
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    await runRewrite(user);
    await auditPanel().findByText(/nenhuma falha encontrada/i);
    await user.click(auditPanel().getByRole("button", { name: /^usar como rascunho/i }));

    expect(documentRegion().getByRole("article")).toHaveTextContent(/a comissão negou o pedido/i);
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

    expect(await auditPanel().findByText(/uma prova falhou/i)).toBeInTheDocument();
    expect(auditPanel().queryByRole("button", { name: /^usar como rascunho/i })).not.toBeInTheDocument();
  });

  it("still lets the author override, saying plainly that it is their call", async () => {
    stubRewriteEndpoint(await answerWith(REWRITE_LOSING_THE_NUMBER));
    const { user } = mountStudio({ text: PASSIVE_AND_JARGON });
    await auditReady();
    await openPoint(user, "Voz passiva", "foi indeferido pela comissão");

    await runRewrite(user);
    await auditPanel().findByText(/uma prova falhou/i);
    const override = auditPanel().getByRole("button", { name: /usar mesmo assim como rascunho/i });
    expect(override).toBeEnabled();

    await user.click(override);

    expect(documentRegion().getByRole("article")).toHaveTextContent(/a comissão negou o pedido/i);
  });
});
