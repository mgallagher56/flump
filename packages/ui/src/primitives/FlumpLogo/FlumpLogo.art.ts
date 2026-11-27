/**
 * The logo "K2" (owner, 27 Nov 2026): three glass bubbles climbing over one floor shadow, in a 200
 * by 200 view box. The mobile logo draws the same table (apps/mobile FlumpLogo.styles.ts; its test
 * checks the two agree). Geometry only: colours are the logo tokens (`logo.*`).
 *
 * Each bubble is drawn as: a pale or dark backing, its tint (clearer in the middle, deeper at the
 * rim), a second colour lighting the lower right edge, a soft sheen up top and, on the two larger
 * bubbles, a crisp glint. Bubbles are listed back to front; the teal bubble is drawn last.
 */
export const LOGO_VIEWBOX = "0 0 200 200";

export type LogoTone = "teal" | "sky" | "violet" | "rose";

export interface LogoOrb {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly tone: LogoTone;
  /** The colour lighting the lower right edge. */
  readonly light: LogoTone;
  readonly glint: boolean;
}

export const LOGO_ORBS: readonly LogoOrb[] = [
  { cx: 108, cy: 54, r: 20, tone: "violet", light: "rose", glint: false },
  { cx: 140, cy: 92, r: 28, tone: "sky", light: "violet", glint: true },
  { cx: 84, cy: 122, r: 48, tone: "teal", light: "violet", glint: true },
];

/** The one floor shadow under all three bubbles. */
export const LOGO_FLOOR = { cx: 99, cy: 177, rx: 53 } as const;

/** Where each light sits on a bubble, from its centre and radius. */
export function orbLayout({ cx, cy, r }: Pick<LogoOrb, "cx" | "cy" | "r">) {
  const glintX = cx - r * 0.36;
  const glintY = cy - r * 0.5;
  return {
    /** The tint: clear at the centre, full at the rim. */
    body: { cx: cx - r * 0.12, cy: cy - r * 0.18, r: r * 1.12 },
    /** The second colour, lighting the lower right edge. */
    rim: { cx: cx + r * 0.62, cy: cy + r * 0.66, r: r * 1.05 },
    /** The soft sheen up top. */
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

/** The floor in light: one flat ellipse. In dark: a soft contact shadow with a teal pool over it. */
export function floorLayout({ cx, cy, rx }: typeof LOGO_FLOOR) {
  const ry = rx * 0.15;
  return {
    light: { cx, cy, rx, ry: rx * 0.13, opacity: 0.16 },
    contact: { cx, cy, rx: rx * 1.3, ry: ry * 1.5 },
    pool: { cx: cx + rx * 0.12, cy, rx: rx * 1.05, ry: ry * 1.1 },
  };
}
