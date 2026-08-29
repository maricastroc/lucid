import { analyze, type Finding } from "@/lucid";
import { applyProposal } from "@/report/rewrite";
import type { ScoredRow } from "./score";

export type VetoClass =
  "alvo-nao-resolvido-marginal" | "alvo-nao-resolvido-substancial" | "achado-novo" | "fidelidade" | "sem-veto";

const MARGIN = 5;

const FIDELITY_PROOFS = new Set([
  "numbers_preserved",
  "dates_preserved",
  "no_new_jargon",
  "no_invented_first_person",
  "declared_agent_present",
]);

export interface SurvivingSentence {
  readonly words: number | null;
  readonly threshold: number | null;
  readonly text: string;
}

export interface VetoDetail {
  readonly target: string;
  readonly candidate: string;
  readonly vetoed: boolean;
  readonly klass: VetoClass;
  readonly failedProofs: readonly string[];
  readonly details: readonly string[];
  readonly surviving: readonly SurvivingSentence[];
  readonly introduced: readonly string[];
  readonly original: string;
  readonly proposed: string;
}

const flat = (s: string): string => s.replace(/\s+/gu, " ").trim();
const metaNum = (f: Finding, key: string): number | null => {
  const value = (f.meta as Record<string, unknown> | undefined)?.[key];
  return typeof value === "number" ? value : null;
};

export function vetoDetail(scored: ScoredRow): VetoDetail {
  const { row, target } = scored;
  const proposal = { proposerId: row.candidate, original: row.original, proposed: row.proposed };
  const rewritten = applyProposal(target.text, target.span, proposal);
  const newEnd = target.span.start + row.proposed.length;
  const after = analyze(rewritten).findings.filter((f) => f.span.start < newEnd && f.span.end > target.span.start);

  const before = new Set(
    analyze(target.text)
      .findings.filter((f) => f.span.start < target.span.end && f.span.end > target.span.start)
      .map((f) => f.criterion),
  );

  const surviving = after
    .filter((f) => f.criterion === target.primaryCriterion)
    .map((f) => ({ words: metaNum(f, "words"), threshold: metaNum(f, "threshold"), text: flat(f.span.text) }));

  const introduced = after.filter((f) => !before.has(f.criterion)).map((f) => `${f.criterion}: «${flat(f.span.text)}»`);

  const failed = scored.failedProofs;
  let klass: VetoClass = "sem-veto";
  if (scored.vetoed) {
    if (failed.some((p) => FIDELITY_PROOFS.has(p))) klass = "fidelidade";
    else if (failed.includes("no_new_findings") || failed.includes("region_improved")) klass = "achado-novo";
    else {
      const worst = surviving.reduce(
        (n, s) => (s.words !== null && s.threshold !== null ? Math.max(n, s.words - s.threshold) : n),
        0,
      );
      klass = worst <= MARGIN ? "alvo-nao-resolvido-marginal" : "alvo-nao-resolvido-substancial";
    }
  }

  return {
    target: row.targetId,
    candidate: row.candidate,
    vetoed: scored.vetoed,
    klass,
    failedProofs: failed,
    details: scored.verification.proofs.filter((p) => !p.passed).map((p) => `[${p.check}] ${p.detail}`),
    surviving,
    introduced,
    original: row.original,
    proposed: row.proposed,
  };
}

export function renderVetoAnatomy(details: readonly VetoDetail[]): string {
  const out: string[] = [];
  const byCandidate = new Map<string, VetoDetail[]>();
  for (const d of details) {
    const bucket = byCandidate.get(d.candidate) ?? [];
    bucket.push(d);
    byCandidate.set(d.candidate, bucket);
  }

  out.push("## O que o veto% mede");
  out.push("");
  out.push("`veto = hasBlockingFailure = pelo menos uma das 7 provas reprovou`. É um E lógico:");
  out.push("basta uma prova falhar para a proposta não ser aprovada. O número não distingue uma");
  out.push("frase de 21 palavras contra um limiar de 20 de uma reescrita que inventou agente — a");
  out.push("tabela abaixo distingue. **Nenhum veto vira não-veto aqui**: a engine continua se");
  out.push("recusando a aprovar; o que muda é saber o que ela recusou.");
  out.push("");
  out.push(
    "| Candidato | n | vetos | alvo aberto (marginal ≤5 palavras) | alvo aberto (substancial) | achado novo | fidelidade |",
  );
  out.push("|---|--:|--:|--:|--:|--:|--:|");
  for (const [candidate, group] of [...byCandidate.entries()].sort()) {
    const count = (k: VetoClass): number => group.filter((d) => d.klass === k).length;
    out.push(
      `| ${candidate} | ${group.length} | ${group.filter((d) => d.vetoed).length} | ${count(
        "alvo-nao-resolvido-marginal",
      )} | ${count("alvo-nao-resolvido-substancial")} | ${count("achado-novo")} | ${count("fidelidade")} |`,
    );
  }

  for (const [candidate, group] of [...byCandidate.entries()].sort()) {
    out.push("");
    out.push(`### ${candidate} — cada alvo vetado`);
    const vetoed = group.filter((d) => d.vetoed).sort((a, b) => a.target.localeCompare(b.target));
    if (vetoed.length === 0) out.push("\nNenhum.");
    for (const d of vetoed) {
      out.push("");
      out.push(`**${d.target}** · ${d.klass}`);
      for (const line of d.details) out.push(`- ${line}`);
      for (const s of d.surviving) {
        out.push(`  - frase que ainda dispara — **${s.words} palavras** (limiar ${s.threshold}): «${s.text}»`);
      }
      for (const i of d.introduced) out.push(`  - introduzido: ${i}`);
      if (d.failedProofs.some((p) => FIDELITY_PROOFS.has(p))) {
        out.push(`  - original: «${flat(d.original)}»`);
        out.push(`  - proposta: «${flat(d.proposed)}»`);
      }
    }
  }
  return out.join("\n");
}
