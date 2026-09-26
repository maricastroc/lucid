import type { Span } from "@/lucid";
import { verifyRewrite } from "@/report/rewrite";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";
import { interpret } from "@/lucid/probe/interpret";
import { scoreRow } from "../rewrite-ab/score";
import type { RunRow } from "../rewrite-ab/runner";
import { GOLDEN_SONDA } from "../probe-golden";
import { buildPlan, type RewriteJob } from "../baseline/plan";
import { latestByKey, loadCalls, type CallRow } from "../baseline/run";

export type Checks = Readonly<Record<string, boolean>>;

export interface Arm {
  readonly label: string;
  readonly runs: readonly number[];
  readonly items: ReadonlyMap<string, ReadonlyMap<number, Checks>>;
}

export type Classification =
  "regressao" | "regressao_fraca" | "melhora" | "melhora_fraca" | "preexistente" | "igual" | "incompleto";

export const HARD_CHECKS: readonly string[] = [
  "contract.ok",
  "contract.stop",
  "contract.parse",
  "proof.numbers_kept",
  "proof.numbers_added",
  "proof.dates_kept",
  "proof.dates_added",
  "proof.no_invented_first_person",
  "fid.refs",
  "fid.values",
  "style.paragraphs",
  "style.markup",
  "struct.not_refused",
  "struct.docx",
];

const LABEL = /^\s*(Art\.\s*\d+[ºo°]?(?:-[A-Z])?|§\s*\d+[ºo°]?|Parágrafo único\.?|[IVXLC]+\s*[-–]|[a-z]\))/u;
const SAYS_NOTHING = /o texto não diz/iu;

const collapse = (text: string): string => text.replace(/\s+/gu, " ").trim().toLowerCase();

const squash = (text: string): string => text.replace(/\s+/gu, " ").trim();

export function labelKept(original: string, proposed: string): boolean | undefined {
  const label = LABEL.exec(original)?.[1];
  return label === undefined ? undefined : squash(proposed).startsWith(squash(label));
}

export const itemKey = (suite: string, itemId: string): string => `${suite}|${itemId}`;

function jobsByItem(): Map<string, RewriteJob> {
  const out = new Map<string, RewriteJob>();
  for (const job of buildPlan().jobs) {
    if (job.suite === "probe") continue;
    const key = itemKey(job.suite, job.target.id);
    if (!out.has(key)) out.set(key, job);
  }
  return out;
}

function compatRow(row: CallRow): RunRow {
  return {
    key: row.key,
    at: row.at,
    candidate: `${row.promptVersion} · r${row.run}`,
    model: row.model,
    context: "full",
    targetId: row.itemId,
    document: row.document ?? "",
    start: row.span?.start ?? 0,
    end: row.span?.end ?? 0,
    original: row.original ?? "",
    proposed: row.proposed ?? row.original ?? "",
    parseOutcome: row.parseOutcome === "unparseable" ? "unparseable" : "ok",
    promptChars: row.promptChars,
    contextChars: 0,
    promptTokens: row.usage?.prompt ?? 0,
    completionTokens: row.usage?.candidates ?? 0,
    totalTokens: row.usage?.total ?? 0,
    truncated: row.finishReason === "MAX_TOKENS",
    latencyMs: row.latencyMs,
    error: null,
    raw: row.raw ?? "",
  };
}

async function rewriteChecks(row: CallRow, job: RewriteJob): Promise<Checks> {
  const out: Record<string, boolean> = {
    "contract.ok": row.outcome === "ok",
    "contract.stop": row.finishReason === "STOP",
    "contract.parse": row.parseOutcome === "ok",
  };
  if (row.outcome !== "ok" || row.proposed === null || row.original === null) return out;

  const target = job.target;
  const focus: Span = {
    start: job.focus.span.start,
    end: job.focus.span.end,
    text: target.text.slice(job.focus.span.start, job.focus.span.end),
  };
  const verification = await verifyRewrite(
    target.text,
    target.span,
    { proposerId: row.stampedId, original: row.original, proposed: row.proposed, localeId: rewriteLocalePtBR.id },
    {
      locale: rewriteLocalePtBR,
      criterion: job.criterion,
      focus,
      findings: job.findings,
      declarations: job.declarations,
    },
  );
  for (const proof of verification.proofs) out[`proof.${proof.check}`] = proof.passed;
  const targetProof = verification.proofs.find((p) => p.check === "target_resolved");
  if (targetProof) {
    const bucket = job.criterion === "long_sentence" ? "long_sentence" : "outros";
    out[`proof.target_resolved[${bucket}]`] = targetProof.passed;
  }
  for (const signal of verification.signals) out[`signal.${signal.check}`] = !signal.flagged;
  out["verdict.sem_veto"] = !verification.hasBlockingFailure;
  out["verdict.sem_veto_exceto_comprimento"] = !verification.proofs.some(
    (p) => !p.passed && !(p.check === "target_resolved" && job.criterion === "long_sentence"),
  );

  const scored = await scoreRow(compatRow(row), target);
  out["fid.refs"] = scored.fidelity.legalRefsLost.length === 0;
  out["fid.values"] = scored.fidelity.valuesLost.length === 0;
  out["fid.relations"] = scored.fidelity.relationsLost.length === 0;
  for (const family of ["obrigacao", "permissao", "proibicao", "condicao", "excecao", "negacao"]) {
    out[`fid.marker.${family}`] = !scored.fidelity.markerFamiliesLost.includes(family);
  }
  out["style.paragraphs"] = !scored.style.paragraphsLost;
  out["style.markup"] = !scored.style.markupLeaked;
  out["style.list_rule"] = !scored.style.producedList || target.criteria.includes("prose_enumeration");
  out["style.not_inflated"] = !scored.style.inflated;
  out["struct.not_refused"] = scored.structure.kind !== "refused";
  out["struct.docx"] = !(scored.structure.kind === "expanded" && scored.structure.docxSurvives === false);
  out["region.no_new_criteria"] = scored.newCriteriaInRegion.length === 0;
  out["region.no_new_passive"] = !scored.newCriteriaInRegion.includes("passive_voice");

  const kept = labelKept(row.original, row.proposed);
  if (kept !== undefined) out["label.kept"] = kept;
  if (job.suite === "directed")
    out["directed.kept_passive_verbatim"] = collapse(row.proposed).includes(collapse(focus.text));
  return out;
}

function probeChecks(row: CallRow): Checks {
  const out: Record<string, boolean> = {
    "contract.ok": row.outcome === "ok",
    "contract.stop": row.finishReason === "STOP",
    "contract.parse": row.parseOutcome === "ok",
  };
  const probeCase = GOLDEN_SONDA.find((c) => c.id === row.itemId);
  if (row.outcome !== "ok" || row.probeResult === null || !probeCase) return out;
  const flag = interpret(row.probeResult).tipo === "flag";
  out["probe.agrees"] = flag === probeCase.humanoTrava;
  out["probe.no_contradiction"] = !(
    row.probeResult.podeResponder && SAYS_NOTHING.test(row.probeResult.respostaExtraida)
  );
  return out;
}

export async function scoreArm(label: string, callsFile: string, runs: readonly number[]): Promise<Arm> {
  const jobs = jobsByItem();
  const items = new Map<string, Map<number, Checks>>();
  for (const row of latestByKey(loadCalls(callsFile)).values()) {
    if (!runs.includes(row.run)) continue;
    const key = itemKey(row.suite, row.itemId);
    let checks: Checks;
    if (row.suite === "probe") checks = probeChecks(row);
    else {
      const job = jobs.get(key);
      if (!job) continue;
      checks = await rewriteChecks(row, job);
    }
    const byRun = items.get(key) ?? new Map<number, Checks>();
    byRun.set(row.run, checks);
    items.set(key, byRun);
  }
  return { label, runs, items };
}

export function restrict(arm: Arm, runs: readonly number[], label: string): Arm {
  const items = new Map<string, Map<number, Checks>>();
  for (const [key, byRun] of arm.items) {
    items.set(key, new Map([...byRun].filter(([run]) => runs.includes(run))));
  }
  return { label, runs, items };
}

interface Tally {
  readonly runs: number;
  readonly passes: number;
}

function tallyOf(arm: Arm, item: string, check: string): Tally | null {
  const byRun = arm.items.get(item);
  if (!byRun) return null;
  let runs = 0;
  let passes = 0;
  for (const run of arm.runs) {
    const value = byRun.get(run)?.[check];
    if (value === undefined) continue;
    runs++;
    if (value) passes++;
  }
  return runs === arm.runs.length ? { runs, passes } : null;
}

export function classify(base: Tally | null, candidate: Tally | null): Classification {
  if (base === null || candidate === null) return "incompleto";
  const basePass = base.passes * 2 > base.runs;
  const candidatePass = candidate.passes * 2 > candidate.runs;
  const baseUnanimous = base.passes === 0 || base.passes === base.runs;
  if (basePass && !candidatePass) return baseUnanimous ? "regressao" : "regressao_fraca";
  if (!basePass && candidatePass) return baseUnanimous ? "melhora" : "melhora_fraca";
  if (!basePass && !candidatePass) return "preexistente";
  return "igual";
}

export interface CheckComparison {
  readonly suite: string;
  readonly check: string;
  readonly hard: boolean;
  readonly counts: Readonly<Record<Classification, number>>;
  readonly regressions: readonly string[];
  readonly weakRegressions: readonly string[];
  readonly improvements: readonly string[];
  readonly basePerRun: readonly number[];
  readonly candidatePerRun: readonly number[];
  readonly items: number;
}

export interface Comparison {
  readonly base: string;
  readonly candidate: string;
  readonly checks: readonly CheckComparison[];
  readonly flips: { readonly base: FlipRate; readonly candidate: FlipRate };
}

export interface FlipRate {
  readonly items: number;
  readonly unstable: number;
  readonly rate: number;
  readonly unstableItems: readonly string[];
}

export function flipRate(arm: Arm, suite: string, check = "verdict.sem_veto"): FlipRate {
  const unstable: string[] = [];
  let items = 0;
  for (const key of arm.items.keys()) {
    if (!key.startsWith(`${suite}|`)) continue;
    const t = tallyOf(arm, key, check);
    if (t === null) continue;
    items++;
    if (t.passes !== 0 && t.passes !== t.runs) unstable.push(key.slice(suite.length + 1));
  }
  return { items, unstable: unstable.length, rate: items === 0 ? 0 : unstable.length / items, unstableItems: unstable };
}

function perRunPasses(arm: Arm, suite: string, check: string): number[] {
  return arm.runs.map((run) => {
    let passes = 0;
    for (const [key, byRun] of arm.items) {
      if (key.startsWith(`${suite}|`) && byRun.get(run)?.[check] === true) passes++;
    }
    return passes;
  });
}

export function compareArms(base: Arm, candidate: Arm): Comparison {
  const checks: CheckComparison[] = [];
  for (const suite of ["rewrite", "directed", "probe"]) {
    const keys = [...new Set([...base.items.keys(), ...candidate.items.keys()])].filter((k) =>
      k.startsWith(`${suite}|`),
    );
    const names = new Set<string>();
    for (const arm of [base, candidate]) {
      for (const key of keys)
        for (const checksOfRun of arm.items.get(key)?.values() ?? [])
          Object.keys(checksOfRun).forEach((n) => names.add(n));
    }
    for (const check of [...names].sort()) {
      const counts: Record<Classification, number> = {
        regressao: 0,
        regressao_fraca: 0,
        melhora: 0,
        melhora_fraca: 0,
        preexistente: 0,
        igual: 0,
        incompleto: 0,
      };
      const regressions: string[] = [];
      const weakRegressions: string[] = [];
      const improvements: string[] = [];
      let items = 0;
      for (const key of keys) {
        const b = tallyOf(base, key, check);
        const c = tallyOf(candidate, key, check);
        if (b === null && c === null) continue;
        items++;
        const cls = classify(b, c);
        counts[cls]++;
        const id = key.slice(suite.length + 1);
        if (cls === "regressao") regressions.push(id);
        if (cls === "regressao_fraca") weakRegressions.push(id);
        if (cls === "melhora" || cls === "melhora_fraca") improvements.push(id);
      }
      checks.push({
        suite,
        check,
        hard: suite !== "probe" && HARD_CHECKS.includes(check),
        counts,
        regressions,
        weakRegressions,
        improvements,
        basePerRun: perRunPasses(base, suite, check),
        candidatePerRun: perRunPasses(candidate, suite, check),
        items,
      });
    }
  }
  return {
    base: base.label,
    candidate: candidate.label,
    checks,
    flips: { base: flipRate(base, "rewrite"), candidate: flipRate(candidate, "rewrite") },
  };
}

export function renderComparison(c: Comparison): string {
  const out: string[] = [];
  out.push(`# ${c.base} × ${c.candidate}`);
  out.push("");
  out.push(
    "Maioria 2/3 em cada braço quando há 3 rodadas; com uma rodada por braço, a maioria é a própria rodada. " +
      "Colunas por rodada: itens em que a verificação passou em cada rodada, na ordem das rodadas.",
  );
  out.push("");
  out.push(
    `Viradas de veredito em rewrite: ${c.base} ${c.flips.base.unstable}/${c.flips.base.items} ` +
      `(${(100 * c.flips.base.rate).toFixed(1)}%) · ${c.candidate} ${c.flips.candidate.unstable}/${c.flips.candidate.items} ` +
      `(${(100 * c.flips.candidate.rate).toFixed(1)}%). Acima de 5%: investigação obrigatória, não reprovação.`,
  );
  out.push("");
  for (const suite of ["rewrite", "directed", "probe"]) {
    const rows = c.checks.filter((k) => k.suite === suite);
    if (rows.length === 0) continue;
    out.push(`## ${suite}`);
    out.push("");
    out.push(
      `| verificação | obrig. | itens | ${c.base} por rodada | ${c.candidate} por rodada | regressão | reg. fraca | melhora | preexistente | igual | incompleto |`,
    );
    out.push("|---|:-:|--:|---|---|--:|--:|--:|--:|--:|--:|");
    for (const r of rows) {
      out.push(
        `| ${r.check} | ${r.hard ? "sim" : ""} | ${r.items} | ${r.basePerRun.join(" / ")} | ${r.candidatePerRun.join(" / ")} | ${
          r.counts.regressao
        } | ${r.counts.regressao_fraca} | ${r.counts.melhora + r.counts.melhora_fraca} | ${r.counts.preexistente} | ${r.counts.igual} | ${
          r.counts.incompleto
        } |`,
      );
    }
    out.push("");
    const flagged = rows.filter((r) => r.regressions.length + r.weakRegressions.length > 0);
    for (const r of flagged) {
      out.push(
        `- **${r.check}** — regressões: ${r.regressions.join(", ") || "—"} · fracas: ${r.weakRegressions.join(", ") || "—"}`,
      );
    }
    if (flagged.length > 0) out.push("");
  }
  const hardFailures = c.checks.filter((k) => k.hard && k.regressions.length > 0);
  out.push("## Barreiras obrigatórias");
  out.push("");
  out.push(
    hardFailures.length === 0
      ? "Nenhuma regressão forte nas verificações obrigatórias."
      : `Regressões fortes em verificações obrigatórias: ${hardFailures.map((k) => `${k.suite}/${k.check} (${k.regressions.length})`).join(", ")}.`,
  );
  return `${out.join("\n")}\n`;
}
