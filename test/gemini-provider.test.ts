import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatProviderError, GeminiProvider, GEMINI_MODELS } from "../src/llm";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

describe("GeminiProvider — allow-list (no network)", () => {
  it("rejects a model outside the allow-list before any fetch", async () => {
    const provider = new GeminiProvider("fake-key");
    await expect(provider.complete("oi", { model: "nonexistent-model", temperature: 0 })).rejects.toBeInstanceOf(
      ChatProviderError,
    );
  });

  it("exposes the model allow-list", () => {
    expect(GEMINI_MODELS).toContain("gemini-2.5-flash");
    expect(new GeminiProvider("x").models).toEqual(GEMINI_MODELS);
  });
});

describe("GeminiProvider — response parsing (mocked fetch)", () => {
  it("extracts the text of the first candidate and records token usage", async () => {
    const fetchMock = vi.fn(async () => okResponse('{"reescrita":"clara"}'));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("fake-key");
    const out = await provider.complete("prompt", { model: "gemini-2.5-flash", temperature: 0 });

    expect(out).toBe('{"reescrita":"clara"}');
    expect(provider.lastUsage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain("fake-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("fake-key");
    expect(JSON.parse(init.body as string).generationConfig.temperature).toBe(0);
  });

  it("a response with no content becomes a ChatProviderError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ candidates: [] }), headers: new Headers() }) as unknown as Response),
    );
    const provider = new GeminiProvider("fake-key");
    await expect(provider.complete("p", { model: "gemini-2.5-flash", temperature: 0 })).rejects.toBeInstanceOf(
      ChatProviderError,
    );
  });
});
