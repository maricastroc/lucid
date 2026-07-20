/**
 * Agregação de findings em `Score` (docs/ARQUITETURA.md §7 passo 7, §9 Fase 1 item 10).
 *
 * IMPLEMENTAÇÃO MÍNIMA HONESTA: `byCriterion` é derivado da lista de passes
 * REGISTRADOS (não só dos findings produzidos) — um pass que rodou e não achou nada
 * aparece com contagem zero, em vez de desaparecer silenciosamente do placar. Com só
 * `sentenceLengthPass` registrado nesta etapa, `byCriterion` sempre tem exatamente uma
 * entrada; cresce organicamente conforme mais passes entrarem no registry, sem exigir
 * mudança de forma.
 *
 * Nenhuma nota geral, nenhum selo "aprovado" — só contagens e densidade por critério,
 * exatamente como `Score`/`CriterionScore` definem em `core/types.ts`.
 */
import type { Config } from "../config";
import type { CriterionScore, Finding, Pass, Score, Severity } from "../types";

function round(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
}

function countBySeverity(findings: readonly Finding[]): Record<Severity, number> {
  const count: Record<Severity, number> = { info: 0, warning: 0, error: 0 };
  for (const finding of findings) {
    count[finding.severity]++;
  }
  return count;
}

/**
 * `findings` deve já estar na ordem canônica final (irrelevante para o cálculo em si,
 * mas evita reordenar duas vezes); `wordCount` vem de `Metrics.words`, já calculado uma
 * única vez pelo orquestrador — este módulo nunca recalcula contagem de palavras.
 */
export function buildScore(
  findings: readonly Finding[],
  passes: readonly Pass[],
  wordCount: number,
  config: Config,
): Score {
  const byCriterion: CriterionScore[] = passes.map((pass) => {
    const passFindings = findings.filter((finding) => finding.criterion === pass.criterion);
    const densityPer100Words =
      wordCount === 0 ? 0 : round((passFindings.length / wordCount) * 100, config.metrics.decimalPlaces);

    return {
      criterion: pass.criterion,
      principle: pass.principle,
      count: countBySeverity(passFindings),
      densityPer100Words,
    };
  });

  return { byCriterion, totalFindings: findings.length };
}
