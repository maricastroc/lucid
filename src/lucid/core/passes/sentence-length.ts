/**
 * Pass "comprimento de frase" (docs/ARQUITETURA.md §6, critério 1 · CLAUDE.md, critério
 * 1 do MVP) — `5.3.4`, frases concisas.
 *
 * Determinístico e mecânico até onde é seguro: mede `Sentence.wordCount` (JÁ calculado
 * por `tokenize.ts`/`attachTokens` — este pass NUNCA retokeniza nem recalcula) contra os
 * limiares de `Config.sentenceLength`, e produz um `Finding` por frase acima do limiar
 * de alerta.
 *
 * O que ele NÃO faz, de propósito: não decide o que cortar, não reordena a frase, não
 * propõe uma versão mais curta. Encurtar uma frase exige decidir o que é supérfluo — é
 * trabalho de autor (Princípio 1, Relevante), não uma transformação mecânica segura
 * (I7). Por isso `suggestion` nunca é preenchida e `requiresHuman` é sempre `true` — é
 * literalmente o exemplo de `requiresHuman` citado em CLAUDE.md ("corte do supérfluo").
 *
 * Frases que a segmentação uniu pela política conservadora (abreviação/sigla — ver
 * `segment-sentences.ts` e `test/document-regression.test.ts`) não recebem tratamento
 * especial aqui: este pass só lê o `wordCount` que já veio pronto na `Sentence`. Se a
 * união produziu uma frase mais longa, ela é avaliada como qualquer outra — corrigir a
 * segmentação não é responsabilidade deste pass.
 *
 * `justification` é texto final exibido ao usuário — permanece em português, conforme
 * a regra do produto (mensagens para o usuário final ficam em PT-BR; só a nomenclatura
 * interna do código foi padronizada para inglês).
 */
import type { Config } from "../config";
import type { Finding, Pass, Severity } from "../types";

const CRITERION = "long_sentence";
const PRINCIPLE = "5.3.4";

interface ExceededThreshold {
  severity: Severity;
  threshold: number;
}

function evaluateThreshold(wordCount: number, config: Config): ExceededThreshold | null {
  const { warnAbove, errorAbove } = config.sentenceLength;

  if (wordCount > errorAbove) {
    return { severity: "error", threshold: errorAbove };
  }
  if (wordCount > warnAbove) {
    return { severity: "warning", threshold: warnAbove };
  }
  return null;
}

export const sentenceLengthPass: Pass = {
  criterion: CRITERION,
  category: "syntactic",
  principle: PRINCIPLE,

  run(ctx) {
    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const exceeded = evaluateThreshold(sentence.wordCount, ctx.config);
      if (!exceeded) continue;

      const { severity, threshold } = exceeded;

      findings.push({
        criterion: CRITERION,
        category: "syntactic",
        principle: PRINCIPLE,
        span: { start: sentence.start, end: sentence.end, text: sentence.text },
        severity,
        requiresHuman: true,
        justification:
          `Frase com ${sentence.wordCount} palavras — acima do limite de ${threshold} ` +
          `(${severity === "error" ? "erro" : "alerta"}). Considere dividir em frases ` +
          "menores ou cortar informação supérflua; a ferramenta não reescreve " +
          "automaticamente.",
        meta: { words: sentence.wordCount, threshold },
      });
    }

    return findings;
  },
};
