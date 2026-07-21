/**
 * Tier 3 · rota server-side da reescrita (ADR-015/016).
 *
 * A chamada de LLM roda AQUI, nunca no browser — a `GROQ_API_KEY` fica no servidor e jamais
 * é devolvida ao cliente. Recebe o texto inteiro (contexto) + o ALVO (um `Span`: a frase de um
 * finding ou um parágrafo) + o modelo, roda `proposeAndVerify` (o proposer real + o
 * verificador determinístico + a sonda de compreensão como guard de sentido) e devolve o
 * `VerifiedRewrite`. A proposta chega julgada, nunca como selo verde.
 */
import { NextResponse } from "next/server";
import type { Span } from "@/lucid";
import { ChatProviderError, GroqProvider, GROQ_MODELS } from "@/llm";
import { LlmRewriteProposer, proposeAndVerify, type RewriteProposer } from "@/report/rewrite";
import { LlmComprehensionProbe } from "@/lucid/probe/llm-probe";
import type { ComprehensionProbe } from "@/lucid/probe/types";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 20_000;

/** Pergunta de piso genérica para o teste NEGATIVO de sentido (a camada de app não tem uma específica). */
const FLOOR_QUESTION = "Qual é o fato principal que este trecho comunica?";

interface RewriteRequestBody {
  text?: unknown;
  target?: unknown;
  criterion?: unknown;
  providerId?: unknown;
  model?: unknown;
}

/** Valida o `Span`-alvo sem confiar no cliente: offsets dentro do texto e não-vazio. */
function isValidSpan(value: unknown, textLength: number): value is Span {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  if (typeof s.start !== "number" || typeof s.end !== "number" || typeof s.text !== "string") return false;
  return s.start >= 0 && s.end <= textLength && s.start < s.end;
}

/** Monta o proposer server-side para o provedor pedido, lendo a chave do ambiente. */
function buildProposer(providerId: string, model: string): RewriteProposer | { error: string; status: number } {
  if (providerId === "groq") {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return { error: "GROQ_API_KEY não configurada no servidor", status: 400 };
    if (!GROQ_MODELS.includes(model as (typeof GROQ_MODELS)[number])) {
      return { error: `modelo não permitido para o Groq: ${model}`, status: 400 };
    }
    return new LlmRewriteProposer(new GroqProvider(apiKey), model);
  }
  return { error: `provedor desconhecido: ${providerId}`, status: 400 };
}

/** Sonda de sentido no mesmo provedor, se a chave existir. Sem ela, o SINAL fica omitido. */
function buildProbe(providerId: string): ComprehensionProbe | null {
  if (providerId === "groq" && process.env.GROQ_API_KEY) {
    // Modelo pequeno e barato para o piso; a sonda só precisa ler literalmente.
    return new LlmComprehensionProbe(new GroqProvider(process.env.GROQ_API_KEY), "llama-3.1-8b-instant");
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

  const { text, target, criterion, providerId, model } = body;
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "texto ausente ou longo demais" }, { status: 400 });
  }
  if (typeof providerId !== "string" || typeof model !== "string") {
    return NextResponse.json({ error: "providerId e model são obrigatórios" }, { status: 400 });
  }
  if (!isValidSpan(target, text.length)) {
    return NextResponse.json({ error: "alvo (span) inválido" }, { status: 400 });
  }

  const proposer = buildProposer(providerId, model);
  if ("error" in proposer) {
    return NextResponse.json({ error: proposer.error }, { status: proposer.status });
  }

  const probe = buildProbe(providerId);

  try {
    const result = await proposeAndVerify(text, target, proposer, {
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
