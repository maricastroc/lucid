import { describe, expect, it, vi } from "vitest";
import { LlmRewriteProposer, parseRewrite, REWRITE_PROMPT_VERSION, STRATEGY_VERSION } from "../src/report/rewrite";
import { stableHash } from "../src/lucid";
import { ChatProviderError, GEMINI_MODELS, GeminiProvider, type ChatProvider } from "../src/llm";
import type { Span } from "../src/lucid/core/types";

class MockChatProvider implements ChatProvider {
  readonly id = "mock";
  readonly models = ["m1"] as const;
  lastPrompt = "";
  constructor(private readonly reply: string) {}
  async complete(prompt: string): Promise<string> {
    this.lastPrompt = prompt;
    return this.reply;
  }
}

function span(text: string): Span {
  return { start: 0, end: text.length, text };
}

describe("parseRewrite — parsing robustness", () => {
  it("clean JSON", () => {
    expect(parseRewrite('{"reescrita": "texto claro"}')).toBe("texto claro");
  });
  it("wrapped in a ```json fence plus surrounding text", () => {
    expect(parseRewrite('Claro!\n```json\n{"reescrita": "texto claro"}\n```')).toBe("texto claro");
  });
  it("empty rewrite → null (falls back to the original)", () => {
    expect(parseRewrite('{"reescrita": "  "}')).toBeNull();
  });
  it("malformed JSON → null", () => {
    expect(parseRewrite("desculpe, não consigo")).toBeNull();
  });
});

describe("LlmRewriteProposer", () => {
  it("the id carries provider, model and prompt version (provenance/anti-drift)", () => {
    const proposer = new LlmRewriteProposer(new MockChatProvider("{}"), "m1");
    expect(proposer.id).toBe(`mock:m1+${REWRITE_PROMPT_VERSION}`);
  });

  it("uses the target excerpt as the original and the parsed rewrite as the proposal", async () => {
    const provider = new MockChatProvider('{"reescrita": "Versão curta e clara."}');
    const proposer = new LlmRewriteProposer(provider, "m1");
    const target = span("Um trecho longo e enrolado que precisa de ajuda.");

    const proposal = await proposer.propose({ text: target.text, target, criterion: "long_sentence" });

    expect(proposal.original).toBe(target.text);
    expect(proposal.proposed).toBe("Versão curta e clara.");
    expect(proposal.proposerId).toBe(`mock:m1+${REWRITE_PROMPT_VERSION}`);
    expect(provider.lastPrompt).toContain(target.text);
  });

  it("the proposerId follows the strategy that was executed, not the one the proposer was built with", async () => {
    const provider = new MockChatProvider('{"reescrita": "Versão curta e clara."}');
    const proposer = new LlmRewriteProposer(provider, "m1");
    const target = span("Um trecho longo e enrolado que precisa de ajuda.");

    const proposal = await proposer.propose({ text: target.text, target, strategy: "directed" });

    expect(proposer.id).toBe(`mock:m1+${STRATEGY_VERSION.rewrite}`);
    expect(proposal.proposerId).toBe(`mock:m1+${STRATEGY_VERSION.directed}`);
    expect(proposal.provenance?.strategy).toBe(STRATEGY_VERSION.directed);
  });

  it("records the provenance of the call: provider, model, the prompt sent and the configuration", async () => {
    const provider = new MockChatProvider('{"reescrita": "Versão curta e clara."}');
    const target = span("Um trecho longo e enrolado que precisa de ajuda.");

    const bare = await new LlmRewriteProposer(provider, "m1").propose({ text: target.text, target });
    expect(bare.provenance).toEqual({
      providerId: "mock",
      model: "m1",
      strategy: REWRITE_PROMPT_VERSION,
      generation: null,
      promptHash: stableHash(provider.lastPrompt),
      promptChars: provider.lastPrompt.length,
    });

    const configured: ChatProvider = {
      id: "mock",
      models: ["m1"],
      complete: provider.complete.bind(provider),
      requestConfig: (options) => ({ temperature: options.temperature, maxOutputTokens: options.maxTokens }),
    };
    const withConfig = await new LlmRewriteProposer(configured, "m1").propose({ text: target.text, target });
    expect(withConfig.provenance?.generation).toEqual({ temperature: 0, maxOutputTokens: 2048 });
  });

  it("an unreadable response is a typed failure, never a proposal equal to the original (LUCID-012)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const proposer = new LlmRewriteProposer(new MockChatProvider("não sei responder"), "m1");
    const target = span("Trecho original intacto.");

    const failure = await proposer.propose({ text: target.text, target, criterion: "long_sentence" }).catch((e) => e);

    expect(failure).toBeInstanceOf(ChatProviderError);
    expect(failure).toMatchObject({ kind: "unusable", message: "o modelo não devolveu uma proposta utilizável" });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("long_sentence");
    warnSpy.mockRestore();
  });

  it("a parseable response becomes the proposal, with no warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const provider = new MockChatProvider('{"reescrita": "Versão curta e clara."}');
    const proposer = new LlmRewriteProposer(provider, "m1");
    const target = span("Um trecho longo e enrolado que precisa de ajuda.");
    const proposal = await proposer.propose({ text: target.text, target });
    expect(proposal.proposed).toBe("Versão curta e clara.");
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("the strategy enters the id and picks the prompt (correct minimizes, rewrite reorganizes)", async () => {
    const t = span("Um trecho.");
    const correct = new MockChatProvider('{"reescrita":"x"}');
    const rewrite = new MockChatProvider('{"reescrita":"x"}');
    await new LlmRewriteProposer(correct, "m1", "correct").propose({ text: t.text, target: t });
    await new LlmRewriteProposer(rewrite, "m1", "rewrite").propose({ text: t.text, target: t });

    expect(new LlmRewriteProposer(correct, "m1", "correct").id).toBe("mock:m1+correct@1");
    expect(new LlmRewriteProposer(rewrite, "m1", "rewrite").id).toBe("mock:m1+rewrite@6");

    expect(correct.lastPrompt).toMatch(/MENOR alteração/);
    expect(rewrite.lastPrompt).toMatch(/DOCUMENTO — para ler, não para reescrever/);
  });

  it("rewrite2 still builds the previous prompt, byte for byte", async () => {
    const t = span("Um trecho.");
    const previous = new MockChatProvider('{"reescrita":"x"}');
    await new LlmRewriteProposer(previous, "m1", "rewrite2").propose({ text: t.text, target: t });

    expect(new LlmRewriteProposer(previous, "m1", "rewrite2").id).toBe("mock:m1+rewrite@2");
    expect(previous.lastPrompt).toMatch(/DOCUMENTO INTEIRO/);
    expect(previous.lastPrompt).not.toMatch(/PRINCÍPIO INVIOLÁVEL/);
  });
});

describe("GeminiProvider — allow-list (no network)", () => {
  it("rejects a model outside the allow-list before any fetch", async () => {
    const provider = new GeminiProvider("fake-key");
    await expect(provider.complete("oi", { model: "nonexistent-model", temperature: 0 })).rejects.toBeInstanceOf(
      ChatProviderError,
    );
  });

  it("exposes exactly the allow-list, and the allow-list is not empty", () => {
    expect(GEMINI_MODELS.length).toBeGreaterThan(0);
    expect(new GeminiProvider("x").models).toEqual(GEMINI_MODELS);
    expect(new Set(GEMINI_MODELS).size).toBe(GEMINI_MODELS.length);
  });
});
