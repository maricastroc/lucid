import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { sha256 } from "./jsonl";
import { paths } from "./paths";

export interface FetchResult {
  url: string;
  status: number;
  contentType: string;
  bytes: Uint8Array;
  rawSha256: string;
  fromCache: boolean;
  retrievedAt: string;
}

interface RobotsRules {
  disallow: string[];
  allow: string[];
}

export class PoliteFetcher {
  private lastRequestAt = new Map<string, number>();
  private robotsCache = new Map<string, RobotsRules | null>();

  constructor(
    private readonly userAgent: string,
    private readonly minIntervalMs: number,
    private readonly timeoutMs: number,
    private readonly respectRobots: boolean,
  ) {}

  async allowed(url: string): Promise<boolean> {
    if (!this.respectRobots) return true;
    const target = new URL(url);
    const rules = await this.robotsFor(target.origin);
    if (rules === null) return true;
    return pathAllowed(target.pathname + target.search, rules);
  }

  async fetch(url: string): Promise<FetchResult> {
    const cachePath = paths.raw(sha256(url));
    if (existsSync(cachePath)) {
      const bytes = readFileSync(cachePath);
      const meta = JSON.parse(readFileSync(`${cachePath}.json`, "utf8")) as {
        status: number;
        contentType: string;
        retrievedAt: string;
      };
      return {
        url,
        status: meta.status,
        contentType: meta.contentType,
        bytes,
        rawSha256: sha256(bytes),
        fromCache: true,
        retrievedAt: meta.retrievedAt,
      };
    }

    await this.throttle(new URL(url).host);

    const response = await fetch(url, {
      headers: { "user-agent": this.userAgent, accept: "text/html,application/xhtml+xml,application/pdf" },
      signal: AbortSignal.timeout(this.timeoutMs),
      redirect: "follow",
    });
    const buffer = new Uint8Array(await response.arrayBuffer());
    const retrievedAt = new Date().toISOString();
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";

    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, buffer);
    writeFileSync(`${cachePath}.json`, JSON.stringify({ status: response.status, contentType, retrievedAt, url }));

    return {
      url,
      status: response.status,
      contentType,
      bytes: buffer,
      rawSha256: sha256(buffer),
      fromCache: false,
      retrievedAt,
    };
  }

  private async throttle(host: string): Promise<void> {
    const last = this.lastRequestAt.get(host);
    if (last !== undefined) {
      const wait = this.minIntervalMs - (Date.now() - last);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    }
    this.lastRequestAt.set(host, Date.now());
  }

  private async robotsFor(origin: string): Promise<RobotsRules | null> {
    const cached = this.robotsCache.get(origin);
    if (cached !== undefined) return cached;

    let rules: RobotsRules | null = null;
    try {
      await this.throttle(new URL(origin).host);
      const response = await fetch(`${origin}/robots.txt`, {
        headers: { "user-agent": this.userAgent },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      rules = response.ok ? parseRobots(await response.text(), this.userAgent) : null;
    } catch {
      //
      rules = null;
    }
    this.robotsCache.set(origin, rules);
    return rules;
  }
}

export function parseRobots(body: string, userAgent: string): RobotsRules {
  const token = userAgent.split("/")[0].toLowerCase();
  const groups = new Map<string, RobotsRules>();
  let current: string[] = [];
  let sawDirective = false;

  for (const rawLine of body.split("\n")) {
    const line = rawLine.split("#")[0].trim();
    if (line.length === 0) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (sawDirective) {
        current = [];
        sawDirective = false;
      }
      current.push(value.toLowerCase());
      if (!groups.has(value.toLowerCase())) groups.set(value.toLowerCase(), { disallow: [], allow: [] });
      continue;
    }
    if (field !== "disallow" && field !== "allow") continue;
    sawDirective = true;
    for (const agent of current) {
      const rules = groups.get(agent);
      if (!rules) continue;
      if (field === "disallow") rules.disallow.push(value);
      else rules.allow.push(value);
    }
  }

  return groups.get(token) ?? groups.get("*") ?? { disallow: [], allow: [] };
}

export function pathAllowed(path: string, rules: RobotsRules): boolean {
  const longest = (patterns: readonly string[]): number =>
    patterns.reduce(
      (best, pattern) => (matchesRobotsPattern(path, pattern) ? Math.max(best, pattern.length) : best),
      -1,
    );

  const disallow = longest(rules.disallow);
  if (disallow < 0) return true;

  return longest(rules.allow) >= disallow;
}

function matchesRobotsPattern(path: string, pattern: string): boolean {
  if (pattern === "") return false;
  const anchoredEnd = pattern.endsWith("$");
  const body = anchoredEnd ? pattern.slice(0, -1) : pattern;
  const parts = body.split("*");

  let index = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === "") continue;
    const found = i === 0 ? (path.startsWith(part) ? 0 : -1) : path.indexOf(part, index);
    if (found < 0) return false;
    index = found + part.length;
  }
  return anchoredEnd ? index === path.length : true;
}
