import { appendJsonl, readJson, readJsonl } from "./lib/jsonl";
import { PoliteFetcher } from "./lib/http";
import { decodeHtml } from "./lib/extract";
import { paths, DEFAULT_VERSION } from "./lib/paths";
import { assertNotSealed, loadManifest } from "./lib/manifest";

interface SourceSpec {
  id: string;
  label: string;
  docType: string;
  extractor: string;
  seeds: string[];
  allowPattern: string;
  denyPattern: string;
  maxDocs: number;
}

interface SourcesFile {
  license: { basis: string; label: string; reference: string };
  politeness: {
    userAgent: string;
    minIntervalMs: number;
    respectRobotsTxt: boolean;
    timeoutMs: number;
  };
  sources: SourceSpec[];
}

export interface FetchedRow {
  url: string;
  sourceId: string;
  docType: string;
  extractor: string;
  status: number;
  contentType: string;
  rawSha256: string;
  retrievedAt: string;
}

const RE_HREF = /href\s*=\s*["']([^"']+)["']/gi;

export function discoverLinks(html: string, base: string, allow: RegExp, deny: RegExp | null): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(RE_HREF)) {
    let absolute: string;
    try {
      absolute = new URL(match[1], base).toString();
    } catch {
      continue;
    }
    if (!allow.test(absolute)) continue;
    if (deny !== null && deny.test(absolute.toLowerCase())) continue;
    found.add(absolute);
  }
  return [...found];
}

function parseArgs(argv: readonly string[]): { source?: string; limit?: number; dry: boolean } {
  const args: { source?: string; limit?: number; dry: boolean } = { dry: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--source") args.source = argv[++i];
    else if (argv[i] === "--limit") args.limit = Number(argv[++i]);
    else if (argv[i] === "--dry") args.dry = true;
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const manifest = loadManifest();
  assertNotSealed(manifest, "collect");

  const config = readJson<SourcesFile>(paths.sources());
  const fetcher = new PoliteFetcher(
    config.politeness.userAgent,
    config.politeness.minIntervalMs,
    config.politeness.timeoutMs,
    config.politeness.respectRobotsTxt,
  );

  const already = new Set(readJsonl<FetchedRow>(paths.fetched()).map((row) => row.url));
  const sources = config.sources.filter((source) => args.source === undefined || source.id === args.source);
  if (sources.length === 0) throw new Error(`nenhuma fonte casa com --source ${args.source}`);

  for (const source of sources) {
    if (source.seeds.length === 0) {
      console.log(`· ${source.id}: sem sementes declaradas, pulando (ver corpus/sources.json)`);
      continue;
    }

    const allow = new RegExp(source.allowPattern);
    const deny = source.denyPattern.length > 0 ? new RegExp(source.denyPattern, "i") : null;
    const budget = Math.min(args.limit ?? source.maxDocs, source.maxDocs);

    const candidates = new Set<string>();
    for (const seed of source.seeds) {
      if (!(await fetcher.allowed(seed))) {
        console.log(`· ${source.id}: robots.txt proíbe ${seed}`);
        continue;
      }
      try {
        const page = await fetcher.fetch(seed);
        const html = decodeHtml(page.bytes, page.contentType);
        for (const link of discoverLinks(html, seed, allow, deny)) candidates.add(link);
      } catch (cause) {
        console.log(`· ${source.id}: semente falhou (${seed}): ${String(cause)}`);
      }
    }

    const pending = [...candidates]
      .filter((url) => !already.has(url))
      .sort()
      .slice(0, budget);
    console.log(`· ${source.id}: ${candidates.size} candidatos, ${pending.length} a buscar`);
    if (args.dry) continue;

    for (const url of pending) {
      if (!(await fetcher.allowed(url))) {
        console.log(`  ✗ robots.txt proíbe ${url}`);
        continue;
      }
      try {
        const result = await fetcher.fetch(url);
        if (result.status !== 200) {
          console.log(`  ✗ ${result.status} ${url}`);
          continue;
        }
        const row: FetchedRow = {
          url,
          sourceId: source.id,
          docType: source.docType,
          extractor: source.extractor,
          status: result.status,
          contentType: result.contentType,
          rawSha256: result.rawSha256,
          retrievedAt: result.retrievedAt,
        };
        appendJsonl(paths.fetched(), row);
        already.add(url);
        console.log(`  ✓ ${result.fromCache ? "cache" : "rede "} ${url}`);
      } catch (cause) {
        console.log(`  ✗ erro ${url}: ${String(cause)}`);
      }
    }
  }

  console.log(`\ncorpus ${DEFAULT_VERSION}: ${readJsonl(paths.fetched()).length} documentos coletados no total`);
}

await main();
