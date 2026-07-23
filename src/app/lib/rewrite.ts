import { analyze, type Finding, type Span } from "@/lucid";
import { DEEPSEEK_MODELS, GEMINI_MODELS, GROQ_MODELS } from "@/llm";
import {
  proposeAndVerify,
  StubRewriteProposer,
  verifyRewrite,
  type AgentDeclaration,
  type RewriteStrategy,
  type VerifiedRewrite,
} from "@/report/rewrite";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";
import { manualEditReplacement } from "./text-edit";

const ACTIVE_LOCALE_ID = "pt-BR";

export interface RewriteModel {
  providerId: "stub" | "groq" | "gemini" | "deepseek";
  model: string;
  label: string;
}

export const REWRITE_MODELS: readonly RewriteModel[] = [
  { providerId: "gemini", model: GEMINI_MODELS[0], label: "Gemini · 2.5 Flash (gerador forte)" },
  { providerId: "deepseek", model: DEEPSEEK_MODELS[0], label: "DeepSeek · V4 Flash (pago, ~$0,14/1M)" },
  { providerId: "groq", model: GROQ_MODELS[0], label: "Groq · Llama 3.3 70B" },
  { providerId: "groq", model: GROQ_MODELS[1], label: "Groq · Llama 3.1 8B" },
  { providerId: "groq", model: GROQ_MODELS[2], label: "Groq · GPT-OSS 120B" },
  { providerId: "groq", model: GROQ_MODELS[3], label: "Groq · GPT-OSS 20B" },
];

const SAMPLE_FIXTURES: Record<string, string> = {
  [`Foi realizada a análise do documento pela comissão competente em sede de procedimento administrativo destinado à verificação das condições supracitadas exigidas para a concessão do benefício, e a decisão foi comunicada ao interessado no processo.`]:
    "A comissão competente analisou o documento em procedimento administrativo. O objetivo era verificar as condições exigidas para conceder o benefício. Depois, o órgão comunicou a decisão ao interessado.",
};

const stubProposer = new StubRewriteProposer(SAMPLE_FIXTURES, "stub-demo@1");

function overlapsTarget(f: Finding, target: Span): boolean {
  return f.span.start < target.end && f.span.end > target.start;
}

export interface GenerateRewriteOptions {
  criterion?: string;
  directed?: boolean;
  /**
   * Respostas de elicitação do autor (ADR-055). Sempre entram na VERIFICAÇÃO
   * (requisito declarado = requisito cobrado, seja qual for o gerador); só entram
   * no PROMPT na estratégia dirigida — a única que carrega briefing.
   */
  declarations?: readonly AgentDeclaration[];
  /** Cancela a geração (ex.: o usuário clicou "Cancelar", ou a nota foi fechada). */
  signal?: AbortSignal;
}

export async function generateRewrite(
  text: string,
  target: Span,
  choice: RewriteModel,
  options: GenerateRewriteOptions = {},
): Promise<VerifiedRewrite> {
  const { criterion, directed, declarations, signal } = options;
  const strategy: RewriteStrategy | undefined = directed ? "directed" : undefined;
  const findings = directed ? analyze(text).findings.filter((f) => overlapsTarget(f, target)) : undefined;

  if (choice.providerId === "stub") {
    return proposeAndVerify(text, target, stubProposer, {
      criterion,
      strategy,
      findings,
      declarations,
      locale: rewriteLocalePtBR,
      signal,
    });
  }

  const response = await fetch("/api/rewrite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      target,
      criterion,
      strategy,
      findings,
      declarations,
      providerId: choice.providerId,
      model: choice.model,
      localeId: ACTIVE_LOCALE_ID,
    }),
    signal,
  });

  const data = (await response.json().catch(() => null)) as VerifiedRewrite | { error?: string } | null;
  if (!response.ok || data === null || !("verification" in data)) {
    const message = (data && "error" in data && data.error) || `falha ao gerar (HTTP ${response.status})`;
    throw new Error(message);
  }
  return data;
}

export async function verifyManualEdit(
  text: string,
  target: Span,
  draft: string,
  declarations?: readonly AgentDeclaration[],
): Promise<VerifiedRewrite> {
  const proposal = {
    proposerId: "sua edição",
    original: target.text,
    proposed: manualEditReplacement(draft),
  };
  // A declaração vale para o autor também (nenhuma fonte é privilegiada): se você
  // declarou o agente, a sua versão é cobrada pela mesma prova que cobra a IA.
  const verification = await verifyRewrite(text, target, proposal, { locale: rewriteLocalePtBR, declarations });
  return { proposal, verification };
}
