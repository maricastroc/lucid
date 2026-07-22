/**
 * Pass "título longo ou em forma de frase" (`long_heading`) — `5.2`, fácil de localizar (Princípio 2).
 *
 * Um título é um RÓTULO: o leitor o usa para varrer o documento e localizar a seção que procura.
 * Quando o título fica longo, ou quando é escrito como uma frase (fecha com ponto final, ou junta
 * mais de uma oração), ele deixa de cumprir esse papel — vira mini-texto que o leitor precisa ler
 * inteiro. Este detector, como o `salto_de_nivel_titulo`, só existe porque um formato ESTRUTURADO
 * (DOCX) fornece blocos `heading`; texto puro não tem título de verdade → nunca dispara.
 *
 * Dois gatilhos, um por título (comprimento tem prioridade — nunca duas marcas no mesmo bloco):
 *  - COMPRIMENTO: contagem de palavras acima do limite configurável.
 *  - FORMA DE FRASE: ≥2 frases no bloco, OU termina com ponto final. Interrogação NÃO conta —
 *    um título-pergunta ("O que muda para você?") é boa Linguagem Simples, não um defeito.
 *
 * Determinístico e conservador. NÃO reescreve: encurtar ou reformular um título exige decidir o que
 * é essencial para o leitor (`requiresHuman`, sem `suggestion`).
 */
import type { Finding, Pass } from "@/lucid/core/types";

const CRITERION = "long_heading";
const PRINCIPLE = "5.2";

/** Fecha como oração afirmativa: termina em ponto final, mas não em reticências. */
function endsAsStatement(text: string): boolean {
  const t = text.trimEnd();
  if (t.endsWith("…") || t.endsWith("...")) return false;
  return t.endsWith(".");
}

export const longHeadingPass: Pass = {
  criterion: CRITERION,
  category: "structural",
  principle: PRINCIPLE,

  run(ctx) {
    if (!ctx.config.longHeading.enabled) return [];

    const max = ctx.config.longHeading.maxWords;
    const findings: Finding[] = [];

    for (const block of ctx.doc.blocks) {
      if (block.kind !== "heading") continue;
      const span = { start: block.start, end: block.end, text: block.text };

      if (block.wordCount > max) {
        findings.push({
          criterion: CRITERION,
          category: "structural",
          principle: PRINCIPLE,
          span,
          severity: "warning",
          requiresHuman: true,
          justification:
            `Título com ${block.wordCount} palavras (acima de ${max}). Um título é um rótulo para varrer e ` +
            "localizar a seção; quando fica longo, o leitor precisa lê-lo inteiro em vez de usá-lo como referência. " +
            "Encurtar exige decidir o que é essencial — a ferramenta não reescreve títulos.",
          meta: { reason: "length", words: block.wordCount, threshold: max },
        });
        continue; // um título ganha uma marca só; o comprimento tem prioridade.
      }

      const multi = block.sentences.length >= 2;
      if (multi || endsAsStatement(block.text)) {
        findings.push({
          criterion: CRITERION,
          category: "structural",
          principle: PRINCIPLE,
          span,
          severity: "warning",
          requiresHuman: true,
          justification: multi
            ? `Título formado por ${block.sentences.length} frases — um título é um rótulo, não um texto corrido. ` +
              "Reduza a uma etiqueta curta que o leitor use para localizar a seção; a ferramenta não faz esse corte."
            : "Título termina com ponto final, como uma frase — títulos são rótulos e não fecham como oração. " +
              "Rever a forma é decisão de autor; a ferramenta não reescreve títulos.",
          meta: { reason: "sentence", words: block.wordCount, sentences: block.sentences.length },
        });
      }
    }

    return findings;
  },
};
