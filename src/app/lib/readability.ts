import type { Metrics, ReadabilityAnomaly, ReadabilityReading, ReadabilityUnmeasurableCause } from "@/lucid";
import { localePtBR, READABILITY_REFERENCE_RANGE } from "@/lucid";

export interface ReadabilityDisplay {
  measured: boolean;
  value: string;
  qualifier: string;
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

export function readabilityOf(metrics: Metrics): ReadabilityDisplay {
  return describeReadability(localePtBR.metrics.readability.interpret(metrics));
}
