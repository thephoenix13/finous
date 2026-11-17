/** WCAG AA for normal text. Used for the text colour that sits on the bank's brand colour. */
export const MIN_TEXT_CONTRAST = 4.5;
/** WCAG AA for the edges of buttons and focus rings against the page. */
export const MIN_UI_CONTRAST = 3;

/** The colour the customer app puts behind everything. A bank's brand colour has to stand out against it. */
export const PAGE_BACKGROUND = "#f3f7ff";

/** Reads "#rgb", "#rrggbb", with or without the "#". Returns null for anything else. */
export function parseHex(input: string): [number, number, number] | null {
  const hex = input.trim().replace(/^#/, "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** "#1E5EFF", always six digits, upper case, so a saved colour has one spelling. Null if it isn't a colour. */
export function normaliseHex(input: string): string | null {
  const rgb = parseHex(input);
  return rgb ? `#${rgb.map((n) => n.toString(16).padStart(2, "0")).join("")}`.toUpperCase() : null;
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two colours, 1 to 21. Null if either is not a colour. */
export function contrastRatio(a: string, b: string): number | null {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return null;
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
