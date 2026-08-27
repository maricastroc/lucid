import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { locate } from "./lib/labeler";
import { appendJsonl, readJsonl, writeJsonl } from "./lib/jsonl";
import { paths } from "./lib/paths";
import { assertNotSealed, loadManifest } from "./lib/manifest";
import { criterionById } from "./lib/criteria";
import type { CriterionId, HumanReview } from "./lib/types";
import type { QueueItem } from "./reconcile";

const ROUTE_LABEL: Record<string, string> = {
  human_divergence: "os rotuladores divergiram",
  human_low_confidence: "confiança baixa declarada",
  human_labeler_failure: "rotulador falhou ou respondeu fora do formato",
  human_audit_sample: "amostra de auditoria — revisão cega",
};

function parseArgs(argv: readonly string[]) {
  const args: { criterion?: string; reviewer: string } = { reviewer: process.env.USER ?? "humano" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--criterion") args.criterion = argv[++i];
    else if (argv[i] === "--reviewer") args.reviewer = argv[++i];
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.criterion === undefined) throw new Error("informe --criterion");

  const manifest = loadManifest();
  assertNotSealed(manifest, "review");
  const criterion = criterionById(args.criterion);
  const criterionId = criterion.id as CriterionId;

  const queue = readJsonl<QueueItem>(paths.queue(criterionId));
  if (queue.length === 0) {
    console.log("fila vazia — rode `npm run corpus:reconcile` antes.");
    return;
  }

  const done = new Set(readJsonl<HumanReview>(paths.review(criterionId)).map((review) => review.passageId));
  const pending = queue.filter((item) => !done.has(item.passageId));

  console.log(`\n${criterion.label} — ${pending.length} de ${queue.length} pendentes\n`);
  console.log(criterion.definition);
  console.log("\n" + "═".repeat(72));

  const rl = createInterface({ input: stdin, output: stdout });
  const remaining: QueueItem[] = [];

  try {
    for (const [index, item] of pending.entries()) {
      console.log(`\n[${index + 1}/${pending.length}] ${item.passageId}`);
      console.log(`motivo: ${ROUTE_LABEL[item.route] ?? item.route}\n`);
      console.log(item.text);

      if (!item.blind && item.modelLabel !== undefined) {
        console.log("\nrotuladores:");
        item.modelLabel.forEach((label, i) => {
          const spans = label.occurrences.map((occurrence) => `“${occurrence.text}”`).join(", ");
          console.log(`  ${i + 1}) ${label.count} ocorrência(s)${spans.length > 0 ? `: ${spans}` : ""}`);
        });
      }

      console.log(
        "\nDigite cada ocorrência como ela aparece no texto, uma por linha." +
          "\nEnter vazio encerra a lista · `0` = nenhuma ocorrência · `p` = pular · `q` = sair",
      );

      const trechos: string[] = [];
      let action: "save" | "skip" | "quit" = "save";

      for (;;) {
        const answer = (await rl.question("> ")).trim();
        if (answer === "q") {
          action = "quit";
          break;
        }
        if (answer === "p") {
          action = "skip";
          break;
        }
        if (answer === "0") break;
        if (answer === "") break;

        if (!item.text.includes(answer)) {
          console.log("  ✗ esse texto não aparece literalmente no trecho — copie exatamente como está.");
          continue;
        }
        trechos.push(answer);
      }

      if (action === "quit") {
        remaining.push(...pending.slice(index));
        break;
      }
      if (action === "skip") {
        remaining.push(item);
        continue;
      }

      const note = (await rl.question("nota (opcional): ")).trim();
      const { occurrences } = locate(item.text, trechos);
      const review: HumanReview = {
        passageId: item.passageId,
        criterion: criterionId,
        count: occurrences.length,
        occurrences,
        reviewedBy: args.reviewer,
        reviewedAt: new Date().toISOString(),
        route: item.route as HumanReview["route"],
        blind: item.blind,
        note: note.length > 0 ? note : null,
      };
      appendJsonl(paths.review(criterionId), review);
      done.add(item.passageId);
      console.log(`  ✓ ${occurrences.length} ocorrência(s)`);
    }
  } finally {
    rl.close();
  }

  const stillPending = queue.filter((item) => !done.has(item.passageId));
  writeJsonl(paths.queue(criterionId), stillPending);
  console.log(`\nrevisados nesta sessão: ${pending.length - remaining.length}`);
  console.log(`próximo: npm run corpus:reconcile -- --criterion ${criterionId}  (reconsolida com as decisões humanas)`);
}

await main();
