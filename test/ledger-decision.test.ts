import { describe, expect, it } from "vitest";
import {
  LlmRewriteProposer,
  NOT_VERIFIED,
  proposeAndVerify,
  StubRewriteProposer,
  type VerifiedRewrite,
} from "../src/report/rewrite";
import { rewriteLocalePtBR } from "../src/locales/pt-BR/tier3";
import type { ChatProvider } from "../src/llm";
import { decisionRecord, renderLedgerMarkdown, type LedgerEntry } from "../src/app/lib/ledger";

const TEXT = "O prazo de 30 dias conta a partir do pedido, conforme o art. 7º desta Lei.";
const TARGET = { start: 0, end: TEXT.length, text: TEXT };
const AT = "2026-09-26T18:40:00.000Z";

async function verified(proposed: string): Promise<VerifiedRewrite> {
  return proposeAndVerify(TEXT, TARGET, new StubRewriteProposer({ [TEXT]: proposed }, "stub-test@1"), {
    locale: rewriteLocalePtBR,
  });
}

const LOSES_THE_ARTICLE = "O prazo de 30 dias conta a partir do pedido, conforme a regra desta Lei.";
const KEEPS_EVERYTHING = "O prazo de 30 dias conta a partir do pedido, como diz o art. 7º desta Lei.";

describe("decisionRecord — what the trail keeps when the author uses a verified version", () => {
  it("a divergence is recorded as used anyway, with the exact message the author saw", async () => {
    const record = decisionRecord(await verified(LOSES_THE_ARTICLE), AT);

    expect(record.decision).toBe("used_anyway");
    expect(record.verification.notConfirmed).toEqual([
      {
        check: "numbers_kept",
        detail: "O número «7» do trecho original não foi encontrado na proposta com a mesma grafia.",
      },
      {
        check: "references_kept",
        detail: "A referência «art. 7º» do trecho original não foi encontrada na proposta.",
      },
    ]);
    expect(record.verification.additions).toEqual([]);
    expect(record.verification.notVerified).toEqual(NOT_VERIFIED.map((d) => d.id));
    expect(record.decidedAt).toBe(AT);
    expect(record.provenance).toBeUndefined();
  });

  it("a version with no divergence is recorded as used, and the unverified list still goes with it", async () => {
    const record = decisionRecord(await verified(KEEPS_EVERYTHING), AT);

    expect(record.decision).toBe("used");
    expect(record.verification.notConfirmed).toEqual([]);
    expect(record.verification.additions).toEqual([]);
    expect(record.verification.effects).toEqual([]);
    expect(record.verification.notVerified.length).toBe(NOT_VERIFIED.length);
  });

  it("an addition alone is also used anyway", async () => {
    const record = decisionRecord(
      await verified("O prazo de 30 dias conta a partir do pedido, conforme o art. 7º, § 1º, desta Lei."),
      AT,
    );

    expect(record.decision).toBe("used_anyway");
    expect(record.verification.notConfirmed).toEqual([]);
    expect(record.verification.additions.map((c) => c.check)).toEqual(["numbers_added", "references_added"]);
  });

  it("copies the provenance of an AI proposal", async () => {
    const provider: ChatProvider = {
      id: "mock",
      models: ["m1"],
      complete: async () => JSON.stringify({ reescrita: KEEPS_EVERYTHING }),
      requestConfig: () => ({ temperature: 0, maxOutputTokens: 2048 }),
    };
    const result = await proposeAndVerify(TEXT, TARGET, new LlmRewriteProposer(provider, "m1"), {
      locale: rewriteLocalePtBR,
      strategy: "directed",
    });

    expect(decisionRecord(result, AT).provenance).toEqual(result.proposal.provenance);
    expect(result.proposal.provenance?.strategy).toBe("directed@4");
  });
});

describe("renderLedgerMarkdown — the report says what was used anyway", () => {
  it("lists each divergence under the decision, then where the version came from", async () => {
    const entry: LedgerEntry = {
      source: "ai",
      label: "Reescrita por IA · mock:m1+directed@4",
      proposerId: "mock:m1+directed@4",
      before: TEXT,
      after: LOSES_THE_ARTICLE,
      burdenBefore: 3,
      burdenAfter: 2,
      ...decisionRecord(await verified(LOSES_THE_ARTICLE), AT),
      provenance: {
        providerId: "mock",
        model: "m1",
        strategy: "directed@4",
        generation: { temperature: 0, maxOutputTokens: 2048 },
        promptHash: "1a2b3c4d",
        promptChars: 1234,
      },
    };
    const lines = renderLedgerMarkdown([entry], "pt-BR").split("\n");

    const at = lines.indexOf("_Usado mesmo assim:_");
    expect(at).toBeGreaterThan(0);
    expect(lines.slice(at + 1, at + 5)).toEqual([
      "- Não confirmado: O número «7» do trecho original não foi encontrado na proposta com a mesma grafia.",
      "- Não confirmado: A referência «art. 7º» do trecho original não foi encontrada na proposta.",
      '_proposta:_ mock · m1 · directed@4 · prompt 1a2b3c4d (1234 caracteres) · configuração {"maxOutputTokens":2048,"temperature":0}',
      `_decidido em:_ ${AT}`,
    ]);
    expect(lines.filter((l) => l.startsWith("_Em cada versão verificada, o Lucid não verifica:"))).toHaveLength(1);
  });

  it("an entry recorded before the decision existed renders as it did", () => {
    const legacy: LedgerEntry = {
      source: "ai",
      label: "Reescrita por IA · rewrite@6",
      burdenBefore: 3,
      burdenAfter: 1,
    };
    const out = renderLedgerMarkdown([legacy], "pt-BR");

    expect(out).not.toContain("Usado");
    expect(out).not.toContain("não verifica");
  });
});
