import { NextResponse } from "next/server";
import type { Span } from "@/lucid";
import { ChatProviderError, GeminiProvider, GEMINI_MODELS, GroqProvider, GROQ_MODELS } from "@/llm";
import { LlmRewriteProposer, proposeAndVerify, type RewriteProposer } from "@/report/rewrite";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";
import { LlmComprehensionProbe } from "@/lucid/probe/llm-probe";
import type { ComprehensionProbe } from "@/lucid/probe/types";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 20_000;

const FLOOR_QUESTION = "Qual é o fato principal que este trecho comunica?";

interface RewriteRequestBody {
  text?: unknown;
  target?: unknown;
  criterion?: unknown;
  providerId?: unknown;
  model?: unknown;
  localeId?: unknown;
}

const SUPPORTED_LOCALES: Record<string, typeof rewriteLocalePtBR> = { "pt-BR": rewriteLocalePtBR };

function isValidSpan(value: unknown, textLength: number): value is Span {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  if (typeof s.start !== "number" || typeof s.end !== "number" || typeof s.text !== "string") return false;
  return s.start >= 0 && s.end <= textLength && s.start < s.end;
}

function buildProposer(providerId: string, model: string): RewriteProposer | { error: string; status: number } {
  if (providerId === "groq") {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return { error: "GROQ_API_KEY não configurada no servidor", status: 400 };
    if (!GROQ_MODELS.includes(model as (typeof GROQ_MODELS)[number])) {
      return { error: `modelo não permitido para o Groq: ${model}`, status: 400 };
    }
    return new LlmRewriteProposer(new GroqProvider(apiKey), model);
  }
  if (providerId === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: "GEMINI_API_KEY não configurada no servidor", status: 400 };
    if (!GEMINI_MODELS.includes(model as (typeof GEMINI_MODELS)[number])) {
      return { error: `modelo não permitido para o Gemini: ${model}`, status: 400 };
    }
    return new LlmRewriteProposer(new GeminiProvider(apiKey), model);
  }
  return { error: `provedor desconhecido: ${providerId}`, status: 400 };
}

/** Modelo de piso: `llama-3.3-70b-versatile`, mesmo achado de `api/probe/route.ts` (o 8B se
 * autocontradiz na extração literal — degrada o sinal `meaning_preserved` silenciosamente). */
function buildProbe(): ComprehensionProbe | null {
  if (process.env.GROQ_API_KEY) {
    return new LlmComprehensionProbe(new GroqProvider(process.env.GROQ_API_KEY), "llama-3.3-70b-versatile");
  }
  if (process.env.GEMINI_API_KEY) {
    return new LlmComprehensionProbe(new GeminiProvider(process.env.GEMINI_API_KEY), "gemini-2.5-flash");
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  let body: RewriteRequestBody;
  try {
    body = (await request.json()) as RewriteRequestBody;
  } catch {
    return NextResponse.json({ error: "corpo inválido (JSON esperado)" }, { status: 400 });
  }

  const { text, target, criterion, providerId, model, localeId } = body;
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "texto ausente ou longo demais" }, { status: 400 });
  }
  if (typeof providerId !== "string" || typeof model !== "string") {
    return NextResponse.json({ error: "providerId e model são obrigatórios" }, { status: 400 });
  }
  if (!isValidSpan(target, text.length)) {
    return NextResponse.json({ error: "alvo (span) inválido" }, { status: 400 });
  }
  const resolvedLocaleId = typeof localeId === "string" ? localeId : "pt-BR";
  const locale = SUPPORTED_LOCALES[resolvedLocaleId];
  if (!locale) {
    return NextResponse.json({ error: `locale não suportado: ${resolvedLocaleId}` }, { status: 400 });
  }

  const proposer = buildProposer(providerId, model);
  if ("error" in proposer) {
    return NextResponse.json({ error: proposer.error }, { status: proposer.status });
  }

  const probe = buildProbe();

  try {
    const result = await proposeAndVerify(text, target, proposer, {
      locale,
      criterion: typeof criterion === "string" ? criterion : undefined,
      probe: probe ?? undefined,
      question: probe ? FLOOR_QUESTION : undefined,
    });
    return NextResponse.json(result);
  } catch (cause) {
    if (cause instanceof ChatProviderError) {
      return NextResponse.json({ error: cause.message }, { status: 502 });
    }
    return NextResponse.json({ error: "falha ao gerar a reescrita" }, { status: 500 });
  }
}
