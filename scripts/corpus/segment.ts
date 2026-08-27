import { readFileSync } from "node:fs";
import { CRITERIA, cuedCriteria } from "./lib/criteria";
import { readJsonl, writeJsonl } from "./lib/jsonl";
import { paths } from "./lib/paths";
import { assertNotSealed, loadManifest, refreshManifest, saveManifest } from "./lib/manifest";
import { DEFAULT_SEGMENT, draw, segment } from "./lib/segment";
import type { CorpusDocument, CorpusPassage, CriterionId } from "./lib/types";

const DEFAULT_RANDOM_RATE = 0.08;
const CUED_PER_DOC = 8;

function parseArgs(argv: readonly string[]): { randomRate: number } {
  let randomRate = DEFAULT_RANDOM_RATE;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--random-rate") randomRate = Number(argv[++i]);
  }
  return { randomRate };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const manifest = loadManifest();
  assertNotSealed(manifest, "segment");

  const documents = readJsonl<CorpusDocument>(paths.documents());
  if (documents.length === 0) {
    console.log("nada em documents.jsonl — rode `npm run corpus:extract` primeiro");
    return;
  }

  const passages: CorpusPassage[] = [];
  const droppedByCap = new Map<CriterionId, number>();
  const cueHits = new Map<CriterionId, number>();
  let totalBlocks = 0;

  for (const document of documents) {
    const text = readFileSync(paths.text(document.docId), "utf8");
    const blocks = segment(text, DEFAULT_SEGMENT);
    totalBlocks += blocks.length;

    const ids = blocks.map((_, index) => `${document.docId}#${String(index).padStart(4, "0")}`);

    const keptByCriterion = new Map<CriterionId, Set<string>>();
    for (const criterion of CRITERIA) {
      const matching = ids.filter((id, index) => criterion.cue(blocks[index].text));
      const ranked = [...matching].sort(
        (a, b) => draw(`${manifest.splitSeed}:cue:${criterion.id}`, a) - draw(`${manifest.splitSeed}:cue:${criterion.id}`, b),
      );
      keptByCriterion.set(criterion.id, new Set(ranked.slice(0, CUED_PER_DOC)));
      cueHits.set(criterion.id, (cueHits.get(criterion.id) ?? 0) + matching.length);
      if (ranked.length > CUED_PER_DOC) {
        droppedByCap.set(criterion.id, (droppedByCap.get(criterion.id) ?? 0) + (ranked.length - CUED_PER_DOC));
      }
    }

    blocks.forEach((block, index) => {
      const passageId = ids[index];
      const isRandom = draw(`${manifest.splitSeed}:random`, passageId) < args.randomRate;

      const cued = cuedCriteria(block.text).filter((criterion) =>
        keptByCriterion.get(criterion)?.has(passageId) === true,
      );

      if (!isRandom && cued.length === 0) return;

      passages.push({
        passageId,
        docId: document.docId,
        start: block.start,
        end: block.end,
        text: block.text,
        words: block.words,
        strata: { random: isRandom, cued },
        split: document.split,
      });
    });
  }

  passages.sort((a, b) => (a.passageId < b.passageId ? -1 : 1));
  writeJsonl(paths.passages(), passages);
  saveManifest(refreshManifest(manifest));

  const randomCount = passages.filter((passage) => passage.strata.random).length;
  console.log(`blocos elegíveis: ${totalBlocks}`);
  console.log(`trechos no corpus: ${passages.length}  (estrato R: ${randomCount})`);
  for (const criterion of CRITERIA) {
    const cued = passages.filter((passage) => passage.strata.cued.includes(criterion.id)).length;
    const dropped = droppedByCap.get(criterion.id) ?? 0;
    const hits = cueHits.get(criterion.id) ?? 0;
    const selectivity = totalBlocks === 0 ? 0 : hits / totalBlocks;
    const note = dropped > 0 ? ` (${dropped} descartados pelo teto por documento)` : "";
    console.log(`  · ${criterion.id}: estrato E ${cued}${note} · cue casa ${(selectivity * 100).toFixed(0)}% dos blocos`);
    if (selectivity > 0.9) {
      console.log(`    ⚠ cue pouco seletiva: para este critério o estrato E não enriquece sobre o aleatório.`);
    }
  }
}

await main();
