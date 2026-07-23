import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatProviderError, DeepSeekProvider, DEEPSEEK_MODELS } from "../src/llm";

afterEach(() => {
  vi.unstubAllGlobals();
});

function okResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }),
    headers: new Headers(),
  } as unknown as Response;
}

describe("DeepSeekProvider — allow-list (sem rede)", () => {
  it("rejeita modelo fora da allow-list antes de qualquer fetch", async () => {
    const provider = new DeepSeekProvider("chave-fake");
    await expect(provider.complete("oi", { model: "modelo-inexistente", temperature: 0 })).rejects.toBeInstanceOf(
      ChatProviderError,
    );
  });

  it("expõe a allow-list de modelos", () => {
    expect(DEEPSEEK_MODELS).toContain("deepseek-v4-flash");
    expect(new DeepSeekProvider("x").models).toEqual(DEEPSEEK_MODELS);
  });
});

describe("DeepSeekProvider — parse da resposta (fetch mockado)", () => {
  it("extrai o texto da primeira choice e registra o uso de tokens", async () => {
    const fetchMock = vi.fn(async () => okResponse('{"reescrita":"clara"}'));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new DeepSeekProvider("chave-fake");
    const out = await provider.complete("prompt", { model: "deepseek-v4-flash", temperature: 0 });

    expect(out).toBe('{"reescrita":"clara"}');
    expect(provider.lastUsage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer chave-fake");
    expect(JSON.parse(init.body as string).temperature).toBe(0);
  });

  it("resposta sem conteúdo vira ChatProviderError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [] }), headers: new Headers() }) as unknown as Response),
    );
    const provider = new DeepSeekProvider("chave-fake");
    await expect(provider.complete("p", { model: "deepseek-v4-flash", temperature: 0 })).rejects.toBeInstanceOf(
      ChatProviderError,
    );
  });

  it("erro não-429 vira ChatProviderError sem retry", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 402,
      json: async () => ({ error: { message: "Insufficient Balance" } }),
      headers: new Headers(),
    }) as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const provider = new DeepSeekProvider("chave-fake");
    await expect(provider.complete("p", { model: "deepseek-v4-flash", temperature: 0 })).rejects.toThrow(
      /Insufficient Balance/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
