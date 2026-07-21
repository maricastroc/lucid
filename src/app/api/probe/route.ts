import { NextResponse } from "next/server";
import { ChatProviderError, GeminiProvider, GroqProvider } from "@/llm";
import { LlmComprehensionProbe } from "@/lucid/probe/llm-probe";
import { interpret } from "@/lucid/probe/interpret";
import type { ComprehensionProbe } from "@/lucid/probe/types";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 8000;

function buildFloorProbe(): ComprehensionProbe | { error: string } {
  if (process.env.GROQ_API_KEY) {
    return new LlmComprehensionProbe(new GroqProvider(process.env.GROQ_API_KEY), "llama-3.1-8b-instant");
  }
  if (process.env.GEMINI_API_KEY) {
    return new LlmComprehensionProbe(new GeminiProvider(process.env.GEMINI_API_KEY), "gemini-2.5-flash");
  }
  return { error: "nenhum provedor de LLM configurado no servidor (GROQ_API_KEY ou GEMINI_API_KEY)" };
}

interface ProbeRequestBody {
  text?: unknown;
  pergunta?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  let body: ProbeRequestBody;
  try {
    body = (await request.json()) as ProbeRequestBody;
  } catch {
    return NextResponse.json({ error: "corpo inválido (JSON esperado)" }, { status: 400 });
  }

  const { text, pergunta } = body;
  if (typeof text !== "string" || text.trim() === "" || text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "texto ausente ou longo demais" }, { status: 400 });
  }
  if (typeof pergunta !== "string" || pergunta.trim() === "") {
    return NextResponse.json({ error: "informe a pergunta que o leitor veio fazer" }, { status: 400 });
  }

  const probe = buildFloorProbe();
  if ("error" in probe) {
    return NextResponse.json({ error: probe.error }, { status: 400 });
  }

  try {
    const result = await probe.probe({ trecho: text, pergunta });
    const signal = interpret(result);
    return NextResponse.json({ signal, result, probeId: probe.id });
  } catch (cause) {
    if (cause instanceof ChatProviderError) {
      return NextResponse.json({ error: cause.message }, { status: 502 });
    }
    return NextResponse.json({ error: "falha ao rodar a sonda" }, { status: 500 });
  }
}
