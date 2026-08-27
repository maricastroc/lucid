import { agreementStats, compareRuns, routeLabel } from "./lib/agreement";
import { criterionById } from "./lib/criteria";
import { readJsonl, writeJsonl } from "./lib/jsonl";
import { paths } from "./lib/paths";
import { assertNotSealed, loadManifest, refreshManifest, saveManifest } from "./lib/manifest";
import { draw } from "./lib/segment";
import type {
  ConsolidatedLabel,
  CorpusPassage,
  CriterionId,
  HumanReview,
  LabelerRun,
} from "./lib/types";

export interface QueueItem {
  passageId: string;
  criterion: CriterionId;
  text: string;
  route: string;
  blind: boolean;
  modelLabel?: { count: number; occurrences: { start: number; end: number; text: string }[] }[];
}

function parseArgs(argv: readonly string[]) {
  const args: { criterion?: string; split: string } = { split: "dev" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--criterion") args.criterion = argv[++i];
    else if (argv[i] === "--split") args.split = argv[++i];
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.criterion === undefined) throw new Error("informe --criterion");

  const manifest = loadManifest();
  assertNotSealed(manifest, "reconcile");
  const criterion = criterionById(args.criterion);
  const criterionId = criterion.id as CriterionId;

  const passages = new Map(
    readJsonl<CorpusPassage>(paths.passages())
      .filter((passage) => passage.split === args.split)
      .map((passage) => [passage.passageId, passage]),
  );

  const labelerIds = manifest.labelers.map((entry) => entry.id);
  const unique = [...new Set(labelerIds)];
  if (unique.length < 2) {
    throw new Error(`preciso de pelo menos 2 rotuladores no manifesto; achei ${unique.length}`);
  }

  const runsByPassage = new Map<string, LabelerRun[]>();
  for (const labelerId of unique) {
    for (const run of readJsonl<LabelerRun>(paths.runs(criterionId, labelerId))) {
      if (!passages.has(run.passageId)) continue;
      const list = runsByPassage.get(run.passageId) ?? [];

      const existing = list.findIndex((entry) => entry.labelerId === run.labelerId);
      if (existing >= 0) list[existing] = run;
      else list.push(run);
      runsByPassage.set(run.passageId, list);
    }
  }

  const reviews = new Map(
    readJsonl<HumanReview>(paths.review(criterionId))
      .filter((review) => review.criterion === criterionId)
      .map((review) => [review.passageId, review]),
  );

  const labels: ConsolidatedLabel[] = [];
  const queue: QueueItem[] = [];
  const pairs: { a: boolean; b: boolean }[] = [];

  for (const [passageId, runs] of [...runsByPassage.entries()].sort()) {
    if (runs.length < 2) continue;
    const passage = passages.get(passageId);
    if (passage === undefined) continue;

    const agreement = compareRuns(runs);
    if (runs.every((run) => run.ok)) pairs.push({ a: runs[0].count > 0, b: runs[1].count > 0 });

    const decision = routeLabel(runs, agreement, manifest.policy, draw(`${manifest.splitSeed}:audit`, passageId));
    const labelerRefs = runs.map((run) => `${run.labelerId}#${run.promptVersion}`);
    const review = reviews.get(passageId);

    if (decision.needsHuman && review === undefined) {
      const blind = decision.route === "human_audit_sample";
      queue.push({
        passageId,
        criterion: criterionId,
        text: passage.text,
        route: decision.route,
        blind,
        ...(blind ? {} : { modelLabel: runs.map((run) => ({ count: run.count, occurrences: run.occurrences })) }),
      });
      continue;
    }

    if (review !== undefined) {
      labels.push({
        passageId,
        criterion: criterionId,
        count: review.count,
        occurrences: review.occurrences,
        tier: "human",
        route: decision.route,
        agreement,
        labelerRefs,
        reviewedBy: review.reviewedBy,
        reviewedAt: review.reviewedAt,
        note: review.note,
      });
      continue;
    }

    labels.push({
      passageId,
      criterion: criterionId,
      count: runs[0].count,
      occurrences: runs[0].occurrences,
      tier: "consensus",
      route: "auto_consensus",
      agreement,
      labelerRefs,
      reviewedBy: null,
      reviewedAt: null,
      note: null,
    });
  }

  writeJsonl(paths.labels(criterionId), labels);
  writeJsonl(paths.queue(criterionId), queue);
  saveManifest(refreshManifest(manifest));

  const stats = agreementStats(pairs);
  const human = labels.filter((label) => label.tier === "human").length;
  const floor = manifest.policy.agreementFloor;

  console.log(`${criterionId} · split ${args.split}`);
  console.log(`  consolidados: ${labels.length}  (humano ${human} / consenso ${labels.length - human})`);
  console.log(`  fila humana pendente: ${queue.length}`);
  for (const route of new Set(queue.map((item) => item.route))) {
    console.log(`    · ${route}: ${queue.filter((item) => item.route === route).length}`);
  }
  console.log(`  concordância bruta: ${pct(stats.rawAgreement)}  ·  κ Cohen: ${num(stats.cohenKappa)}  ·  AC1 Gwet: ${num(stats.gwetAc1)}`);
  console.log(`  prevalência (ao menos um marcou): ${pct(stats.positiveRate)}`);
  if (stats.gwetAc1 !== null && stats.gwetAc1 < floor) {
    console.log(`  ⚠ AC1 abaixo do piso (${floor}): este critério NÃO é promovido a measuredAssisted.`);
  }
  if (queue.length > 0) console.log(`\npróximo: npm run corpus:review -- --criterion ${criterionId}`);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
function num(value: number | null): string {
  return value === null ? "—" : value.toFixed(3);
}

await main();
