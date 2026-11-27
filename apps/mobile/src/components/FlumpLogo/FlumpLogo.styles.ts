import type { ColorKey } from "@flump/tokens/native";
import { StyleSheet } from "react-native";
import type { Theme } from "../../theme/ThemeProvider";

export type FlumpLogoSize = "sm" | "md" | "lg";

/** The web logo's sizes in points (packages/ui FlumpLogo.styles.ts: 32, 50 and 96 px). */
export const LOGO_SIZES: Record<FlumpLogoSize, number> = { sm: 32, md: 50, lg: 96 };

export type LogoTone = "teal" | "sky" | "violet" | "rose";

/**
 * The logo "K2" (owner, 27 Nov 2026), the same table as the web logo (packages/ui FlumpLogo.art.ts;
 * the test checks they agree): three glass bubbles, back to front, over one floor shadow, in a 200
 * by 200 view box. `light` is the colour lighting a bubble's lower right edge.
 */
export const LOGO_ART = {
  viewBox: "0 0 200 200",
  orbs: [
    { cx: 108, cy: 54, r: 20, tone: "violet", light: "rose", glint: false },
    { cx: 140, cy: 92, r: 28, tone: "sky", light: "violet", glint: true },
    { cx: 84, cy: 122, r: 48, tone: "teal", light: "violet", glint: true },
  ],
  floor: { cx: 99, cy: 177, rx: 53 },
} as const satisfies {
  viewBox: string;
  orbs: readonly {
    cx: number;
    cy: number;
    r: number;
    tone: LogoTone;
    light: LogoTone;
    glint: boolean;
  }[];
  floor: { cx: number; cy: number; rx: number };
};

/** Opacities that differ by theme (glass is clearer on the dark canvas); the web logo's values. */
export const LOGO_OPACITY = {
  light: { backing: 0.55, core: 0.4, mid: 0.62, sheen: 0.6, glint: 0.9 },
  dark: { backing: 0.35, core: 0.28, mid: 0.5, sheen: 0.5, glint: 0.85 },
} as const;

/** Where each light sits on a bubble, from its centre and radius (as the web logo). */
export function orbLayout({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const glintX = cx - r * 0.36;
  const glintY = cy - r * 0.5;
  return {
    body: { cx: cx - r * 0.12, cy: cy - r * 0.18, r: r * 1.12 },
    rim: { cx: cx + r * 0.62, cy: cy + r * 0.66, r: r * 1.05 },
    sheen: { cx: cx - r * 0.3, cy: cy - r * 0.55, r: r * 0.85 },
    glint: {
      cx: glintX,
      cy: glintY,
      rx: r * 0.2,
      ry: r * 0.11,
      transform: `rotate(-32 ${glintX} ${glintY})`,
    },
  };
}

/** The floor: one flat ellipse in light; a soft contact shadow with a teal pool over it in dark. */
export function floorLayout({ cx, cy, rx }: { cx: number; cy: number; rx: number }) {
  const ry = rx * 0.15;
  return {
    light: { cx, cy, rx, ry: rx * 0.13, opacity: 0.16 },
    contact: { cx, cy, rx: rx * 1.3, ry: ry * 1.5 },
    pool: { cx: cx + rx * 0.12, cy, rx: rx * 1.05, ry: ry * 1.1 },
  };
}

/** The logo tokens (`logo.*`), the same as the web logo's. */
const LOGO_COLOURS = {
  teal: "logo.teal",
  sky: "logo.sky",
  violet: "logo.violet",
  rose: "logo.rose",
  glint: "logo.glint",
  backing: "logo.backing",
  shadow: "logo.shadow",
} as const satisfies Record<string, ColorKey>;

/** The box for each size, and the artwork's paints and opacities in the theme. */
export const createStyles = (theme: Theme) => ({
  box: StyleSheet.create({
    sm: { width: LOGO_SIZES.sm, height: LOGO_SIZES.sm },
    md: { width: LOGO_SIZES.md, height: LOGO_SIZES.md },
    lg: { width: LOGO_SIZES.lg, height: LOGO_SIZES.lg },
  }),
  paint: Object.fromEntries(
    Object.entries(LOGO_COLOURS).map(([role, key]) => [role, theme.colors[key]]),
  ) as Record<keyof typeof LOGO_COLOURS, string>,
  opacity: LOGO_OPACITY[theme.scheme],
  dark: theme.scheme === "dark",
});
