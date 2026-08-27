import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8");
  const rows: T[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    rows.push(JSON.parse(trimmed) as T);
  }
  return rows;
}

export function writeJsonl(path: string, rows: readonly unknown[]): void {
  mkdirSync(dirname(path), { recursive: true });
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  writeFileSync(path, rows.length === 0 ? "" : `${body}\n`, "utf8");
}

export function appendJsonl(path: string, row: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(row)}\n`, "utf8");
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function sha256(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashRows(rows: readonly unknown[]): string {
  const serialized = rows.map((row) => JSON.stringify(row)).sort();
  return sha256(serialized.join("\n"));
}
