// Mede o comportamento real de um critério sobre os trechos do corpus (texto que ninguém
// escreveu para o motor). Uso: npx tsx scripts/probe-corpus.mts <criterion> [metaKey]
import { readFileSync } from "node:fs";
import { analyze } from "../src/lucid";

const criterion = process.argv[2];
const metaKey = process.argv[3];

const passages = readFileSync("corpus/v1/passages.jsonl", "utf-8")
  .split("\n")
  .filter((l) => l.trim() !== "")
  .map((l) => JSON.parse(l) as { passageId: string; text: string; words: number });

let total = 0;
const byMeta = new Map<string, number>();
for (const p of passages) {
  const found = analyze(p.text).findings.filter((f) => f.criterion === criterion);
  total += found.length;
  for (const f of found) {
    const key = metaKey === undefined ? "all" : String(f.meta?.[metaKey] ?? "—");
    byMeta.set(key, (byMeta.get(key) ?? 0) + 1);
    console.log(`[${key}] ${p.passageId}\n    "${f.span.text}"\n    ↳ ${p.text.replace(/\s+/g, " ").slice(0, 190)}`);
  }
}
console.error(`\npassagens: ${passages.length} · palavras: ${passages.reduce((a, p) => a + p.words, 0)}`);
console.error(`${criterion}: ${total} apontamentos` + (metaKey ? ` — ${[...byMeta].map(([k, v]) => `${k}=${v}`).join(" · ")}` : ""));
