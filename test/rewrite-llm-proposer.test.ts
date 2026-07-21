import { describe, expect, it } from "vitest";
import {
  ChatProviderError,
  GroqProvider,
  GROQ_MODELS,
  LlmRewriteProposer,
  parseRewrite,
  REWRITE_PROMPT_VERSION,
  type ChatProvider,
} from "../src/report/rewrite";
import type { Finding } from "../src/lucid/core/types";

/** Provider mock determinístico — devolve uma resposta fixa; NUNCA toca a rede. */
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

function finding(text: string, criterion = "long_sentence"): Finding {
  return {
    criterion,
    category: "syntactic",
    principle: "5.3.4",
    span: { start: 0, end: text.length, text },
    severity: "warning",
    requiresHuman: true,
    justification: "",
  };
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

  it("usa o trecho do finding como original e a reescrita parseada como proposta", async () => {
    const provider = new MockChatProvider('{"reescrita": "Versão curta e clara."}');
    const proposer = new LlmRewriteProposer(provider, "m1");
    const f = finding("Um trecho longo e enrolado que precisa de ajuda.");

    const proposal = await proposer.propose({ text: f.span.text, finding: f });

    expect(proposal.original).toBe(f.span.text);
    expect(proposal.proposed).toBe("Versão curta e clara.");
    expect(proposal.proposerId).toBe(`mock:m1+${REWRITE_PROMPT_VERSION}`);
    // o trecho entra no prompt enviado ao modelo
    expect(provider.lastPrompt).toContain(f.span.text);
  });

  it("resposta ilegível → proposta = original (honesto, não fabrica)", async () => {
    const proposer = new LlmRewriteProposer(new MockChatProvider("não sei responder"), "m1");
    const f = finding("Trecho original intacto.");
    const proposal = await proposer.propose({ text: f.span.text, finding: f });
    expect(proposal.proposed).toBe(f.span.text);
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
