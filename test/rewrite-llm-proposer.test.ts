import { describe, expect, it, vi } from "vitest";
import { LlmRewriteProposer, parseRewrite, REWRITE_PROMPT_VERSION } from "../src/report/rewrite";
import { ChatProviderError, GroqProvider, GROQ_MODELS, type ChatProvider } from "../src/llm";
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

  it("an unreadable response → proposal = original (honest, fabricates nothing)", async () => {
    const proposer = new LlmRewriteProposer(new MockChatProvider("não sei responder"), "m1");
    const target = span("Trecho original intacto.");
    const proposal = await proposer.propose({ text: target.text, target });
    expect(proposal.proposed).toBe(target.text);
  });

  it("an unreadable response → parseOutcome reports 'unparseable' (LUCID-012: it does not slip by)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const proposer = new LlmRewriteProposer(new MockChatProvider("não sei responder"), "m1");
    const target = span("Trecho original intacto.");
    const proposal = await proposer.propose({ text: target.text, target, criterion: "long_sentence" });
    expect(proposal.parseOutcome).toBe("unparseable");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("long_sentence");
    warnSpy.mockRestore();
  });

  it("a parseable response → parseOutcome = 'ok', with no warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const provider = new MockChatProvider('{"reescrita": "Versão curta e clara."}');
    const proposer = new LlmRewriteProposer(provider, "m1");
    const target = span("Um trecho longo e enrolado que precisa de ajuda.");
    const proposal = await proposer.propose({ text: target.text, target });
    expect(proposal.parseOutcome).toBe("ok");
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

describe("GroqProvider — allow-list (no network)", () => {
  it("rejects a model outside the allow-list before any fetch", async () => {
    const provider = new GroqProvider("fake-key");
    await expect(provider.complete("oi", { model: "nonexistent-model", temperature: 0 })).rejects.toBeInstanceOf(
      ChatProviderError,
    );
  });

  it("exposes exactly the allow-list, and the allow-list is not empty", () => {
    expect(GROQ_MODELS.length).toBeGreaterThan(0);
    expect(new GroqProvider("x").models).toEqual(GROQ_MODELS);
    expect(new Set(GROQ_MODELS).size).toBe(GROQ_MODELS.length);
  });
});
