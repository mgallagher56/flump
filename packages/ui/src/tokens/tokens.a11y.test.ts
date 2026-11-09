import { describe, expect, it } from "vitest";
import { colors, fontSizes, fonts } from "./index";

// Standard WCAG relative luminance calculation
function getLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe("Tokens & Typography A11y Suite", () => {
  it("enforces a strict 12px (0.75rem) minimum floor on fontSizes", () => {
    const minSize = parseFloat(fontSizes.xs.value);
    expect(minSize).toBeGreaterThanOrEqual(0.75); // 12px / 16px
  });

  it("provides 3-tier font stack definitions", () => {
    expect(fonts.display.value).toContain("Plus Jakarta Sans");
    expect(fonts.sans.value).toContain("Inter");
    expect(fonts.mono.value).toContain("JetBrains Mono");
  });

  it("verifies Light Mode primary text contrast exceeds WCAG AAA (7.0:1) on canvas", () => {
    const textPrimary = colors.slate[900].value;
    const canvasBg = "#ffffff";
    const contrast = getContrastRatio(textPrimary, canvasBg);
    expect(contrast).toBeGreaterThanOrEqual(7.0); // AAA standard
  });

  it("verifies Light Mode secondary & muted text contrast exceeds WCAG AA (4.5:1)", () => {
    const textSecondary = colors.slate[700].value;
    const textMuted = colors.slate[600].value;
    const canvasBg = "#ffffff";

    expect(getContrastRatio(textSecondary, canvasBg)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(textMuted, canvasBg)).toBeGreaterThanOrEqual(4.5);
  });

  it("verifies Dark Mode text contrast meets WCAG AA (4.5:1)", () => {
    const textPrimaryDark = "#f8fafc";
    const textMutedDark = colors.slate[400].value;
    const darkCanvas = colors.dark.canvas.value;

    expect(getContrastRatio(textPrimaryDark, darkCanvas)).toBeGreaterThanOrEqual(7.0);
    expect(getContrastRatio(textMutedDark, darkCanvas)).toBeGreaterThanOrEqual(4.5);
  });

  it("verifies semantic status color contrasts meet WCAG standards on their badges", () => {
    // Success badge light: text on light green bg
    expect(
      getContrastRatio(colors.success[800].value, colors.success[50].value),
    ).toBeGreaterThanOrEqual(4.5);
    // Warning badge light: text on light amber bg
    expect(
      getContrastRatio(colors.warning[800].value, colors.warning[50].value),
    ).toBeGreaterThanOrEqual(4.5);
    // Danger badge light: text on light red bg
    expect(
      getContrastRatio(colors.destructive[800].value, colors.destructive[50].value),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
