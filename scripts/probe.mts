/**
 * Sonda de investigação do motor: roda a Camada 1 sobre frases soltas, sobre um arquivo de casos ou
 * sobre texto real, e imprime cada apontamento com o contexto em que caiu. Não faz parte do produto
 * — existe para interrogar o motor antes de mexer numa regra, e para medir o efeito depois.
 *
 *   npx tsx scripts/probe.mts "O servidor é qualificado."      # frases no argumento
 *   npx tsx scripts/probe.mts --file casos.txt                 # um caso por linha, # é comentário
 *   npx tsx scripts/probe.mts --dir corpus/v1/text             # texto real, agregado no fim
 *
 *   ONLY=passive_voice           limita a saída a um critério
 *   META=eventiveness            agrupa a contagem por um campo de meta
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { analyze } from "../src/lucid";

const only = process.env.ONLY?.split(",").map((s) => s.trim());
const metaKey = process.env.META;
const argv = process.argv.slice(2);

const flat = (s: string): string => s.replace(/\s+/g, " ").trim();
const tally = new Map<string, number>();

function report(text: string, label?: string): void {
  const found = analyze(text).findings.filter((f) => only === undefined || only.includes(f.criterion));
  for (const f of found) {
    const key = metaKey === undefined ? f.criterion : `${f.criterion}:${String(f.meta?.[metaKey] ?? "—")}`;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  if (label !== undefined && found.length === 0) return;

  const marks = found
    .map((f) => {
      const key = metaKey === undefined ? "" : `/${String(f.meta?.[metaKey] ?? "—")}`;
      return `${f.criterion}${key}[${f.severity}${f.requiresHuman ? "·H" : ""}] "${flat(f.span.text)}"`;
    })
    .join("\n     ");

  if (label === undefined) {
    console.log(`${found.length === 0 ? "  " : "!!"} ${flat(text)}\n     ${marks || "—"}`);
    return;
  }
  for (const f of found) {
    const around = flat(text.slice(Math.max(0, f.span.start - 60), f.span.end + 60));
    console.log(`[${label}] "${flat(f.span.text)}"\n     ⟵ …${around}…`);
  }
}

if (argv[0] === "--dir") {
  const dir = argv[1];
  let words = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".txt"))) {
    const text = readFileSync(join(dir, file), "utf-8");
    words += text.split(/\s+/).filter(Boolean).length;
    report(text, file.replace(/\.txt$/, ""));
  }
  console.error(`\n${words} palavras`);
} else {
  const lines =
    argv[0] === "--file"
      ? readFileSync(argv[1], "utf-8")
          .split("\n")
          .filter((l) => l.trim() !== "" && !l.startsWith("#"))
      : argv;
  for (const line of lines) report(line);
}

const total = [...tally.values()].reduce((a, b) => a + b, 0);
console.error(`${total} apontamentos${tally.size === 0 ? "" : ` — ${[...tally].map(([k, v]) => `${k}=${v}`).join(" · ")}`}`);
