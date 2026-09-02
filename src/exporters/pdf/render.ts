import type { jsPDF } from "jspdf";
import type { Draw, LaidOutPage } from "./layout";
import { FONT_NAME, type FontFamily, type FontWeight, type PageTheme } from "../page-theme";

const STYLE: Record<FontWeight, string> = { regular: "normal", bold: "bold" };

const STANDARD: Record<FontFamily, string> = { serif: FONT_NAME.serif.pdf, sans: FONT_NAME.sans.pdf };

export function draw(
  doc: jsPDF,
  pages: readonly LaidOutPage[],
  theme: PageTheme,
  fonts: Record<FontFamily, string> = STANDARD,
): void {
  for (const [index, page] of pages.entries()) {
    if (index > 0) doc.addPage([theme.width, theme.height], "portrait");
    for (const command of page.commands) paint(doc, command, fonts);
  }
}

function paint(doc: jsPDF, command: Draw, fonts: Record<FontFamily, string>): void {
  if (command.kind === "rect") {
    doc.setFillColor(command.color);
    doc.rect(command.x, command.y, command.width, command.height, "F");
    return;
  }

  if (command.kind === "line") {
    doc.setDrawColor(command.color);
    doc.setLineWidth(command.width);
    doc.line(command.x1, command.y1, command.x2, command.y2);
    return;
  }

  doc.setFont(fonts[command.family], STYLE[command.weight]);
  doc.setFontSize(command.size);
  doc.setTextColor(command.color);
  doc.text(command.text, command.x, command.y);
}
