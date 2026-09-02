export type FontFamily = "serif" | "sans";
export type FontWeight = "regular" | "bold";

export interface TypeStyle {
  readonly family: FontFamily;
  readonly weight: FontWeight;
  readonly size: number;
  readonly leading: number;
  readonly color: string;
  readonly spaceBefore: number;
  readonly spaceAfter: number;
}

export const FONT_NAME: Record<FontFamily, { readonly pdf: string; readonly word: string }> = {
  serif: { pdf: "times", word: "Cambria" },
  sans: { pdf: "helvetica", word: "Calibri" },
};

export const EMBEDDED: FontFamily = "serif";

export interface PageTheme {
  readonly width: number;
  readonly height: number;
  readonly margin: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
  readonly sheet: string;
  readonly rule: string;
  readonly body: TypeStyle;
  readonly headings: readonly TypeStyle[];
  readonly listMarker: TypeStyle;
  readonly tableCell: TypeStyle;
  readonly tableHeader: TypeStyle;
  readonly footer: TypeStyle;
  readonly headerFill: string;
  readonly indentPerLevel: number;
  readonly markerGap: number;
  readonly cellPadding: { readonly x: number; readonly y: number };
}

const INK_0 = "#1f1d18";
const INK_1 = "#4f4a42";
const INK_3 = "#837b6b";
const SHEET = "#fffdf8";
const RULE = "#d9d4ca";

const heading = (size: number, spaceBefore: number): TypeStyle => ({
  family: "serif",
  weight: "bold",
  size,
  leading: size * 1.18,
  color: INK_0,
  spaceBefore,
  spaceAfter: size * 0.5,
});

export const A4: PageTheme = {
  width: 595.28,
  height: 841.89,
  margin: { top: 92, right: 85, bottom: 82, left: 85 },
  sheet: SHEET,
  rule: RULE,
  body: {
    family: "serif",
    weight: "regular",
    size: 11,
    leading: 17,
    color: INK_0,
    spaceBefore: 0,
    spaceAfter: 8,
  },
  headings: [heading(25, 0), heading(15, 24), heading(12.5, 19), heading(11.5, 15), heading(11, 13), heading(10.5, 11)],
  listMarker: {
    family: "serif",
    weight: "regular",
    size: 11,
    leading: 17,
    color: INK_1,
    spaceBefore: 0,
    spaceAfter: 0,
  },
  tableCell: {
    family: "serif",
    weight: "regular",
    size: 9.75,
    leading: 13.2,
    color: INK_0,
    spaceBefore: 0,
    spaceAfter: 4,
  },
  tableHeader: {
    family: "serif",
    weight: "bold",
    size: 9.25,
    leading: 12.6,
    color: INK_0,
    spaceBefore: 0,
    spaceAfter: 4,
  },
  footer: {
    family: "sans",
    weight: "regular",
    size: 8,
    leading: 10,
    color: INK_3,
    spaceBefore: 0,
    spaceAfter: 0,
  },
  headerFill: "#f4f0e6",
  indentPerLevel: 18,
  markerGap: 6,
  cellPadding: { x: 6, y: 5 },
};

export const contentWidth = (theme: PageTheme): number => theme.width - theme.margin.left - theme.margin.right;

export const contentHeight = (theme: PageTheme): number => theme.height - theme.margin.top - theme.margin.bottom;
