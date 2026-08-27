import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { countPii } from "../../src/locales/pt-BR/privacy/pii";
import { decodeHtml, htmlToText } from "./lib/extract";
import { readJsonl, sha256, writeJsonl } from "./lib/jsonl";
import { paths } from "./lib/paths";
import { assertNotSealed, loadManifest, refreshManifest, saveManifest } from "./lib/manifest";
import { splitOf } from "./lib/split";
import { countWords } from "./lib/segment";
import type { CorpusDocument } from "./lib/types";
import type { FetchedRow } from "./collect";

const MIN_DOC_WORDS = 200;
const PII_SCANNER_VERSION = "pii@1";

export function docIdFor(row: FetchedRow): string {
  const tail = new URL(row.url).pathname
    .toLowerCase()
    .replace(/\.[a-z]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(-3)
    .join("-");
  return `${row.sourceId}__${tail || sha256(row.url).slice(0, 8)}`;
}

interface Rejection {
  url: string;
  reason: string;
  detail?: string;
}

async function main(): Promise<void> {
  const manifest = loadManifest();
  assertNotSealed(manifest, "extract");

  const fetched = readJsonl<FetchedRow>(paths.fetched());
  if (fetched.length === 0) {
    console.log("nada em fetched.jsonl — rode `npm run corpus:collect` primeiro");
    return;
  }

  const documents: CorpusDocument[] = [];
  const rejected: Rejection[] = [];
  const seen = new Set<string>();

  const license = {
    basis: "lei-9610-art-8-IV",
    label: "ato oficial — sem proteção autoral",
    reference: "Lei 9.610/1998, art. 8º, IV",
  };

  for (const row of fetched) {
    const cachePath = paths.raw(sha256(row.url));
    if (!existsSync(cachePath)) {
      rejected.push({ url: row.url, reason: "bytes ausentes do cache" });
      continue;
    }

    const bytes = readFileSync(cachePath);
    if (!row.contentType.includes("html")) {
      rejected.push({ url: row.url, reason: "formato não suportado", detail: row.contentType });
      continue;
    }

    const text = htmlToText(decodeHtml(bytes, row.contentType));
    const words = countWords(text);
    if (words < MIN_DOC_WORDS) {
      rejected.push({ url: row.url, reason: "texto curto demais", detail: `${words} palavras` });
      continue;
    }

    const pii = countPii(text);
    const scan = {
      cpf: pii.find((entry) => entry.kind === "cpf")?.count ?? 0,
      cnpj: pii.find((entry) => entry.kind === "cnpj")?.count ?? 0,
      email: pii.find((entry) => entry.kind === "email")?.count ?? 0,
      scannerVersion: PII_SCANNER_VERSION,
    };
    if (scan.cpf > 0 || scan.cnpj > 0 || scan.email > 0) {
      rejected.push({
        url: row.url,
        reason: "dado pessoal detectado — documento descartado",
        detail: `cpf=${scan.cpf} cnpj=${scan.cnpj} email=${scan.email}`,
      });
      continue;
    }

    let docId = docIdFor(row);
    if (seen.has(docId)) docId = `${docId}-${sha256(row.url).slice(0, 6)}`;
    seen.add(docId);

    const textPath = paths.text(docId);
    mkdirSync(dirname(textPath), { recursive: true });
    writeFileSync(textPath, text, "utf8");

    documents.push({
      docId,
      sourceId: row.sourceId,
      url: row.url,
      retrievedAt: row.retrievedAt,
      httpStatus: row.status,
      contentType: row.contentType,
      rawSha256: row.rawSha256,
      textSha256: sha256(text),
      extractor: row.extractor,
      license,
      docType: row.docType,
      piiScan: scan,
      split: splitOf(docId, manifest.splitSeed, manifest.testFraction),
    });
  }

  documents.sort((a, b) => (a.docId < b.docId ? -1 : 1));
  writeJsonl(paths.documents(), documents);
  saveManifest(refreshManifest(manifest));

  const dev = documents.filter((doc) => doc.split === "dev").length;
  console.log(`aceitos: ${documents.length} (dev ${dev} / test ${documents.length - dev})`);
  console.log(`descartados: ${rejected.length}`);
  for (const reason of new Set(rejected.map((entry) => entry.reason))) {
    console.log(`  · ${reason}: ${rejected.filter((entry) => entry.reason === reason).length}`);
  }
}

await main();
