import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const TARGET = join(process.cwd(), "public", "pdf.worker.min.mjs");

const source = join(dirname(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")), "pdf.worker.min.mjs");

if (!existsSync(source)) {
  console.error(`[lucid] worker do pdfjs não encontrado em ${source}`);
  process.exit(1);
}

if (existsSync(TARGET) && statSync(TARGET).size === statSync(source).size) {
  console.log("[lucid] worker do pdfjs já está atualizado");
  process.exit(0);
}

mkdirSync(dirname(TARGET), { recursive: true });
copyFileSync(source, TARGET);
console.log(`[lucid] worker do pdfjs copiado para ${TARGET}`);
