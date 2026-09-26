import fs from "node:fs";
import path from "node:path";
import type { Span } from "@/lucid";
import { verifyRewrite, type RewriteVerification } from "@/report/rewrite";
import { rewriteLocalePtBR } from "@/locales/pt-BR/tier3";
import { interpret } from "@/lucid/probe/interpret";
import { aggregate, renderTables } from "../rewrite-ab/report";
import type { RunRow } from "../rewrite-ab/runner";
import { scoreRow, type ScoredRow } from "../rewrite-ab/score";
import type { EvalTarget } from "../rewrite-ab/targets";
import { GOLDEN_SONDA, type ProbeGoldenCase } from "../probe-golden";
import { RUNS, type buildPlan, type RewriteJob } from "./plan";
import { latestByKey, loadCalls, type CallRow } from "./run";

type Plan = ReturnType<typeof buildPlan>;

const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (part: number, whole: number): number => (whole === 0 ? 0 : (100 * part) / whole);
const quantile = (xs: readonly number[], q: number): number => {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const tally = (values: readonly string[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
};
const fmtTally = (t: Record<string, number>): string =>
  Object.keys(t).length === 0
    ? "—"
    : Object.entries(t)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
const f1 = (x: number): string => x.toFixed(1);
const f0 = (x: number): string => x.toFixed(0);

interface VerifiedCall {
  readonly row: CallRow;
  readonly target: EvalTarget;
  readonly production: RewriteVerification;
  readonly ab: ScoredRow;
}

const vetoed = (v: RewriteVerification): boolean => v.proofs.some((p) => !p.passed);

function spanOf(target: EvalTarget, range: { start: number; end: number }): Span {
  return { start: range.start, end: range.end, text: target.text.slice(range.start, range.end) };
}

function compatRow(row: CallRow, label: string): RunRow {
  return {
    key: row.key,
    at: row.at,
    candidate: label,
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

async function verifyCalls(rows: readonly CallRow[], plan: Plan): Promise<VerifiedCall[]> {
  const jobs = new Map(plan.jobs.filter((j): j is RewriteJob => j.suite !== "probe").map((j) => [j.key, j]));
  const out: VerifiedCall[] = [];
  for (const row of rows) {
    const job = jobs.get(row.key);
    if (!job || row.outcome !== "ok" || row.proposed === null || row.original === null) continue;
    const target = job.target;
    const proposal = {
      proposerId: row.stampedId,
      original: row.original,
      proposed: row.proposed,
      localeId: rewriteLocalePtBR.id,
      parseOutcome: row.parseOutcome ?? undefined,
    };
    const production = await verifyRewrite(target.text, target.span, proposal, {
      locale: rewriteLocalePtBR,
      criterion: job.criterion,
      focus: spanOf(target, job.focus.span),
      findings: job.findings,
      declarations: job.declarations,
    });
    const ab = await scoreRow(compatRow(row, `${row.promptVersion} · r${row.run}`), target);
    out.push({ row, target, production, ab });
  }
  return out;
}

function operationalLines(rows: readonly CallRow[]): string[] {
  const attempts = rows.flatMap((r) => r.attempts);
  const lines: string[] = [];
  lines.push(
    `| n | ok | erros | tentativas | tentativas com HTTP≠200 | finishReason | truncados (MAX_TOKENS) | ilegíveis |`,
  );
  lines.push(`|--:|--:|--:|--:|--:|---|--:|--:|`);
  lines.push(
    `| ${rows.length} | ${rows.filter((r) => r.outcome === "ok").length} | ${rows.filter((r) => r.outcome === "error").length} | ${attempts.length} | ${
      attempts.filter((a) => a.status !== 200).length
    } | ${fmtTally(tally(rows.map((r) => r.finishReason ?? "(nenhum)")))} | ${
      rows.filter((r) => r.finishReason === "MAX_TOKENS").length
    } | ${rows.filter((r) => r.parseOutcome === "unparseable").length} |`,
  );
  lines.push("");
  const ok = rows.filter((r) => r.outcome === "ok");
  lines.push(
    `| tokens de entrada (méd.) | tokens de saída (méd. / máx.) | tokens de raciocínio (soma) | latência méd. / p50 / p95 / máx. (ms) | custo (US$) |`,
  );
  lines.push(`|--:|--:|--:|--:|--:|`);
  lines.push(
    `| ${f0(mean(ok.map((r) => r.usage?.prompt ?? 0)))} | ${f0(mean(ok.map((r) => r.usage?.candidates ?? 0)))} / ${Math.max(
      0,
      ...ok.map((r) => r.usage?.candidates ?? 0),
    )} | ${ok.reduce((n, r) => n + (r.usage?.thoughts ?? 0), 0)} | ${f0(mean(ok.map((r) => r.latencyMs)))} / ${f0(
      quantile(
        ok.map((r) => r.latencyMs),
        0.5,
      ),
    )} / ${f0(
      quantile(
        ok.map((r) => r.latencyMs),
        0.95,
      ),
    )} / ${Math.max(0, ...ok.map((r) => r.latencyMs))} | ${rows.reduce((n, r) => n + r.costUsd, 0).toFixed(4)} |`,
  );
  return lines;
}

function productionTable(label: string, calls: readonly VerifiedCall[]): string[] {
  const n = calls.length;
  const proofsPassed = calls.map((c) => c.production.proofs.filter((p) => p.passed).length);
  const proofsTotal = calls.map((c) => c.production.proofs.length);
  const vetoCount = calls.filter((c) => vetoed(c.production)).length;
  const changed = calls.filter((c) => c.row.proposed !== c.row.original).length;
  return [
    `| ${label} | ${n} | ${f0(pct(changed, n))} | ${f1(mean(proofsPassed))}/${f1(mean(proofsTotal))} | ${f0(pct(vetoCount, n))} | ${fmtTally(
      tally(calls.flatMap((c) => c.production.proofs.filter((p) => !p.passed).map((p) => p.check))),
    )} | ${fmtTally(tally(calls.flatMap((c) => c.production.signals.filter((s) => s.flagged).map((s) => s.check))))} | ${
      calls.filter((c) => c.production.notices.length > 0).length
    } |`,
  ];
}

interface PairStability {
  readonly a: number;
  readonly b: number;
  readonly pairs: number;
  readonly identicalText: number;
  readonly sameVeto: number;
  readonly sameFailedProofs: number;
  readonly jaccardMean: number;
}

interface Stability {
  readonly pairwise: readonly PairStability[];
  readonly items: number;
  readonly allIdentical: number;
  readonly unanimousVeto: number;
  readonly unanimousFailedProofs: number;
  readonly majorityVetoed: number;
  readonly flips: { itemId: string; verdicts: string[] }[];
}

const tokensOf = (text: string): Set<string> => new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
function jaccard(a: string, b: string): number {
  const x = tokensOf(a);
  const y = tokensOf(b);
  const inter = [...x].filter((t) => y.has(t)).length;
  const union = new Set([...x, ...y]).size;
  return union === 0 ? 1 : inter / union;
}

function stabilityOf(calls: readonly VerifiedCall[]): Stability {
  const byItem = new Map<string, Map<number, VerifiedCall>>();
  for (const c of calls) {
    const m = byItem.get(c.row.itemId) ?? new Map<number, VerifiedCall>();
    m.set(c.row.run, c);
    byItem.set(c.row.itemId, m);
  }
  const verdict = (c: VerifiedCall): string =>
    vetoed(c.production)
      ? `veto(${c.production.proofs
          .filter((p) => !p.passed)
          .map((p) => p.check)
          .join("+")})`
      : "sem veto";
  const failedSet = (c: VerifiedCall): string =>
    c.production.proofs
      .filter((p) => !p.passed)
      .map((p) => p.check)
      .sort()
      .join("+");

  const pairwise: PairStability[] = [];
  for (let i = 0; i < RUNS.length; i++) {
    for (let j = i + 1; j < RUNS.length; j++) {
      const [a, b] = [RUNS[i], RUNS[j]];
      const both = [...byItem.values()].filter((m) => m.has(a) && m.has(b)).map((m) => [m.get(a)!, m.get(b)!] as const);
      pairwise.push({
        a,
        b,
        pairs: both.length,
        identicalText: both.filter(([x, y]) => x.row.proposed === y.row.proposed).length,
        sameVeto: both.filter(([x, y]) => vetoed(x.production) === vetoed(y.production)).length,
        sameFailedProofs: both.filter(([x, y]) => failedSet(x) === failedSet(y)).length,
        jaccardMean: mean(both.map(([x, y]) => jaccard(x.row.proposed ?? "", y.row.proposed ?? ""))),
      });
    }
  }

  const complete = [...byItem.entries()].filter(([, m]) => RUNS.every((run) => m.has(run)));
  const runsOf = (m: Map<number, VerifiedCall>): VerifiedCall[] => RUNS.map((run) => m.get(run)!);
  const flips = complete
    .filter(([, m]) => new Set(runsOf(m).map((c) => vetoed(c.production))).size > 1)
    .map(([itemId, m]) => ({ itemId, verdicts: runsOf(m).map(verdict) }));
  return {
    pairwise,
    items: complete.length,
    allIdentical: complete.filter(([, m]) => new Set(runsOf(m).map((c) => c.row.proposed)).size === 1).length,
    unanimousVeto: complete.length - flips.length,
    unanimousFailedProofs: complete.filter(([, m]) => new Set(runsOf(m).map(failedSet)).size === 1).length,
    majorityVetoed: complete.filter(([, m]) => runsOf(m).filter((c) => vetoed(c.production)).length * 2 > RUNS.length)
      .length,
    flips,
  };
}

interface ProbeRow {
  readonly row: CallRow;
  readonly probeCase: ProbeGoldenCase;
  readonly flag: boolean;
  readonly contradiction: boolean;
}

const SAYS_NOTHING = /o texto não diz/iu;

function probeRows(rows: readonly CallRow[]): ProbeRow[] {
  const cases = new Map(GOLDEN_SONDA.map((c) => [c.id, c]));
  return rows
    .filter((r) => r.suite === "probe" && r.outcome === "ok" && r.probeResult !== null)
    .map((row) => {
      const result = row.probeResult!;
      return {
        row,
        probeCase: cases.get(row.itemId)!,
        flag: interpret(result).tipo === "flag",
        contradiction: result.podeResponder && SAYS_NOTHING.test(result.respostaExtraida),
      };
    });
}

function matrix(rows: readonly ProbeRow[]) {
  const tp = rows.filter((r) => r.probeCase.humanoTrava && r.flag).length;
  const fn = rows.filter((r) => r.probeCase.humanoTrava && !r.flag).length;
  const fp = rows.filter((r) => !r.probeCase.humanoTrava && r.flag).length;
  const tn = rows.filter((r) => !r.probeCase.humanoTrava && !r.flag).length;
  return {
    n: rows.length,
    tp,
    fn,
    fp,
    tn,
    recall: tp + fn === 0 ? null : tp / (tp + fn),
    precision: tp + fp === 0 ? null : tp / (tp + fp),
    accuracy: rows.length === 0 ? null : (tp + tn) / rows.length,
  };
}

export async function writeReport(
  outDir: string,
  callsFile: string,
  stampFile: string,
  plan: Plan,
  log: (message: string) => void,
): Promise<void> {
  const all = loadCalls(callsFile);
  const latest = [...latestByKey(all).values()];
  const stamp = JSON.parse(fs.readFileSync(stampFile, "utf8")) as Record<string, unknown>;

  const bySuite = (suite: CallRow["suite"]) => latest.filter((r) => r.suite === suite);
  const verifiedRewrite = await verifyCalls(bySuite("rewrite"), plan);
  const verifiedDirected = await verifyCalls(bySuite("directed"), plan);
  const probes = probeRows(latest);

  const md: string[] = [];
  md.push(`# Baseline · ${stamp.model} · ${(stamp.promptVersions as Record<string, string>).rewrite}`);
  md.push("");
  md.push(
    `Commit \`${stamp.commit}\` (${stamp.branch}) · régua ${JSON.stringify(stamp.ruler)} · criado em ${stamp.createdAt}.`,
  );
  md.push(
    "Fotografia do sistema como está, para comparar sucessores. **Nada aqui é aprovação**: veto% é a " +
      "taxa de propostas barradas pelo verificador determinístico, e ausência de veto não é qualidade.",
  );
  md.push("");
  md.push("## Operação e custo (todas as linhas gravadas, inclusive erros e repetições)");
  md.push("");
  md.push(
    `Linhas gravadas em calls.jsonl: ${all.length} · chaves distintas: ${latest.length} · custo total US$ ${all
      .reduce((n, r) => n + r.costUsd, 0)
      .toFixed(4)}`,
  );
  md.push("");
  for (const suite of ["rewrite", "directed", "probe"] as const) {
    for (const run of RUNS) {
      const rows = all.filter((r) => r.suite === suite && r.run === run);
      if (rows.length === 0) continue;
      md.push(`**${suite} · rodada ${run}**`);
      md.push("");
      md.push(...operationalLines(rows));
      md.push("");
    }
  }
  md.push(
    `generationConfig distintos observados: ${[
      ...new Set(all.map((r) => `${r.suite}: ${JSON.stringify(r.generationConfig)}`)),
    ].join(" · ")}`,
  );
  md.push("");
  md.push(`modelVersion observados: ${fmtTally(tally(all.map((r) => r.modelVersion ?? "(nenhum)")))}`);
  md.push("");

  md.push("## Veredito com as opções exatas de produção");
  md.push("");
  md.push(
    "`rewrite`: `criterion` e `focus` do primeiro achado, sem `findings`, como `generateRewrite` faz sem declaração. " +
      "`directed`: `findings` = achados do parágrafo, `declarations` = manter impessoal no ponto em foco.",
  );
  md.push("");
  md.push(
    "| Sistema | n | reescreveu% | provas OK (méd.) | veto% | provas reprovadas | sinais levantados | com aviso ao autor |",
  );
  md.push("|---|--:|--:|--:|--:|---|---|--:|");
  for (const [suite, calls] of [
    ["rewrite", verifiedRewrite],
    ["directed", verifiedDirected],
  ] as const) {
    for (const run of RUNS) {
      md.push(
        ...productionTable(
          `${suite} · r${run}`,
          calls.filter((c) => c.row.run === run),
        ),
      );
    }
  }
  md.push("");

  md.push("## Tabelas do A/B (mesma pontuação de test/eval/rewrite-ab, comparável ao relatorio.md)");
  md.push("");
  md.push(
    "Atenção: a verificação do A/B passa `findings` e não passa `focus`, então o veto daqui difere do veto de " +
      "produção acima. Fidelidade, estilo e estrutura não dependem disso.",
  );
  md.push("");
  md.push(renderTables(aggregate([...verifiedRewrite, ...verifiedDirected].map((c) => c.ab))));
  md.push("");

  md.push(`## Variação entre as rodadas (temperature 0, ${RUNS.length} rodadas)`);
  md.push("");
  md.push(
    "| Suíte | par | itens | texto idêntico | mesmo veto | mesmas provas reprovadas | Jaccard médio de palavras |",
  );
  md.push("|---|---|--:|--:|--:|--:|--:|");
  const stability = {
    rewrite: stabilityOf(verifiedRewrite),
    directed: stabilityOf(verifiedDirected),
  };
  for (const [suite, s] of Object.entries(stability)) {
    for (const p of s.pairwise) {
      md.push(
        `| ${suite} | r${p.a}×r${p.b} | ${p.pairs} | ${p.identicalText} (${f0(pct(p.identicalText, p.pairs))}%) | ${
          p.sameVeto
        } (${f0(pct(p.sameVeto, p.pairs))}%) | ${p.sameFailedProofs} (${f0(pct(p.sameFailedProofs, p.pairs))}%) | ${p.jaccardMean.toFixed(3)} |`,
      );
    }
  }
  md.push("");
  md.push(
    "| Suíte | itens | texto idêntico nas 3 | veredito unânime | provas reprovadas unânimes | vetado por maioria |",
  );
  md.push("|---|--:|--:|--:|--:|--:|");
  for (const [suite, s] of Object.entries(stability)) {
    md.push(
      `| ${suite} | ${s.items} | ${s.allIdentical} (${f0(pct(s.allIdentical, s.items))}%) | ${s.unanimousVeto} (${f0(
        pct(s.unanimousVeto, s.items),
      )}%) | ${s.unanimousFailedProofs} (${f0(pct(s.unanimousFailedProofs, s.items))}%) | ${s.majorityVetoed} (${f0(
        pct(s.majorityVetoed, s.items),
      )}%) |`,
    );
  }
  md.push("");
  for (const [suite, s] of Object.entries(stability)) {
    if (s.flips.length === 0) continue;
    md.push(`Itens sem veredito unânime (${suite}), veredito por rodada:`);
    for (const flip of s.flips) {
      md.push(`- \`${flip.itemId}\`: ${flip.verdicts.map((v, i) => `r${RUNS[i]} ${v}`).join(" · ")}`);
    }
    md.push("");
  }

  md.push("## Meta-eval da sonda (probe@1)");
  md.push("");
  md.push(
    "| Rodada | n | TP | FN | FP | TN | recall | precisão | acurácia | autocontradições | ilegíveis | truncados | erros |",
  );
  md.push("|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|");
  const probeSummary: Record<string, unknown> = {};
  for (const run of RUNS) {
    const rows = probes.filter((p) => p.row.run === run);
    const m = matrix(rows);
    const raw = all.filter((r) => r.suite === "probe" && r.run === run);
    const fmt = (x: number | null): string => (x === null ? "—" : x.toFixed(2));
    md.push(
      `| r${run} | ${m.n} | ${m.tp} | ${m.fn} | ${m.fp} | ${m.tn} | ${fmt(m.recall)} | ${fmt(m.precision)} | ${fmt(m.accuracy)} | ${
        rows.filter((p) => p.contradiction).length
      } | ${raw.filter((r) => r.parseOutcome === "unparseable").length} | ${
        raw.filter((r) => r.finishReason === "MAX_TOKENS").length
      } | ${raw.filter((r) => r.outcome === "error").length} |`,
    );
    probeSummary[`r${run}`] = {
      ...m,
      contradictions: rows.filter((p) => p.contradiction).map((p) => p.row.itemId),
      byCategory: Object.fromEntries(
        [...new Set(rows.map((p) => p.probeCase.categoria))].sort().map((cat) => {
          const sub = rows.filter((p) => p.probeCase.categoria === cat);
          return [cat, `${sub.filter((p) => p.flag === p.probeCase.humanoTrava).length}/${sub.length}`];
        }),
      ),
      misses: rows.filter((p) => p.flag !== p.probeCase.humanoTrava).map((p) => p.row.itemId),
    };
  }
  md.push("");
  const probeRuns = GOLDEN_SONDA.map((c) =>
    RUNS.map((run) => probes.find((p) => p.row.itemId === c.id && p.row.run === run)),
  ).filter((rs): rs is ProbeRow[] => rs.every((r) => r !== undefined));
  const sameFlag = probeRuns.filter((rs) => new Set(rs.map((r) => r.flag)).size === 1).length;
  const sameRaw = probeRuns.filter((rs) => new Set(rs.map((r) => r.row.raw)).size === 1).length;
  const majorityRows = probeRuns.map((rs) => ({
    ...rs[0],
    flag: rs.filter((r) => r.flag).length * 2 > rs.length,
  }));
  const majority = matrix(majorityRows);
  md.push(
    `Estabilidade: ${probeRuns.length} casos com as ${RUNS.length} rodadas · mesmo sinal (flag/neutro) em todas: ${sameFlag} · ` +
      `resposta idêntica em todas: ${sameRaw}. Maioria ${Math.ceil(RUNS.length / 2)}/${RUNS.length}: recall ${
        majority.recall?.toFixed(2) ?? "—"
      } · precisão ${majority.precision?.toFixed(2) ?? "—"} · acurácia ${majority.accuracy?.toFixed(2) ?? "—"}.`,
  );
  md.push("");
  for (const run of RUNS) {
    const s = probeSummary[`r${run}`] as {
      byCategory: Record<string, string>;
      misses: string[];
      contradictions: string[];
    };
    if (!s) continue;
    md.push(`r${run} por categoria (concordam/total): ${fmtTally(s.byCategory as unknown as Record<string, number>)}`);
    md.push(
      `r${run} discordâncias: ${s.misses.join(", ") || "—"} · autocontradições: ${s.contradictions.join(", ") || "—"}`,
    );
    md.push("");
  }

  md.push("## Casos para leitura humana");
  md.push("");
  md.push("Sinais heurísticos levantados, propostas ilegíveis e vereditos que viraram estão em `para-leitura.md`.");

  const reading: string[] = ["# Casos para leitura humana", ""];
  for (const c of [...verifiedRewrite, ...verifiedDirected]) {
    const flagged = c.production.signals.filter((s) => s.flagged);
    const unreadable = c.row.parseOutcome === "unparseable";
    if (flagged.length === 0 && !unreadable) continue;
    reading.push(`## ${c.row.suite} · r${c.row.run} · ${c.row.itemId}`);
    reading.push("");
    for (const s of flagged) reading.push(`- **${s.check}**: ${s.detail}`);
    if (unreadable) reading.push(`- **ilegível**: resposta crua ${JSON.stringify((c.row.raw ?? "").slice(0, 400))}`);
    reading.push("");
    reading.push(`Original:\n\n> ${c.row.original?.replace(/\n/gu, "\n> ")}`);
    reading.push("");
    reading.push(`Proposta:\n\n> ${c.row.proposed?.replace(/\n/gu, "\n> ")}`);
    reading.push("");
  }
  fs.writeFileSync(path.join(outDir, "para-leitura.md"), `${reading.join("\n")}\n`);

  const summary = {
    stamp,
    rows: all.length,
    distinctKeys: latest.length,
    costUsd: all.reduce((n, r) => n + r.costUsd, 0),
    tokens: {
      prompt: all.reduce((n, r) => n + (r.usage?.prompt ?? 0), 0),
      candidates: all.reduce((n, r) => n + (r.usage?.candidates ?? 0), 0),
      thoughts: all.reduce((n, r) => n + (r.usage?.thoughts ?? 0), 0),
    },
    production: Object.fromEntries(
      (["rewrite", "directed"] as const).flatMap((suite) =>
        RUNS.map((run) => {
          const calls = (suite === "rewrite" ? verifiedRewrite : verifiedDirected).filter((c) => c.row.run === run);
          return [
            `${suite}·r${run}`,
            {
              n: calls.length,
              vetoPct: pct(calls.filter((c) => vetoed(c.production)).length, calls.length),
              failedProofs: tally(
                calls.flatMap((c) => c.production.proofs.filter((p) => !p.passed).map((p) => p.check)),
              ),
              signals: tally(calls.flatMap((c) => c.production.signals.filter((s) => s.flagged).map((s) => s.check))),
            },
          ];
        }),
      ),
    ),
    ab: aggregate([...verifiedRewrite, ...verifiedDirected].map((c) => c.ab)),
    stability,
    probe: probeSummary,
  };
  fs.writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, "report.md"), `${md.join("\n")}\n`);
  log(md.join("\n"));
}
