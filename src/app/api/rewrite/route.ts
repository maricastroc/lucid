/**
 * Tier 3 · rota server-side da reescrita (ADR-015).
 *
 * A chamada de LLM roda AQUI, nunca no browser — a `GROQ_API_KEY` fica no servidor e jamais
 * é devolvida ao cliente. Recebe o texto + o finding-alvo + o modelo escolhido, roda
 * `proposeAndVerify` (o proposer real + o verificador determinístico) e devolve o
 * `VerifiedRewrite`. O verificador é o mesmo de sempre: a proposta chega julgada, nunca
 * como selo verde.
 */
import { NextResponse } from "next/server";
import type { Finding } from "@/lucid";
import {
  ChatProviderError,
  GroqProvider,
  GROQ_MODELS,
  LlmRewriteProposer,
  proposeAndVerify,
  type RewriteProposer,
} from "@/report/rewrite";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 20_000;

interface RewriteRequestBody {
  text?: unknown;
  finding?: unknown;
  providerId?: unknown;
  model?: unknown;
}

/** Valida o mínimo do finding que o proposer/verificador usam, sem confiar no cliente. */
function isValidFinding(value: unknown, textLength: number): value is Finding {
  if (typeof value !== "object" || value === null) return false;
  const f = value as Record<string, unknown>;
  if (typeof f.criterion !== "string") return false;
  const span = f.span as Record<string, unknown> | undefined;
  if (!span || typeof span.start !== "number" || typeof span.end !== "number" || typeof span.text !== "string") {
    return false;
  }
  return span.start >= 0 && span.end <= textLength && span.start < span.end;
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

export async function POST(request: Request): Promise<Response> {
  let body: RewriteRequestBody;
  try {
    body = (await request.json()) as RewriteRequestBody;
  } catch {
    return NextResponse.json({ error: "corpo inválido (JSON esperado)" }, { status: 400 });
  }

  const { text, finding, providerId, model } = body;
  if (typeof text !== "string" || text.length === 0 || text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "texto ausente ou longo demais" }, { status: 400 });
  }
  if (typeof providerId !== "string" || typeof model !== "string") {
    return NextResponse.json({ error: "providerId e model são obrigatórios" }, { status: 400 });
  }
  if (!isValidFinding(finding, text.length)) {
    return NextResponse.json({ error: "finding inválido" }, { status: 400 });
  }

  const proposer = buildProposer(providerId, model);
  if ("error" in proposer) {
    return NextResponse.json({ error: proposer.error }, { status: proposer.status });
  }

  try {
    const result = await proposeAndVerify(text, finding, proposer);
    return NextResponse.json(result);
  } catch (cause) {
    // Erro de provedor (rede/HTTP/chave inválida) → 502; mensagem segura, sem a chave.
    if (cause instanceof ChatProviderError) {
      return NextResponse.json({ error: cause.message }, { status: 502 });
    }
    return NextResponse.json({ error: "falha ao gerar a reescrita" }, { status: 500 });
  }
}
