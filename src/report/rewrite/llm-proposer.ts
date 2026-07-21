/**
 * Tier 3 · `LlmRewriteProposer` — proposer real, sobre um `ChatProvider` (ADR-015).
 *
 * Monta o prompt versionado, chama o modelo (temperature 0), e extrai a reescrita do JSON.
 * O modelo só PROPÕE; o verificador determinístico (já existente) é quem julga. Se a
 * resposta vier ilegível ou vazia, devolve `proposed = original` — HONESTO: o verificador
 * então mostra que o alvo não foi resolvido, em vez de fingir uma reescrita.
 *
 * `id = "<provider>:<model>+<prompt-version>"` — proveniência para eval/anti-drift e para o
 * benchmark ("qual modelo, sob qual prompt").
 */
import { buildRewritePrompt, REWRITE_PROMPT_VERSION } from "./prompt";
import type { ChatProvider } from "./providers/types";
import type { RewriteProposal, RewriteProposer, RewriteRequest } from "./types";

/**
 * Extrai `{ "reescrita": "..." }` do texto do modelo, tolerando cercas ```json e texto ao
 * redor. Retorna `null` se não achar uma string de reescrita — o chamador cai no original.
 */
export function parseRewrite(raw: string): string | null {
  const tryParse = (candidate: string): string | null => {
    try {
      const parsed = JSON.parse(candidate) as { reescrita?: unknown };
      return typeof parsed.reescrita === "string" && parsed.reescrita.trim() !== ""
        ? parsed.reescrita.trim()
        : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(raw.trim());
  if (direct !== null) return direct;

  // Desembrulha o primeiro objeto {...} presente (cobre cercas ```json e texto ao redor).
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return tryParse(raw.slice(start, end + 1));
  return null;
}

export class LlmRewriteProposer implements RewriteProposer {
  readonly id: string;
  private readonly provider: ChatProvider;
  private readonly model: string;

  constructor(provider: ChatProvider, model: string) {
    this.provider = provider;
    this.model = model;
    this.id = `${provider.id}:${model}+${REWRITE_PROMPT_VERSION}`;
  }

  async propose(request: RewriteRequest): Promise<RewriteProposal> {
    const original = request.finding.span.text;
    const prompt = buildRewritePrompt(original, request.finding.criterion);
    const raw = await this.provider.complete(prompt, { model: this.model, temperature: 0 });
    const parsed = parseRewrite(raw);
    return { proposerId: this.id, original, proposed: parsed ?? original };
  }
}
