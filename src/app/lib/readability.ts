import type { Metrics, ReadabilityAnomaly, ReadabilityReading, ReadabilityUnmeasurableCause } from "@/lucid";
import { localePtBR, READABILITY_REFERENCE_RANGE } from "@/lucid";

/**
 * Copy da leiturabilidade — camada única, consumida pela UI E pelo relatório exportado.
 *
 * Regra do módulo: o valor medido aparece SEMPRE, sem truncamento; a interpretação vem
 * ao lado, nunca no lugar. Toda causa é nomeada (sem "indisponível" genérico) e os
 * `Record`/`switch` abaixo são exaustivos por tipo — causa nova não compila sem copy,
 * na disciplina do ADR-037 (fim do fallback silencioso).
 */

export interface ReadabilityDisplay {
  /** `false` só quando não existe medida — para o consumidor não ter que comparar com "—". */
  measured: boolean;
  /** O valor calculado, formatado. `"—"` somente quando `measured` é false. */
  value: string;
  /** Posição na escala — coordenada, nunca nota. */
  qualifier: string;
  /** Causas explícitas: por que não há medida, ou por que ela não descreve o texto. */
  notes: readonly string[];
}

const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1));

const RANGE = `${READABILITY_REFERENCE_RANGE.min}–${READABILITY_REFERENCE_RANGE.max}`;

const UNMEASURABLE_NOTE: Record<ReadabilityUnmeasurableCause, string> = {
  no_words: "Não há palavras para medir — nenhum valor foi calculado (não é zero).",
  no_sentences: "Não há frase delimitada para medir — nenhum valor foi calculado (não é zero).",
};

function anomalyNote(a: ReadabilityAnomaly): string {
  switch (a.cause) {
    case "small_sample":
      return (
        `Amostra pequena: ${a.words} ${a.words === 1 ? "palavra" : "palavras"}. A fórmula é calibrada para ` +
        `texto corrido; abaixo de ${a.threshold} palavras uma única palavra move o índice dezenas de pontos.`
      );
    case "sentence_boundary_missing":
      return (
        `${fmt(a.wordsPerSentence)} palavras por frase, acima do máximo plausível de ${a.threshold}: ` +
        `a segmentação não encontrou fronteira de frase — provável pontuação ausente no texto colado.`
      );
    case "syllables_per_word_impossible":
      return (
        `${fmt(a.syllablesPerWord)} sílabas por palavra, acima do máximo plausível de ${a.threshold}: ` +
        `a palavra mais longa do português tem 18 sílabas, então há token que não é palavra do idioma.`
      );
  }
}

export function describeReadability(reading: ReadabilityReading): ReadabilityDisplay {
  if (reading.kind === "unmeasurable") {
    return { measured: false, value: "—", qualifier: "sem medida", notes: [UNMEASURABLE_NOTE[reading.cause]] };
  }

  const notes = reading.anomalies.map(anomalyNote);
  const value = fmt(reading.value);

  switch (reading.position) {
    case "in_range":
      return {
        measured: true,
        value,
        qualifier: reading.band
          ? `faixa ${reading.band.label} (${reading.band.min}–${reading.band.max})`
          : `dentro do intervalo de referência (${RANGE})`,
        notes,
      };
    case "above_range":
      return { measured: true, value, qualifier: `acima do intervalo de referência (${RANGE})`, notes };
    case "below_range":
      return { measured: true, value, qualifier: `abaixo do intervalo de referência (${RANGE})`, notes };
  }
}

/** Atalho para quem tem o `Diagnostic` em mão: interpreta pela métrica do locale ativo. */
export function readabilityOf(metrics: Metrics): ReadabilityDisplay {
  return describeReadability(localePtBR.metrics.readability.interpret(metrics));
}
