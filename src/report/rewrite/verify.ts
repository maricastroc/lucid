/**
 * Tier 3 · o VERIFICADOR determinístico (docs/HANDOFF.md §3; ADR-014).
 *
 * Recebe uma proposta de reescrita e a submete à engine da Camada 1 como juíza. Separa,
 * por construção, PROVA de SINAL:
 *   · PROVA (determinística, de `analyze()` ou extração mecânica): a violação-alvo sumiu; o
 *     total de findings não aumentou; números e datas preservados; nenhum jargão novo; delta
 *     de métricas.
 *   · SINAL (heurístico, nunca prova): entidades/nomes preservados (heurística de
 *     maiúscula/sigla); sentido preservado via SONDA como teste NEGATIVO (se o leitor de piso
 *     extraía o fato do original e não da proposta, algo se perdeu).
 *
 * HONESTIDADE (I5): não há saída "aprovado". Tudo passar = "nenhuma falha de piso
 * detectada", jamais evidência positiva de qualidade. `hasBlockingFailure` é um veto
 * mecânico (alguma prova falhou), não o oposto de aprovação.
 *
 * Fronteira: `report/**` pode importar `core` e `probe`. `core` nunca importa daqui.
 */
import { analyze, type Finding } from "../../lucid";
import type { ComprehensionProbe } from "../../lucid/probe/types";
import { interpret } from "../../lucid/probe/interpret";
import type { MetricsDelta, Proof, RewriteProposal, RewriteVerification, VerificationSignal } from "./types";

export interface VerifyOptions {
  /** sonda opcional para o SINAL de sentido (teste negativo). Sem ela, esse sinal é omitido. */
  probe?: ComprehensionProbe;
  /** a pergunta que o leitor veio fazer — exigida junto com `probe`. */
  question?: string;
}

const RE_NUMBER = /\d[\d.,]*\d|\d/gu;
const RE_DATE = /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/gu;
/** Palavra Capitalizada (nome próprio) ou sigla em CAIXA-ALTA — heurística de entidade. */
const RE_ENTITY = /\b(?:\p{Lu}\p{Ll}[\p{L}]*|\p{Lu}{2,})\b/gu;

function extractSorted(text: string, re: RegExp): string[] {
  return (text.match(re) ?? []).slice().sort();
}

/** Igualdade de multiconjunto (ordem irrelevante, repetição importa). */
function sameMultiset(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, i) => value === b[i]);
}

/** `[a,b)` de `f.span` intersecta `[start,end)`? */
function overlaps(f: Finding, start: number, end: number): boolean {
  return f.span.start < end && f.span.end > start;
}

function jargonTextsOverlapping(findings: readonly Finding[], start: number, end: number): Set<string> {
  const set = new Set<string>();
  for (const f of findings) {
    if (f.criterion === "jargon" && overlaps(f, start, end)) set.add(f.span.text);
  }
  return set;
}

/**
 * Aplica a proposta ao texto inteiro (substitui o trecho do finding) e devolve o texto
 * reescrito. Puro: não normaliza (o `analyze` normaliza de novo, idempotente).
 */
export function applyProposal(text: string, finding: Finding, proposal: RewriteProposal): string {
  return text.slice(0, finding.span.start) + proposal.proposed + text.slice(finding.span.end);
}

export async function verifyRewrite(
  text: string,
  finding: Finding,
  proposal: RewriteProposal,
  options: VerifyOptions = {},
): Promise<RewriteVerification> {
  const rewritten = applyProposal(text, finding, proposal);
  const before = analyze(text);
  const after = analyze(rewritten);

  const originalStart = finding.span.start;
  const originalEnd = finding.span.end;
  const newStart = finding.span.start;
  const newEnd = finding.span.start + proposal.proposed.length;

  // --- PROVA -------------------------------------------------------------------
  const targetRemaining = after.findings.filter(
    (f) => f.criterion === finding.criterion && overlaps(f, newStart, newEnd),
  ).length;
  const targetResolved: Proof = {
    check: "target_resolved",
    passed: targetRemaining === 0,
    detail:
      targetRemaining === 0
        ? `a violação de '${finding.criterion}' não reaparece no trecho reescrito`
        : `'${finding.criterion}' ainda é detectado ${targetRemaining}× no trecho reescrito`,
  };

  const noNewFindings: Proof = {
    check: "no_new_findings",
    passed: after.score.totalFindings <= before.score.totalFindings,
    detail: `total de findings: ${before.score.totalFindings} → ${after.score.totalFindings}`,
  };

  const numsBefore = extractSorted(proposal.original, RE_NUMBER);
  const numsAfter = extractSorted(proposal.proposed, RE_NUMBER);
  const numbersPreserved: Proof = {
    check: "numbers_preserved",
    passed: sameMultiset(numsBefore, numsAfter),
    detail: sameMultiset(numsBefore, numsAfter)
      ? "todos os números do trecho foram preservados"
      : `números diferem: [${numsBefore.join(", ")}] → [${numsAfter.join(", ")}]`,
  };

  const datesBefore = extractSorted(proposal.original, RE_DATE);
  const datesAfter = extractSorted(proposal.proposed, RE_DATE);
  const datesPreserved: Proof = {
    check: "dates_preserved",
    passed: sameMultiset(datesBefore, datesAfter),
    detail: sameMultiset(datesBefore, datesAfter)
      ? "todas as datas do trecho foram preservadas"
      : `datas diferem: [${datesBefore.join(", ")}] → [${datesAfter.join(", ")}]`,
  };

  const beforeSpanJargon = jargonTextsOverlapping(before.findings, originalStart, originalEnd);
  const afterRegionJargon = jargonTextsOverlapping(after.findings, newStart, newEnd);
  const introducedJargon = [...afterRegionJargon].filter((t) => !beforeSpanJargon.has(t));
  const noNewJargon: Proof = {
    check: "no_new_jargon",
    passed: introducedJargon.length === 0,
    detail:
      introducedJargon.length === 0
        ? "a proposta não introduziu jargão novo"
        : `jargão novo introduzido: ${introducedJargon.join(", ")}`,
  };

  const proofs = [targetResolved, noNewFindings, numbersPreserved, datesPreserved, noNewJargon];

  // --- SINAL (heurístico, nunca prova) ----------------------------------------
  const signals: VerificationSignal[] = [];

  const entitiesBefore = extractSorted(proposal.original, RE_ENTITY);
  const entitiesAfter = new Set(proposal.proposed.match(RE_ENTITY) ?? []);
  const missingEntities = entitiesBefore.filter((e) => !entitiesAfter.has(e));
  signals.push({
    check: "entities_preserved",
    flagged: missingEntities.length > 0,
    detail:
      missingEntities.length > 0
        ? `nome(s) possivelmente ausentes na proposta — confira: ${[...new Set(missingEntities)].join(", ")}`
        : "sem sinal de nome próprio perdido (heurística, não prova)",
  });

  if (options.probe && options.question) {
    const [originalResult, proposedResult] = await Promise.all([
      options.probe.probe({ trecho: proposal.original, pergunta: options.question }),
      options.probe.probe({ trecho: proposal.proposed, pergunta: options.question }),
    ]);
    // interpret garante que a sonda nunca "aprova"; aqui usamos só como teste NEGATIVO.
    const originalReadable = originalResult.podeResponder && !originalResult.precisouInferir;
    const proposedReadable = proposedResult.podeResponder && !proposedResult.precisouInferir;
    const lost = originalReadable && !proposedReadable;
    const proposedSignal = interpret(proposedResult);
    signals.push({
      check: "meaning_preserved",
      flagged: lost,
      detail: lost
        ? "o leitor de piso extraía o fato do original mas trava na proposta — possível perda de informação"
        : proposedSignal.tipo === "flag"
          ? "a proposta trava o leitor de piso, mas o original também travava — sem conclusão de perda"
          : "sem sinal de perda de sentido pelo piso (não é garantia de compreensão)",
    });
  }

  const metrics: MetricsDelta = {
    fleschPtBefore: before.metrics.fleschPt,
    fleschPtAfter: after.metrics.fleschPt,
    wordsBefore: before.metrics.words,
    wordsAfter: after.metrics.words,
  };

  return {
    proofs,
    signals,
    metrics,
    hasBlockingFailure: proofs.some((p) => !p.passed),
  };
}
