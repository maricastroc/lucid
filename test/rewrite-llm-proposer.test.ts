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

describe("parseRewrite — robustez do parse", () => {
  it("JSON limpo", () => {
    expect(parseRewrite('{"reescrita": "texto claro"}')).toBe("texto claro");
  });
  it("embrulhado em cerca ```json + texto ao redor", () => {
    expect(parseRewrite('Claro!\n```json\n{"reescrita": "texto claro"}\n```')).toBe("texto claro");
  });
  it("reescrita vazia → null (cai no original)", () => {
    expect(parseRewrite('{"reescrita": "  "}')).toBeNull();
  });
  it("JSON malformado → null", () => {
    expect(parseRewrite("desculpe, não consigo")).toBeNull();
  });
});

describe("LlmRewriteProposer", () => {
  it("id carrega provedor, modelo e versão do prompt (proveniência/anti-drift)", () => {
    const proposer = new LlmRewriteProposer(new MockChatProvider("{}"), "m1");
    expect(proposer.id).toBe(`mock:m1+${REWRITE_PROMPT_VERSION}`);
  });

  it("usa o trecho-alvo como original e a reescrita parseada como proposta", async () => {
    const provider = new MockChatProvider('{"reescrita": "Versão curta e clara."}');
    const proposer = new LlmRewriteProposer(provider, "m1");
    const target = span("Um trecho longo e enrolado que precisa de ajuda.");

    const proposal = await proposer.propose({ text: target.text, target, criterion: "long_sentence" });

    expect(proposal.original).toBe(target.text);
    expect(proposal.proposed).toBe("Versão curta e clara.");
    expect(proposal.proposerId).toBe(`mock:m1+${REWRITE_PROMPT_VERSION}`);
    expect(provider.lastPrompt).toContain(target.text);
  });

  it("resposta ilegível → proposta = original (honesto, não fabrica)", async () => {
    const proposer = new LlmRewriteProposer(new MockChatProvider("não sei responder"), "m1");
    const target = span("Trecho original intacto.");
    const proposal = await proposer.propose({ text: target.text, target });
    expect(proposal.proposed).toBe(target.text);
  });

  it("resposta ilegível → parseOutcome sinaliza 'unparseable' (LUCID-012: não passa despercebido)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const proposer = new LlmRewriteProposer(new MockChatProvider("não sei responder"), "m1");
    const target = span("Trecho original intacto.");
    const proposal = await proposer.propose({ text: target.text, target, criterion: "long_sentence" });
    expect(proposal.parseOutcome).toBe("unparseable");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("long_sentence");
    warnSpy.mockRestore();
  });

  it("resposta parseável → parseOutcome = 'ok', sem warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const provider = new MockChatProvider('{"reescrita": "Versão curta e clara."}');
    const proposer = new LlmRewriteProposer(provider, "m1");
    const target = span("Um trecho longo e enrolado que precisa de ajuda.");
    const proposal = await proposer.propose({ text: target.text, target });
    expect(proposal.parseOutcome).toBe("ok");
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("a estratégia entra no id e escolhe o prompt (correct minimiza, rewrite reorganiza)", async () => {
    const t = span("Um trecho.");
    const correct = new MockChatProvider('{"reescrita":"x"}');
    const rewrite = new MockChatProvider('{"reescrita":"x"}');
    await new LlmRewriteProposer(correct, "m1", "correct").propose({ text: t.text, target: t });
    await new LlmRewriteProposer(rewrite, "m1", "rewrite").propose({ text: t.text, target: t });

    expect(new LlmRewriteProposer(correct, "m1", "correct").id).toBe("mock:m1+correct@1");
    expect(new LlmRewriteProposer(rewrite, "m1", "rewrite").id).toBe("mock:m1+rewrite@2");

    expect(correct.lastPrompt).toMatch(/MENOR alteração/);
    expect(rewrite.lastPrompt).toMatch(/DOCUMENTO INTEIRO/);
  });
});

describe("GroqProvider — allow-list (sem rede)", () => {
  it("rejeita modelo fora da allow-list antes de qualquer fetch", async () => {
    const provider = new GroqProvider("chave-fake");
    await expect(provider.complete("oi", { model: "modelo-inexistente", temperature: 0 })).rejects.toBeInstanceOf(
      ChatProviderError,
    );
  });

  it("expõe a allow-list de modelos gratuitos do Groq", () => {
    expect(GROQ_MODELS.length).toBeGreaterThanOrEqual(3);
    expect(new GroqProvider("x").models).toEqual(GROQ_MODELS);
  });
});
