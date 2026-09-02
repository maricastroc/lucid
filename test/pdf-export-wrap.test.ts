import { describe, expect, it } from "vitest";
import { wrapText, type Measure } from "@/exporters/pdf/wrap";

const measure: Measure = (text, _family, _weight, size) => text.length * size * 0.5;

const wrap = (text: string, width: number) => wrapText(text, width, measure, "serif", "regular", 10);

describe("wrapping the line", () => {
  it("breaks between words, keeping each line inside the column", () => {
    const lines = wrap("um dois tres quatro cinco seis", 50);

    for (const line of lines) expect(measure(line, "serif", "regular", 10)).toBeLessThanOrEqual(50);
    expect(lines.join(" ")).toBe("um dois tres quatro cinco seis");
  });

  it("gives back nothing for empty text instead of an empty line", () => {
    expect(wrap("   ", 100)).toEqual([]);
  });

  it("breaks a single word that is wider than the column, rather than letting it bleed out", () => {
    const lines = wrap("68100001.14.422.166.11800.15.335041.1.500.9100000.0.4.01", 40);

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(measure(line, "serif", "regular", 10)).toBeLessThanOrEqual(40);
    expect(lines.join("")).toBe("68100001.14.422.166.11800.15.335041.1.500.9100000.0.4.01");
  });

  it("collapses the whitespace it was given instead of drawing it", () => {
    expect(wrap("um    dois", 200)).toEqual(["um dois"]);
  });
});
