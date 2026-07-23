import type { Finding, Span } from "../../lucid/core/types";

export type RewriteStrategy = "correct" | "rewrite" | "directed";

export const STRATEGY_VERSION: Record<RewriteStrategy, string> = {
  correct: "correct@1",
  rewrite: "rewrite@2",
  directed: "directed@3",
};

export const REWRITE_PROMPT_VERSION = STRATEGY_VERSION.rewrite;

const CRITERION_HINT: Record<string, string> = {
  long_sentence: "O trecho é longo demais: divida em frases curtas, uma ideia por frase.",
  passive_voice: "Prefira a voz ativa: diga quem faz a ação (sem inventar, se o texto não disser).",
  nominalization: "Troque substantivos de ação pelos verbos correspondentes.",
  jargon: "Troque termos técnicos por palavras comuns equivalentes.",
};

const NO_INVENTION_RULES = `- NÃO acrescente fato, exemplo, número, data ou explicação que não esteja no trecho;
- NÃO invente quem praticou a ação — se o texto não diz o agente, NÃO diga (não crie "nós", "a
  equipe", "o governo" etc.);
- NÃO mude nem remova números, datas, valores ou nomes próprios.`;

function buildCorrectPrompt(target: Span, criterion?: string): string {
  const hint = criterion ? (CRITERION_HINT[criterion] ?? "") : "";
  return `Você corrige trechos em Linguagem Simples com a MENOR alteração possível.

Corrija o problema de clareza do trecho abaixo, mas:
- MANTENHA a estrutura, a ordem das ideias e o máximo das palavras originais;
- NÃO reorganize o discurso nem condense além do estritamente necessário;
- faça a menor mudança que resolva o problema.
${NO_INVENTION_RULES}
${hint ? `\nProblema a resolver: ${hint}\n` : ""}
TRECHO:
"""
${target.text}
"""

Responda SOMENTE com este JSON, sem texto fora dele:
{"reescrita": "o trecho corrigido aqui"}`;
}

function buildFreePrompt(fullText: string, target: Span, criterion?: string): string {
  const hint = criterion ? (CRITERION_HINT[criterion] ?? "") : "";
  return `Você reescreve textos em Linguagem Simples para um cidadão comum, sem NUNCA inventar.

Contexto: abaixo está o DOCUMENTO INTEIRO, apenas para você entender o assunto.
"""
${fullText}
"""

Sua tarefa: reescreva SOMENTE o TRECHO-ALVO abaixo para que um cidadão comum o entenda na
primeira leitura.

Você PODE, dentro do trecho-alvo:
- reorganizar a ordem das ideias e das frases;
- dividir uma frase longa em várias curtas (uma ideia por frase);
- condensar expressões e trocar palavras difíceis por comuns;
- mudar a estrutura do trecho.

Você NÃO PODE:
${NO_INVENTION_RULES}
${hint ? `\nObservação: ${hint}\n` : ""}
TRECHO-ALVO (reescreva só isto):
"""
${target.text}
"""

Responda SOMENTE com este JSON, sem texto fora dele:
{"reescrita": "sua reescrita do trecho-alvo aqui"}`;
}

const REQUIRES_HUMAN_LABEL: Record<string, string> = {
  passive_voice: "Voz passiva sem agente explícito",
};

const BEST_EFFORT_CRITERIA = new Set(["passive_voice"]);

function renderBriefing(findings: readonly Finding[], labelFor: (criterion: string) => string): string {
  const order: string[] = [];
  const spansByCriterion = new Map<string, string[]>();
  for (const f of findings) {
    const seen = spansByCriterion.get(f.criterion);
    if (seen) seen.push(f.span.text.replace(/\s+/g, " ").trim());
    else {
      spansByCriterion.set(f.criterion, [f.span.text.replace(/\s+/g, " ").trim()]);
      order.push(f.criterion);
    }
  }
  return order
    .map((criterion) => {
      const shortSpans = [...new Set((spansByCriterion.get(criterion) ?? []).filter((s) => s.split(/\s+/).length <= 6))];
      const examples = shortSpans.length ? ` (ex.: ${shortSpans.map((s) => `"${s}"`).join(", ")})` : "";
      return `- ${labelFor(criterion)}${examples}`;
    })
    .join("\n");
}

function buildDirectedPrompt(fullText: string, target: Span, findings: readonly Finding[]): string {
  const mandatory = findings.filter((f) => !f.requiresHuman);
  const bestEffort = findings.filter((f) => f.requiresHuman && BEST_EFFORT_CRITERIA.has(f.criterion));

  const mandatoryBrief = renderBriefing(
    mandatory,
    (c) => CRITERION_HINT[c] ?? "Resolva o problema de clareza apontado neste ponto.",
  );
  const bestEffortBrief = renderBriefing(bestEffort, (c) => REQUIRES_HUMAN_LABEL[c] ?? "Ponto que exige julgamento.");

  const sections: string[] = [];
  if (mandatoryBrief) {
    sections.push(`A engine determinística analisou o trecho e apontou os pontos abaixo. Resolva TODOS:\n${mandatoryBrief}`);
  }
  if (bestEffortBrief) {
    sections.push(
      "O ponto abaixo a engine NÃO resolve sozinha, porque o texto não diz quem pratica a ação. " +
        "TENTE reformular SEM inventar o agente — mude a estrutura da frase ou use o sujeito real que já " +
        'está no texto. Se a ÚNICA forma de resolver seria criar um agente que o texto não dá ("nós", ' +
        '"a equipe", "o órgão"), MANTENHA como está — não invente:\n' +
        bestEffortBrief,
    );
  }
  const brief = sections.length ? `\n${sections.join("\n\n")}\n` : "";
  return `Você reescreve textos em Linguagem Simples para um cidadão comum, sem NUNCA inventar.

Contexto: abaixo está o DOCUMENTO INTEIRO, apenas para você entender o assunto.
"""
${fullText}
"""

Sua tarefa: reescreva SOMENTE o TRECHO-ALVO abaixo para que um cidadão comum o entenda na
primeira leitura.
${brief}
Você PODE, dentro do trecho-alvo:
- reorganizar a ordem das ideias e das frases;
- dividir uma frase longa em várias curtas (uma ideia por frase);
- condensar expressões e trocar palavras difíceis por comuns;
- mudar a estrutura do trecho.

Você NÃO PODE:
${NO_INVENTION_RULES}

TRECHO-ALVO (reescreva só isto):
"""
${target.text}
"""

Responda SOMENTE com este JSON, sem texto fora dele:
{"reescrita": "sua reescrita do trecho-alvo aqui"}`;
}

export function buildRewritePrompt(
  fullText: string,
  target: Span,
  options: { strategy?: RewriteStrategy; criterion?: string; findings?: readonly Finding[] } = {},
): string {
  const strategy = options.strategy ?? "rewrite";
  if (strategy === "correct") return buildCorrectPrompt(target, options.criterion);
  if (strategy === "directed") return buildDirectedPrompt(fullText, target, options.findings ?? []);
  return buildFreePrompt(fullText, target, options.criterion);
}
