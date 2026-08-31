import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const sources = (): Array<{ path: string; text: string }> =>
  filesUnder("src/app/components")
    .filter((path) => path.endsWith(".tsx"))
    .map((path) => ({ path, text: readFileSync(path, "utf8") }));

const DESTINATION_SURFACES = ["/views/", "/route/", "/revision-list/", "/revision-note/"];

const destinationSources = (): Array<{ path: string; text: string }> =>
  sources().filter(
    (file) => DESTINATION_SURFACES.some((dir) => file.path.includes(dir)) && !file.path.includes("-dialog"),
  );

function labelHeadings(): Array<{ path: string; tag: string; classes: string }> {
  const out: Array<{ path: string; tag: string; classes: string }> = [];
  for (const { path, text } of sources()) {
    for (const match of text.matchAll(/<(h[1-6])\b[^>]*className="([^"]*\bu-label\b[^"]*)"/g)) {
      out.push({ path, tag: match[1], classes: match[2] });
    }
  }
  return out;
}

describe("the panel keeps one rhythm", () => {
  it("gives the destination title one ink and the section labels another", () => {
    for (const heading of labelHeadings()) {
      const expected = heading.tag === "h2" ? "text-ink-2" : "text-ink-3";
      expect(heading.classes, `${heading.path} · <${heading.tag}>`).toContain(expected);
    }
  });

  it("finds section labels to check, so the rule cannot pass by matching nothing", () => {
    const headings = labelHeadings();
    expect(headings.filter((h) => h.tag === "h2").length).toBeGreaterThan(0);
    expect(headings.filter((h) => h.tag === "h3").length).toBeGreaterThan(4);
  });

  it("opens every destination on the same vertical rhythm below its header", () => {
    const views = ["overview-view", "review-view", "changes-view", "metrics-view"];
    for (const view of views) {
      const text = readFileSync(`src/app/components/views/${view}.tsx`, "utf8");
      const containers = [...text.matchAll(/className="fade-in[^"]*\bpx-4 py-(\d)\b/g)].map((m) => m[1]);
      for (const value of containers) expect(value, `${view} opens with py-${value}`).toBe("4");
    }
  });

  it("gives the cards inside a destination one padding", () => {
    const paddings = new Set<string>();
    for (const { text } of destinationSources()) {
      for (const match of text.matchAll(/className="[^"]*\brounded-xl\b[^"]*\b(p-[\d.]+|py-[\d.]+)\b[^"]*"/g)) {
        paddings.add(match[1]);
      }
    }

    expect([...paddings].filter((p) => p.startsWith("p-"))).toEqual([]);
  });
});
