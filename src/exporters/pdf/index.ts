import type { RawBlock } from "@/lucid/core/document/structured";
import { embedFonts, fetchFont, type FontLoader } from "./fonts";
import { layout, type LayoutOptions } from "./layout";
import { draw } from "./render";
import { A4, type PageTheme } from "../page-theme";
import type { Measure } from "./wrap";

export type { PageTheme } from "../page-theme";
export { A4 } from "../page-theme";
export { layout } from "./layout";
export type { Draw, LaidOutPage } from "./layout";

export interface PdfExportOptions extends LayoutOptions {
  readonly theme?: PageTheme;
  readonly loadFont?: FontLoader;
}

export type { FontLoader } from "./fonts";

export async function exportPdf(blocks: readonly RawBlock[], options: PdfExportOptions = {}): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const theme = options.theme ?? A4;
  const doc = new jsPDF({ unit: "pt", format: [theme.width, theme.height], orientation: "portrait", compress: true });

  const names = await embedFonts(doc, options.loadFont ?? fetchFont);

  const measure: Measure = (text, family, weight, size) => {
    doc.setFont(names[family], weight === "bold" ? "bold" : "normal");
    doc.setFontSize(size);
    return doc.getTextWidth(text);
  };

  draw(doc, layout(blocks, theme, measure, options), theme, names);

  return new Uint8Array(doc.output("arraybuffer"));
}
