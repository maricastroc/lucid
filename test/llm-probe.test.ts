import { describe, expect, it } from "vitest";
import { LlmComprehensionProbe, parseProbeResult } from "../src/lucid/probe/llm-probe";
import { PROBE_PROMPT_VERSION } from "../src/lucid/probe/prompt";
import { interpret } from "../src/lucid/probe/interpret";
import type { ChatProvider } from "../src/llm";

class MockChatProvider implements ChatProvider {
  readonly id = "mock";
  readonly models = ["m1"] as const;
  lastPrompt = "";
  lastSignal: AbortSignal | undefined;
  constructor(private readonly reply: string) {}
  async complete(prompt: string, options?: { signal?: AbortSignal }): Promise<string> {
    this.lastPrompt = prompt;
    this.lastSignal = options?.signal;
    return this.reply;
  }
}

describe("parseProbeResult — robust and pessimistic", () => {
  it("a complete JSON is read faithfully", () => {
    const r = parseProbeResult(
      '{"pode_responder": true, "resposta_extraida": "o prazo é 30 dias", "onde_travou": [], "operacoes_de_leitura": ["integrar_entre_frases"], "precisou_inferir": false}',
    );
    expect(r.podeResponder).toBe(true);
    expect(r.respostaExtraida).toBe("o prazo é 30 dias");
    expect(r.operacoesDeLeitura).toEqual(["integrar_entre_frases"]);
  });

  it("unwraps a ```json fence plus surrounding text", () => {
    const r = parseProbeResult('Aqui:\n```json\n{"pode_responder": false, "precisou_inferir": true}\n```');
    expect(r.podeResponder).toBe(false);
    expect(r.precisouInferir).toBe(true);
  });

  it("garbage/invalid JSON → PESSIMISTIC case (cannot answer)", () => {
    const r = parseProbeResult("não sei");
    expect(r.podeResponder).toBe(false);
    expect(r.respostaExtraida).toBe("o texto não diz");
  });

  it("discards reading operations outside the closed enum", () => {
    const r = parseProbeResult(
      '{"pode_responder": true, "operacoes_de_leitura": ["inventada", "integrar_entre_frases"]}',
    );
    expect(r.operacoesDeLeitura).toEqual(["integrar_entre_frases"]);
  });
});

describe("LlmComprehensionProbe", () => {
  it("the id carries provider, model and prompt version", () => {
    const probe = new LlmComprehensionProbe(new MockChatProvider("{}"), "m1");
    expect(probe.id).toBe(`mock:m1+${PROBE_PROMPT_VERSION}`);
  });

  it("sends excerpt+question in the prompt and returns the parsed ProbeResult", async () => {
    const provider = new MockChatProvider('{"pode_responder": false, "precisou_inferir": true}');
    const probe = new LlmComprehensionProbe(provider, "m1");
    const result = await probe.probe({ trecho: "trecho X", pergunta: "quando começa?" });

    expect(provider.lastPrompt).toContain("trecho X");
    expect(provider.lastPrompt).toContain("quando começa?");
    expect(interpret(result).tipo).toBe("flag");
  });

  it("forwards the AbortSignal to the provider (M6: cancellation has to reach the LLM call)", async () => {
    const provider = new MockChatProvider("{}");
    const probe = new LlmComprehensionProbe(provider, "m1");
    const controller = new AbortController();

    await probe.probe({ trecho: "trecho X", pergunta: "?" }, { signal: controller.signal });

    expect(provider.lastSignal).toBe(controller.signal);
  });
});
