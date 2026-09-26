import fs from "node:fs";
import path from "node:path";
import { interpret } from "@/lucid/probe/interpret";
import { GOLDEN_SONDA } from "../probe-golden";
import { sha256 } from "../baseline/recorder";
import { latestByKey, loadCalls, type CallRow } from "../baseline/run";
import { compareArms, flipRate, renderComparison, scoreArm, type Arm, type Comparison } from "./compare";

const RUNS = [1, 2, 3] as const;
const SAYS_NOTHING = /o texto não diz/iu;
const FLIP_INVESTIGATION = 0.05;

const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const quantile = (xs: readonly number[], q: number): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const tally = (values: readonly string[]): string => {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return (
    Object.entries(out)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(", ") || "—"
  );
};
const pct = (part: number, whole: number): string => (whole === 0 ? "—" : `${((100 * part) / whole).toFixed(1)}%`);
const f2 = (x: number | null): string => (x === null ? "—" : x.toFixed(2));

export interface ArmSource {
  readonly label: string;
  readonly callsFile: string;
}

function operational(label: string, rows: readonly CallRow[]): string[] {
  const out: string[] = [];
  for (const suite of ["rewrite", "directed", "probe"] as const) {
    for (const run of RUNS) {
      const rs = rows.filter((r) => r.suite === suite && r.run === run);
      if (rs.length === 0) continue;
      const ok = rs.filter((r) => r.outcome === "ok");
      const attempts = rs.flatMap((r) => r.attempts);
      out.push(
        `| ${label} | ${suite} | r${run} | ${rs.length} | ${ok.length} | ${rs.length - ok.length} | ${
          attempts.filter((a) => a.status !== 200).length
        } | ${tally(rs.map((r) => r.finishReason ?? "(nenhum)"))} | ${rs.filter((r) => r.parseOutcome === "unparseable").length} | ${Math.round(
          mean(ok.map((r) => r.usage?.prompt ?? 0)),
        )} | ${Math.round(mean(ok.map((r) => r.usage?.candidates ?? 0)))} / ${Math.max(
          0,
          ...ok.map((r) => r.usage?.candidates ?? 0),
        )} | ${ok.reduce((n, r) => n + (r.usage?.thoughts ?? 0), 0)} / ${Math.max(0, ...ok.map((r) => r.usage?.thoughts ?? 0))} | ${Math.round(
          quantile(
            ok.map((r) => r.latencyMs),
            0.5,
          ),
        )} / ${Math.round(
          quantile(
            ok.map((r) => r.latencyMs),
            0.95,
          ),
        )} / ${Math.max(0, ...ok.map((r) => r.latencyMs))} | ${rs.reduce((n, r) => n + r.costUsd, 0).toFixed(4)} |`,
      );
    }
  }
  return out;
}

interface ProbeMatrix {
  readonly n: number;
  readonly tp: number;
  readonly fn: number;
  readonly fp: number;
  readonly tn: number;
  readonly recall: number | null;
  readonly precision: number | null;
  readonly accuracy: number | null;
  readonly contradictions: number;
  readonly misses: readonly string[];
}

function matrixOf(
  entries: readonly { id: string; flag: boolean; human: boolean; contradiction: boolean }[],
): ProbeMatrix {
  const tp = entries.filter((e) => e.human && e.flag).length;
  const fn = entries.filter((e) => e.human && !e.flag).length;
  const fp = entries.filter((e) => !e.human && e.flag).length;
  const tn = entries.filter((e) => !e.human && !e.flag).length;
  return {
    n: entries.length,
    tp,
    fn,
    fp,
    tn,
    recall: tp + fn === 0 ? null : tp / (tp + fn),
    precision: tp + fp === 0 ? null : tp / (tp + fp),
    accuracy: entries.length === 0 ? null : (tp + tn) / entries.length,
    contradictions: entries.filter((e) => e.contradiction).length,
    misses: entries.filter((e) => e.flag !== e.human).map((e) => e.id),
  };
}

function probeMatrices(rows: readonly CallRow[]): {
  perRun: ProbeMatrix[];
  majority: ProbeMatrix;
  sameSignal: number;
  cases: number;
} {
  const latest = [...latestByKey(rows).values()].filter(
    (r) => r.suite === "probe" && r.outcome === "ok" && r.probeResult,
  );
  const byCase = new Map<string, Map<number, CallRow>>();
  for (const r of latest) {
    const m = byCase.get(r.itemId) ?? new Map<number, CallRow>();
    m.set(r.run, r);
    byCase.set(r.itemId, m);
  }
  const entry = (r: CallRow) => {
    const c = GOLDEN_SONDA.find((g) => g.id === r.itemId)!;
    return {
      id: r.itemId,
      flag: interpret(r.probeResult!).tipo === "flag",
      human: c.humanoTrava,
      contradiction: r.probeResult!.podeResponder && SAYS_NOTHING.test(r.probeResult!.respostaExtraida),
    };
  };
  const perRun = RUNS.map((run) => matrixOf(latest.filter((r) => r.run === run).map(entry)));
  const complete = [...byCase.values()].filter((m) => RUNS.every((run) => m.has(run)));
  const majority = matrixOf(
    complete.map((m) => {
      const es = RUNS.map((run) => entry(m.get(run)!));
      return {
        id: es[0].id,
        human: es[0].human,
        flag: es.filter((e) => e.flag).length * 2 > es.length,
        contradiction: es.filter((e) => e.contradiction).length * 2 > es.length,
      };
    }),
  );
  const sameSignal = complete.filter((m) => new Set(RUNS.map((run) => entry(m.get(run)!).flag)).size === 1).length;
  return { perRun, majority, sameSignal, cases: complete.length };
}

function identicalAcrossRuns(rows: readonly CallRow[], suite: string): { items: number; identical: number } {
  const byItem = new Map<string, Map<number, string | null>>();
  for (const r of latestByKey(rows).values()) {
    if (r.suite !== suite || r.outcome !== "ok") continue;
    const m = byItem.get(r.itemId) ?? new Map<number, string | null>();
    m.set(r.run, suite === "probe" ? r.raw : r.proposed);
    byItem.set(r.itemId, m);
  }
  const complete = [...byItem.values()].filter((m) => RUNS.every((run) => m.has(run)));
  return { items: complete.length, identical: complete.filter((m) => new Set(m.values()).size === 1).length };
}

function perRunOf(c: Comparison, suite: string, check: string, arm: "base" | "candidate"): readonly number[] {
  const k = c.checks.find((x) => x.suite === suite && x.check === check);
  return k ? (arm === "base" ? k.basePerRun : k.candidatePerRun) : [];
}

const hashOf = (text: string): number => parseInt(sha256(text).slice(0, 8), 16);

function representative(arm: Arm, rows: Map<string, CallRow>, suite: string, itemId: string): CallRow | null {
  const byRun = arm.items.get(`${suite}|${itemId}`);
  if (!byRun) return null;
  const passes = RUNS.filter((run) => byRun.get(run)?.["verdict.sem_veto"] === true).length;
  const majorityPass = passes * 2 > RUNS.length;
  const run = RUNS.find((r) => byRun.get(r)?.["verdict.sem_veto"] === majorityPass) ?? RUNS[0];
  return rows.get(`${suite}|${itemId}|${run}`) ?? null;
}

function blindSample(
  c: Comparison,
  base: Arm,
  candidate: Arm,
  baseRows: readonly CallRow[],
  candidateRows: readonly CallRow[],
  size: number,
): { markdown: string; key: Record<string, unknown> } {
  const index = (rows: readonly CallRow[]) =>
    new Map([...latestByKey(rows).values()].map((r) => [`${r.suite}|${r.itemId}|${r.run}`, r] as const));
  const baseIndex = index(baseRows);
  const candidateIndex = index(candidateRows);

  const strata = new Map<string, string>();
  const add = (id: string, reason: string) => {
    if (!strata.has(id)) strata.set(id, reason);
  };
  const rewriteChecks = c.checks.filter((k) => k.suite === "rewrite");
  for (const k of rewriteChecks.filter((x) => x.hard))
    for (const id of [...k.regressions, ...k.weakRegressions]) add(id, `regressão: ${k.check}`);
  for (const k of rewriteChecks.filter((x) => x.check.startsWith("signal.") || x.check.startsWith("fid."))) {
    for (const id of [...k.regressions, ...k.weakRegressions]) add(id, `regressão: ${k.check}`);
  }
  for (const k of rewriteChecks.filter((x) => x.check === "verdict.sem_veto")) {
    for (const id of [...k.regressions, ...k.weakRegressions]) add(id, "regressão: veredito");
    for (const id of k.improvements) add(id, "melhora: veredito");
  }
  for (const k of rewriteChecks.filter((x) => x.check.startsWith("signal.") || x.check.startsWith("fid."))) {
    for (const id of k.improvements) add(id, `melhora: ${k.check}`);
  }
  const allItems = [
    ...new Set([...base.items.keys()].filter((key) => key.startsWith("rewrite|")).map((key) => key.slice(8))),
  ];
  for (const id of allItems.sort((a, b) => hashOf(a) - hashOf(b))) add(id, "amostra de controle");

  const md: string[] = [
    "# Leitura cega: duas versões por trecho",
    "",
    "Cada bloco traz o original e duas reescritas, X e Y, de modelos diferentes, na rodada que representa o veredito de " +
      "maioria de cada um. A ordem X/Y vem do hash do trecho. A chave está em `leitura-cega.chave.json`: não abra antes de " +
      "ler. Para cada bloco, anote qual versão preserva melhor o que o original manda (obrigações, condições, exceções, " +
      "quem faz o quê) e qual é mais clara.",
    "",
  ];
  const key: Record<string, unknown> = {};
  let count = 0;
  for (const [id, reason] of strata) {
    if (count >= size) break;
    const a = representative(base, baseIndex, "rewrite", id);
    const b = representative(candidate, candidateIndex, "rewrite", id);
    if (!a || !b || a.proposed === null || b.proposed === null || a.proposed === b.proposed) continue;
    const flip = hashOf(id) % 2 === 1;
    const [x, y] = flip ? [b, a] : [a, b];
    md.push(
      `## ${++count}. ${id}`,
      "",
      "**Original**",
      "",
      a.original ?? "",
      "",
      "**X**",
      "",
      x.proposed ?? "",
      "",
      "**Y**",
      "",
      y.proposed ?? "",
      "",
    );
    key[id] = { X: `${x.model} r${x.run}`, Y: `${y.model} r${y.run}`, estrato: reason };
  }
  return { markdown: `${md.join("\n")}\n`, key };
}

export async function writeFinalReport(
  outDir: string,
  baseSource: ArmSource,
  candidateSource: ArmSource,
  log: (message: string) => void,
): Promise<{ comparison: Comparison }> {
  const base = await scoreArm(baseSource.label, baseSource.callsFile, RUNS);
  const candidate = await scoreArm(candidateSource.label, candidateSource.callsFile, RUNS);
  const comparison = compareArms(base, candidate);
  const baseRows = loadCalls(baseSource.callsFile);
  const candidateRows = loadCalls(candidateSource.callsFile);

  const probeBase = probeMatrices(baseRows);
  const probeCandidate = probeMatrices(candidateRows);
  const flips = {
    base: {
      rewrite: flipRate(base, "rewrite"),
      directed: flipRate(base, "directed"),
      probe: flipRate(base, "probe", "probe.agrees"),
    },
    candidate: {
      rewrite: flipRate(candidate, "rewrite"),
      directed: flipRate(candidate, "directed"),
      probe: flipRate(candidate, "probe", "probe.agrees"),
    },
  };

  const hardStrong = comparison.checks.filter((k) => k.hard && k.regressions.length > 0);
  const hardWeak = comparison.checks.filter((k) => k.hard && k.weakRegressions.length > 0);
  const probeFloors = probeCandidate.perRun.map(
    (m) => (m.recall ?? 0) >= 0.6 && (m.precision ?? 0) >= 0.7 && m.contradictions === 0,
  );
  const flipAlerts = Object.entries(flips.candidate).filter(([, f]) => f.rate > FLIP_INVESTIGATION);

  const md: string[] = [];
  md.push(`# Comparação final: ${base.label} × ${candidate.label}`);
  md.push("");
  md.push(
    "Pelo protocolo pré-registrado em `eval/comparacao-gemini-3.8/protocolo.md`. Maioria 2/3 em cada braço; os resultados " +
      "de cada rodada estão ao lado. Nada aqui é aprovação de texto: veto é a taxa de propostas barradas pelo verificador " +
      "determinístico.",
  );
  md.push("");
  md.push("## Barreiras obrigatórias");
  md.push("");
  md.push(
    `- Regressões fortes em verificações obrigatórias: ${
      hardStrong.length === 0
        ? "**nenhuma**"
        : hardStrong.map((k) => `**${k.suite}/${k.check}** (${k.regressions.join(", ")})`).join("; ")
    }`,
  );
  md.push(
    `- Regressões fracas (item instável na base, investigação): ${
      hardWeak.length === 0
        ? "nenhuma"
        : hardWeak.map((k) => `${k.suite}/${k.check} (${k.weakRegressions.join(", ")})`).join("; ")
    }`,
  );
  md.push(
    `- Sonda do candidato nos pisos (recall ≥ 0,6, precisão ≥ 0,7, sem autocontradição) em cada rodada: ${probeFloors
      .map((ok, i) => `r${RUNS[i]} ${ok ? "sim" : "**não**"}`)
      .join(" · ")}`,
  );
  md.push(
    `- Viradas acima de 5% no candidato (investigação obrigatória, não reprovação): ${
      flipAlerts.length === 0
        ? "nenhuma suíte"
        : flipAlerts.map(([s, f]) => `**${s}** ${(100 * f.rate).toFixed(1)}%`).join(", ")
    }`,
  );
  md.push("");

  md.push("## Operação e custo");
  md.push("");
  md.push(
    "| braço | suíte | rodada | n | ok | erros | tentativas ≠200 | finishReason | ilegíveis | entrada méd. | saída méd. / máx. | raciocínio soma / máx. | latência p50 / p95 / máx. (ms) | US$ |",
  );
  md.push("|---|---|---|--:|--:|--:|--:|---|--:|--:|--:|--:|--:|--:|");
  md.push(...operational(base.label, baseRows), ...operational(candidate.label, candidateRows));
  md.push("");
  md.push(
    `Custo total gravado: ${base.label} US$ ${baseRows.reduce((n, r) => n + r.costUsd, 0).toFixed(4)} · ${candidate.label} US$ ${candidateRows
      .reduce((n, r) => n + r.costUsd, 0)
      .toFixed(4)}.`,
  );
  md.push("");

  md.push("## Veto em três camadas (itens vetados por rodada)");
  md.push("");
  md.push("| suíte | camada | " + `${base.label} r1 / r2 / r3 | ${candidate.label} r1 / r2 / r3 |`);
  md.push("|---|---|---|---|");
  for (const suite of ["rewrite", "directed"]) {
    const items = suite === "rewrite" ? 157 : 44;
    for (const [layer, check] of [
      ["veredito de produção", "verdict.sem_veto"],
      ["target_resolved em long_sentence", "proof.target_resolved[long_sentence]"],
      ["veto sem o target_resolved de long_sentence", "verdict.sem_veto_exceto_comprimento"],
    ] as const) {
      const b = perRunOf(comparison, suite, check, "base");
      const cnd = perRunOf(comparison, suite, check, "candidate");
      if (b.length === 0 && cnd.length === 0) continue;
      const denominator = check.includes("[long_sentence]")
        ? (comparison.checks.find((k) => k.suite === suite && k.check === check)?.items ?? items)
        : items;
      md.push(
        `| ${suite} | ${layer} | ${b.map((p) => `${denominator - p} (${pct(denominator - p, denominator)})`).join(" / ")} | ${cnd
          .map((p) => `${denominator - p} (${pct(denominator - p, denominator)})`)
          .join(" / ")} |`,
      );
    }
  }
  md.push("");

  md.push("## Sonda (probe@1)");
  md.push("");
  md.push("| braço | rodada | TP | FN | FP | TN | recall | precisão | acurácia | autocontradições | discordâncias |");
  md.push("|---|---|--:|--:|--:|--:|--:|--:|--:|--:|---|");
  for (const [label, p] of [
    [base.label, probeBase],
    [candidate.label, probeCandidate],
  ] as const) {
    p.perRun.forEach((m, i) =>
      md.push(
        `| ${label} | r${RUNS[i]} | ${m.tp} | ${m.fn} | ${m.fp} | ${m.tn} | ${f2(m.recall)} | ${f2(m.precision)} | ${f2(m.accuracy)} | ${
          m.contradictions
        } | ${m.misses.join(", ") || "—"} |`,
      ),
    );
    const m = p.majority;
    md.push(
      `| ${label} | maioria | ${m.tp} | ${m.fn} | ${m.fp} | ${m.tn} | ${f2(m.recall)} | ${f2(m.precision)} | ${f2(m.accuracy)} | ${
        m.contradictions
      } | ${m.misses.join(", ") || "—"} |`,
    );
  }
  md.push("");
  md.push(
    `Mesmo sinal nas 3 rodadas: ${base.label} ${probeBase.sameSignal}/${probeBase.cases} · ${candidate.label} ${probeCandidate.sameSignal}/${probeCandidate.cases}.`,
  );
  md.push("");

  md.push("## Estabilidade entre rodadas");
  md.push("");
  md.push("| suíte | braço | itens sem veredito unânime | texto idêntico nas 3 rodadas |");
  md.push("|---|---|--:|--:|");
  for (const suite of ["rewrite", "directed", "probe"] as const) {
    for (const [label, f, rows] of [
      [base.label, flips.base[suite], baseRows],
      [candidate.label, flips.candidate[suite], candidateRows],
    ] as const) {
      const same = identicalAcrossRuns(rows, suite);
      md.push(
        `| ${suite} | ${label} | ${f.unstable}/${f.items} (${(100 * f.rate).toFixed(1)}%) | ${same.identical}/${same.items} (${pct(
          same.identical,
          same.items,
        )}) |`,
      );
    }
  }
  md.push("");
  for (const [suite, f] of Object.entries(flips.candidate)) {
    if (f.unstableItems.length > 0) md.push(`Itens instáveis no candidato (${suite}): ${f.unstableItems.join(", ")}`);
  }
  md.push("");
  md.push("A referência de ruído do 2.5 contra ele mesmo está em `aa-2.5.md`.");
  md.push("");

  md.push(
    `## Classificação por item e verificação\n${renderComparison(comparison)
      .replace(/^# .*\n/u, "")
      .replace(/^## /gmu, "### ")}`,
  );

  const sample = blindSample(comparison, base, candidate, baseRows, candidateRows, 30);
  fs.writeFileSync(path.join(outDir, "leitura-cega.md"), sample.markdown);
  fs.writeFileSync(path.join(outDir, "leitura-cega.chave.json"), `${JSON.stringify(sample.key, null, 2)}\n`);
  md.push("");
  md.push(
    `## Leitura humana\n\n${Object.keys(sample.key).length} blocos em \`leitura-cega.md\`, estratificados por regressões, melhoras e ` +
      "sinais, completados por controles. A chave fica em arquivo separado. Esta leitura é do autor e não foi feita aqui.",
  );

  fs.writeFileSync(path.join(outDir, "relatorio-final.md"), `${md.join("\n")}\n`);
  fs.writeFileSync(
    path.join(outDir, "comparacao.json"),
    `${JSON.stringify({ comparison, probe: { base: probeBase, candidate: probeCandidate }, flips }, null, 2)}\n`,
  );
  log(md.join("\n"));
  return { comparison };
}
