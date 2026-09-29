import { NextResponse } from "next/server";
import { PROBE_SECTION_ENABLED } from "../../lib/probe-availability";
import { PROBE_MAX_EXCERPT as MAX_TEXT_LENGTH } from "../../lib/probe-excerpt";
import { ChatProviderError, GeminiProvider, redactSecrets } from "@/llm";
import { LlmComprehensionProbe } from "@/lucid/probe/llm-probe";
import { interpret } from "@/lucid/probe/interpret";
import type { ComprehensionProbe } from "@/lucid/probe/types";

export const runtime = "nodejs";

function buildFloorProbe(): ComprehensionProbe | { error: string } {
  if (process.env.GEMINI_API_KEY) {
    return new LlmComprehensionProbe(new GeminiProvider(process.env.GEMINI_API_KEY), "gemini-2.5-flash");
  }
  return { error: "nenhum provedor de IA configurado no servidor (GEMINI_API_KEY)" };
}

interface ProbeRequestBody {
  text?: unknown;
  pergunta?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  if (!PROBE_SECTION_ENABLED) {
    return NextResponse.json({ error: "o teste de compreensão está desativado" }, { status: 404 });
  }

  let body: ProbeRequestBody;
  try {
    body = (await request.json()) as ProbeRequestBody;
  } catch {
    return NextResponse.json({ error: "requisição inválida: o corpo precisa ser JSON" }, { status: 400 });
  }

  const { text, pergunta } = body;
  if (typeof text !== "string" || text.trim() === "") {
    return NextResponse.json({ error: "texto ausente" }, { status: 400 });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      {
        error:
          `o teste de compreensão lê um trecho, não o documento inteiro: recebeu ` +
          `${text.length.toLocaleString("pt-BR")} caracteres, e o limite é ${MAX_TEXT_LENGTH.toLocaleString("pt-BR")}. ` +
          "A auditoria determinística não depende dele.",
      },
      { status: 413 },
    );
  }
  if (typeof pergunta !== "string" || pergunta.trim() === "") {
    return NextResponse.json({ error: "informe a pergunta que o leitor veio fazer" }, { status: 400 });
  }

  const probe = buildFloorProbe();
  if ("error" in probe) {
    return NextResponse.json({ error: probe.error }, { status: 400 });
  }

  try {
    const result = await probe.probe({ trecho: text, pergunta }, { signal: request.signal });
    const signal = interpret(result);
    return NextResponse.json({ signal, result, probeId: probe.id });
  } catch (cause) {
    if (cause instanceof ChatProviderError) {
      return NextResponse.json(
        { error: redactSecrets(cause.message, [process.env.GEMINI_API_KEY ?? ""]), kind: cause.kind },
        { status: cause.kind === "quota" || cause.kind === "rate_limit" ? 429 : 502 },
      );
    }
    return NextResponse.json({ error: "erro interno do servidor" }, { status: 500 });
  }
}
