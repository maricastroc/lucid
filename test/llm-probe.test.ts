import { describe, expect, it } from "vitest";
import { LlmComprehensionProbe, parseProbeResult } from "../src/lucid/probe/llm-probe";
import { PROBE_PROMPT_VERSION } from "../src/lucid/probe/prompt";
import { interpret } from "../src/lucid/probe/interpret";
import type { ChatProvider } from "../src/llm";

/** Provider mock — resposta fixa, sem rede. */
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

describe("parseProbeResult — robusto e pessimista", () => {
  it("JSON completo é lido fielmente", () => {
    const r = parseProbeResult(
      '{"pode_responder": true, "resposta_extraida": "o prazo é 30 dias", "onde_travou": [], "operacoes_de_leitura": ["integrar_entre_frases"], "precisou_inferir": false}',
    );
    expect(r.podeResponder).toBe(true);
    expect(r.respostaExtraida).toBe("o prazo é 30 dias");
    expect(r.operacoesDeLeitura).toEqual(["integrar_entre_frases"]);
  });

  it("desembrulha cerca ```json + texto ao redor", () => {
    const r = parseProbeResult('Aqui:\n```json\n{"pode_responder": false, "precisou_inferir": true}\n```');
    expect(r.podeResponder).toBe(false);
    expect(r.precisouInferir).toBe(true);
  });

  it("lixo/JSON inválido → caso PESSIMISTA (não consegue responder)", () => {
    const r = parseProbeResult("não sei");
    expect(r.podeResponder).toBe(false);
    expect(r.respostaExtraida).toBe("o texto não diz");
  });

  it("descarta operações de leitura fora do enum fechado", () => {
    const r = parseProbeResult('{"pode_responder": true, "operacoes_de_leitura": ["inventada", "integrar_entre_frases"]}');
    expect(r.operacoesDeLeitura).toEqual(["integrar_entre_frases"]);
  });
});

describe("LlmComprehensionProbe", () => {
  it("id carrega provedor, modelo e versão do prompt", () => {
    const probe = new LlmComprehensionProbe(new MockChatProvider("{}"), "m1");
    expect(probe.id).toBe(`mock:m1+${PROBE_PROMPT_VERSION}`);
  });

  it("manda trecho+pergunta no prompt e devolve o ProbeResult parseado", async () => {
    const provider = new MockChatProvider('{"pode_responder": false, "precisou_inferir": true}');
    const probe = new LlmComprehensionProbe(provider, "m1");
    const result = await probe.probe({ trecho: "trecho X", pergunta: "quando começa?" });

    expect(provider.lastPrompt).toContain("trecho X");
    expect(provider.lastPrompt).toContain("quando começa?");
    // e o resultado, passado ao interpret, nunca vira "aprovado" — só flag/neutro (I5)
    expect(interpret(result).tipo).toBe("flag");
  });
});
