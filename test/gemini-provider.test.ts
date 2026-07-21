import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatProviderError, GeminiProvider, GEMINI_MODELS } from "../src/llm";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Resposta mínima no formato do endpoint `generateContent`. */
function okResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
    }),
    headers: new Headers(),
  } as unknown as Response;
}

describe("GeminiProvider — allow-list (sem rede)", () => {
  it("rejeita modelo fora da allow-list antes de qualquer fetch", async () => {
    const provider = new GeminiProvider("chave-fake");
    await expect(provider.complete("oi", { model: "modelo-inexistente", temperature: 0 })).rejects.toBeInstanceOf(
      ChatProviderError,
    );
  });

  it("expõe a allow-list de modelos", () => {
    expect(GEMINI_MODELS).toContain("gemini-2.5-pro");
    expect(new GeminiProvider("x").models).toEqual(GEMINI_MODELS);
  });
});

describe("GeminiProvider — parse da resposta (fetch mockado)", () => {
  it("extrai o texto do primeiro candidate e registra o uso de tokens", async () => {
    const fetchMock = vi.fn(async () => okResponse('{"reescrita":"clara"}'));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("chave-fake");
    const out = await provider.complete("prompt", { model: "gemini-2.5-pro", temperature: 0 });

    expect(out).toBe('{"reescrita":"clara"}');
    expect(provider.lastUsage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });

    // chave vai no header, JAMAIS na URL (privacidade)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain("chave-fake");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("chave-fake");
    // temperature 0 no corpo (anti-drift)
    expect(JSON.parse(init.body as string).generationConfig.temperature).toBe(0);
  });

  it("resposta sem conteúdo vira ChatProviderError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ candidates: [] }), headers: new Headers() }) as unknown as Response),
    );
    const provider = new GeminiProvider("chave-fake");
    await expect(provider.complete("p", { model: "gemini-2.5-pro", temperature: 0 })).rejects.toBeInstanceOf(
      ChatProviderError,
    );
  });
});
