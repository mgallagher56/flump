// The orb-only colour check (STYLE-GUIDE 2.7 rule MC1, UX-GUIDELINES MK5; owner, 27 Nov 2026):
// mint leads, and violet and rose appear only on orb-like elements (the orb, its bead track and
// the bubble fields). Any use of a violet or rose token outside the allow-list below fails. There
// is no baseline: each file that may use one is named here with its reason, and an entry needs
// sign-off (AGENTS.md section 15).
//
// A "use" is the token's name in any of the forms the code base writes it:
// - a Panda or native token path: `orb.violetRose.core`, `surface.tint.rose`, `chart.series5`,
//   `chart.accentPurple`, the purple primitive scale and the dark pink primitive (also inside
//   `token(...)` and `{colors...}`);
// - the same names as CSS variables (`--colors-orb-violet-rose-core`, `--colors-chart-series4`,
//   `--colors-chart-accent-purple` and so on);
// - a chart colour role passed as a string: `"series4"`, `"series5"`, `"accentPurple"` (the roles
//   `chartColor` turns into the chart tokens).
// A name built at run time (`surface.tint.${tone}`) is not seen; review catches those.

const VIOLET_ROSE_TOKEN = new RegExp(
  [
    // Token paths. The lookbehind keeps `xorb.` or `mydark.pink` from matching.
    String.raw`(?<![\w$/-])orb\.violetRose(?:\.\w+)?\b`,
    String.raw`(?<![\w$/-])surface\.tint\.(?:violet|rose)\b`,
    String.raw`(?<![\w$/-])chart\.(?:series[45]|accentPurple)\b`,
    String.raw`(?<![\w$/-])purple\.\d+\b`,
    String.raw`(?<![\w$/-])dark\.pink\b`,
    // CSS variables.
    String.raw`--colors-(?:orb-violet-rose[\w-]*|surface-tint-(?:violet|rose)|chart-(?:series[45]|accent-purple)|purple-\d+|dark-pink)\b`,
    // Chart roles as string literals.
    String.raw`["'\x60](?:series[45]|accentPurple)["'\x60]`,
  ].join("|"),
  "g",
);

/**
 * Files that may use a violet or rose token. Matched as path prefixes, so a directory entry covers
 * a component's `.tsx` and `.styles.ts`. Today's entries are what `main` already did on
 * 27 Nov 2026; each says why. Orb-like components (the orb, bubble fields, bead track) join as
 * slices F3 and M1 to M2 build them.
 */
export const ORB_COLOUR_ALLOW_LIST: ReadonlyArray<{ path: string; reason: string }> = [
  {
    path: "packages/ui/src/primitives/IconTile/",
    reason:
      "area icon tiles: self assessment and tax are violet, budget and pay rose (STYLE-GUIDE 2.4 area map; MC1 keeps the tints on tiles)",
  },
  {
    path: "apps/web/app/features/dashboard/components/WidgetCard/",
    reason:
      "the home section card's top edge in its area colour, the same map as the tiles (STYLE-GUIDE 2.4: tiles, headers and card edges follow it)",
  },
  {
    path: "packages/ui/src/charts/chartColor.ts",
    reason:
      "the chart palette: maps chart roles, series4 and series5 among them, to the chart tokens for every chart (STYLE-GUIDE 10)",
  },
  {
    path: "apps/web/app/utils/pageConfig.ts",
    reason:
      "the pension and retirement badge colour (chart.accentPurple) in the page list; no component reads badgeColor today (follow-up: drop it or move it to the area map)",
  },
  {
    path: "packages/ui/src/foundations/MarketingTokens/",
    reason: "the Storybook page that documents the orb colour sets in light and dark",
  },
];

export function isOrbColourAllowed(relPath: string): boolean {
  return ORB_COLOUR_ALLOW_LIST.some(({ path }) => relPath.startsWith(path));
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** The violet or rose token names used in a source file, comments left out, in order. */
export function findOrbColourUses(source: string): string[] {
  return stripComments(source).match(VIOLET_ROSE_TOKEN) ?? [];
}
