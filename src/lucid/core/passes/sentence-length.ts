/**
 * Pass "comprimento de frase" (docs/ARQUITETURA.md §6, critério 1 · CLAUDE.md, critério
 * 1 do MVP) — `5.3.4`, frases concisas.
 *
 * Determinístico e mecânico até onde é seguro: mede `Sentence.wordCount` (JÁ calculado
 * por `tokenize.ts`/`attachTokens` — este pass NUNCA retokeniza nem recalcula) contra os
 * limiares de `Config.frase`, e produz um `Finding` por frase acima do limiar de alerta.
 *
 * O que ele NÃO faz, de propósito: não decide o que cortar, não reordena a frase, não
 * propõe uma versão mais curta. Encurtar uma frase exige decidir o que é supérfluo — é
 * trabalho de autor (Princípio 1, Relevante), não uma transformação mecânica seguem
 * (I7). Por isso `sugestao` nunca é preenchida e `requiresHuman` é sempre `true` — é
 * literalmente o exemplo de `requiresHuman` citado em CLAUDE.md ("corte do supérfluo").
 *
 * Frases que a segmentação uniu pela política conservadora (abreviação/sigla — ver
 * `segment-sentences.ts` e `test/document-regression.test.ts`) não recebem tratamento
 * especial aqui: este pass só lê o `wordCount` que já veio pronto na `Sentence`. Se a
 * união produziu uma frase mais longa, ela é avaliada como qualquer outra — corrigir a
 * segmentação não é responsabilidade deste pass.
 */
import type { Config } from "../config";
import type { Finding, Pass, Severity } from "../types";

const CRITERIO = "frase_longa";
const PRINCIPIO = "5.3.4";

interface LimiarExcedido {
  severidade: Severity;
  limite: number;
}

function avaliarLimiar(wordCount: number, config: Config): LimiarExcedido | null {
  const { alertaAcimaDe, erroAcimaDe } = config.frase;

  if (wordCount > erroAcimaDe) {
    return { severidade: "erro", limite: erroAcimaDe };
  }
  if (wordCount > alertaAcimaDe) {
    return { severidade: "alerta", limite: alertaAcimaDe };
  }
  return null;
}

export const sentenceLengthPass: Pass = {
  criterio: CRITERIO,
  categoria: "sintatico",
  principio: PRINCIPIO,

  run(ctx) {
    const findings: Finding[] = [];

    for (const sentence of ctx.doc.sentences) {
      const excedido = avaliarLimiar(sentence.wordCount, ctx.config);
      if (!excedido) continue;

      const { severidade, limite } = excedido;

      findings.push({
        criterio: CRITERIO,
        categoria: "sintatico",
        principio: PRINCIPIO,
        trecho: { start: sentence.start, end: sentence.end, texto: sentence.text },
        severidade,
        requiresHuman: true,
        justificativa:
          `Frase com ${sentence.wordCount} palavras — acima do limite de ${limite} ` +
          `(${severidade}). Considere dividir em frases menores ou cortar informação ` +
          "supérflua; a ferramenta não reescreve automaticamente.",
        meta: { palavras: sentence.wordCount, limite },
      });
    }

    return findings;
  },
};
