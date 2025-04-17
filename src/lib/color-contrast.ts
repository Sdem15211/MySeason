import type { RgbColor } from "./types/image-analysis.types";

/**
 * Convert a hex color string (#RGB or #RRGGBB) to an RgbColor object.
 */
export function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace(/^#/, "");
  if (clean.length === 3) {
    // Expand each shorthand digit explicitly
    const [c1, c2, c3] = clean;
    const r = parseInt(c1! + c1!, 16);
    const g = parseInt(c2! + c2!, 16);
    const b = parseInt(c3! + c3!, 16);
    return { r, g, b };
  }
  if (clean.length === 6) {
    // Parse each pair of characters explicitly
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return { r, g, b };
  }
  throw new Error(`Invalid hex color: ${hex}`);
}

// Linearize an sRGB channel value (0-255) to a linear value
function linearizeChannel(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Compute the relative luminance of an RGB color according to WCAG.
 */
export function relativeLuminance(rgb: RgbColor): number {
  const R = linearizeChannel(rgb.r);
  const G = linearizeChannel(rgb.g);
  const B = linearizeChannel(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Compute contrast ratio between two hex color strings, rounded to 2 decimals.
 */
export function contrastRatioHex(hex1: string, hex2: string): number {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const L1 = Math.max(relativeLuminance(c1), relativeLuminance(c2));
  const L2 = Math.min(relativeLuminance(c1), relativeLuminance(c2));
  return Number(((L1 + 0.05) / (L2 + 0.05)).toFixed(2));
}

/**
 * Categorize a numeric contrast ratio into 'High', 'Medium', or 'Low'.
 */
export function categorizeContrast(ratio: number): "High" | "Medium" | "Low" {
  if (ratio >= 7) return "High";
  if (ratio >= 4.5) return "Medium";
  return "Low";
}
