import { analyze, type Finding, type Span } from "@/lucid";
import { GEMINI_MODELS } from "@/llm";
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
import { copyFor } from "../i18n/copy";
import { DEFAULT_UI_LANG, type UiLang } from "../i18n/types";

const ACTIVE_LOCALE_ID = "pt-BR";

export interface RewriteModel {
  providerId: "stub" | "groq" | "gemini" | "deepseek";
  model: string;
  name: string;
}

export const REWRITE_MODELS: readonly RewriteModel[] = [
  { providerId: "gemini", model: GEMINI_MODELS[0], name: "Gemini · 2.5 Flash" },
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
  declarations?: readonly AgentDeclaration[];
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
  const crossing = analyze(text).findings.filter((f) => overlapsTarget(f, target));
  const briefing = crossing;
  const findings = directed ? crossing : undefined;

  if (choice.providerId === "stub") {
    return proposeAndVerify(text, target, stubProposer, {
      criterion,
      strategy,
      briefing,
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
      briefing,
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
  criterion?: string,
  declarations?: readonly AgentDeclaration[],
  lang: UiLang = DEFAULT_UI_LANG,
): Promise<VerifiedRewrite> {
  const proposal = {
    proposerId: copyFor(lang).note.proposerManual,
    original: target.text,
    proposed: manualEditReplacement(draft),
  };

  const verification = await verifyRewrite(text, target, proposal, {
    locale: rewriteLocalePtBR,
    criterion,
    declarations,
  });
  return { proposal, verification };
}
