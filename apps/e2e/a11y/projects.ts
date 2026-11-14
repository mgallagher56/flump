import { devices, type PlaywrightTestOptions } from "@playwright/test";

export type A11yCheck = "axe" | "focus" | "reflow" | "lang" | "render";

export interface A11yProject {
  name: string;
  use: Partial<PlaywrightTestOptions> & { viewport: { width: number; height: number } };
  /** Which checks run in this project; each route gets one test per project. */
  checks: readonly A11yCheck[];
}

const MOBILE = { width: 375, height: 812 };
const DESKTOP = { width: 1280, height: 900 };
/** WCAG 1.4.10: content reflows at 320 CSS px wide without horizontal scrolling. */
const REFLOW = { width: 320, height: 720 };

const shared = {
  ...devices["Desktop Chrome"],
  deviceScaleFactor: 1,
  locale: "en-GB",
  timezoneId: "Europe/London",
  reducedMotion: "reduce" as const,
};

/**
 * The language tag is the same in every project, so it is checked once (1280 light) rather
 * than six times. Reflow has its own 320 px project; forced colours its own 1280 project.
 */
export const A11Y_PROJECTS: readonly A11yProject[] = [
  {
    name: "375-light",
    use: { ...shared, viewport: MOBILE, colorScheme: "light" },
    checks: ["axe", "focus"],
  },
  {
    name: "375-dark",
    use: { ...shared, viewport: MOBILE, colorScheme: "dark" },
    checks: ["axe", "focus"],
  },
  {
    name: "1280-light",
    use: { ...shared, viewport: DESKTOP, colorScheme: "light" },
    checks: ["axe", "focus", "lang"],
  },
  {
    name: "1280-dark",
    use: { ...shared, viewport: DESKTOP, colorScheme: "dark" },
    checks: ["axe", "focus"],
  },
  {
    name: "320-reflow",
    use: { ...shared, viewport: REFLOW, colorScheme: "light" },
    checks: ["reflow"],
  },
  {
    name: "1280-forced-colours",
    use: { ...shared, viewport: DESKTOP, colorScheme: "light", forcedColors: "active" },
    checks: ["render", "axe", "focus"],
  },
];
