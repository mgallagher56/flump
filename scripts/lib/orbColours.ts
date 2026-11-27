// The orb-only colour check (STYLE-GUIDE 2.7 rule MC1, UX-GUIDELINES MK5; owner, 27 Nov 2026):
// mint leads, and violet and rose appear only on orb-like elements (the orb, its bead track and
// the bubble fields). Any use of a violet or rose token outside the allow-list below fails. There
// is no baseline: each file that may use one is named here with its reason, and an entry needs
// sign-off (AGENTS.md section 15).
//
// A "use" is the token's name in any of the forms the code base writes it:
// - a Panda or native token path: `orb.violetRose.core`, `surface.tint.rose`, `chart.series5`,
//   `chart.accentPurple`, `logo.violet`, `logo.rose`, the purple primitive scale and the dark pink
//   primitive (also inside `token(...)` and `{colors...}`);
// - the same names as CSS variables (`--colors-orb-violet-rose-core`, `--colors-chart-series4`,
//   `--colors-chart-accent-purple` and so on);
// - a chart colour role passed as a string: `"series4"`, `"series5"`, `"accentPurple"` (the roles
//   `chartColor` turns into the chart tokens).
// - the purple primitive scale as a whole (`colors.purple`).
// Not seen, so review catches them: a name built at run time (`surface.tint.${tone}`, as
// `sectionColours.ts` does for the area map) and a series picked by index (`seriesColor(4)`, as
// the budget chart does). Both are allowed uses under MC1 today (the area map; chart series).
// Out of scope: the accent, which is the soft pink in dark (STYLE-GUIDE 2.6, rules C7 and C8).

const VIOLET_ROSE_TOKEN = new RegExp(
  [
    // Token paths. The lookbehind keeps `xorb.` or `mydark.pink` from matching.
    String.raw`(?<![\w$/-])orb\.violetRose(?:\.\w+)?\b`,
    String.raw`(?<![\w$/-])surface\.tint\.(?:violet|rose)\b`,
    String.raw`(?<![\w$/-])chart\.(?:series[45]|accentPurple)\b`,
    String.raw`(?<![\w$/-])purple\.\d+\b`,
    String.raw`(?<![\w$/-])colors\.purple\b`,
    String.raw`(?<![\w$/-])dark\.pink\b`,
    String.raw`(?<![\w$/-])logo\.(?:violet|rose)\b`,
    // CSS variables.
    String.raw`--colors-(?:orb-violet-rose[\w-]*|surface-tint-(?:violet|rose)|chart-(?:series[45]|accent-purple)|purple-\d+|dark-pink|logo-(?:violet|rose))\b`,
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
  {
    path: "packages/ui/src/foundations/ColorPalette/",
    reason: "the Storybook colour page, which shows every primitive scale, purple among them",
  },
  {
    path: "apps/marketing/src/components/BubbleField/",
    reason:
      "the home page's bubble fields (M1): soft spheres in the two orb sets behind a band's content, the orb-like element MC1 names",
  },
  {
    path: "apps/marketing/src/components/GlassOrb/",
    reason:
      "the still glass orb in the four orb colours (the journey's still layer, MK11) and the small orb dot beside each journey stop's \"N of 6\" (prototype 11, coordinator 27 Nov 2026); the three.js scene reads the orb colours back from these orbs and writes no colour of its own",
  },
  {
    path: "apps/marketing/src/components/HomeRoughFigures/HomeRoughFigures.styles.ts",
    reason:
      "the rough figures steps' second and third circles wear a soft violet or rose halo, prototype 11's orb colours on round objects only (coordinator, 27 Nov 2026: build prototype 11's version; owner to confirm)",
  },
  {
    path: "apps/marketing/src/components/DrawnLineChart/DrawnLineChart.styles.ts",
    reason:
      "the journey's sample line chart in prototype 11's two tones: savings sky, debt violet (chart.series4), never rose (coordinator, 27 Nov 2026: build prototype 11's version; MK6 and MC2 conflict listed for the owner)",
  },
  {
    path: "apps/marketing/src/components/JourneySample/JourneySample.styles.ts",
    reason:
      "the picture sample's net worth tile wears prototype 11's faint violet wash (chart.series4 at 18%) beside the sky one (coordinator, 27 Nov 2026: build prototype 11's version; MC1 conflict listed for the owner)",
  },
  {
    path: "packages/ui/src/primitives/Illustration/Illustration.styles.ts",
    reason:
      "the document pictures' opt-in orb look (palette=\"orb\", marketing home page only): prototype 11's violet and rose on the pension mark and rule, the ticket's top band, the check-in tab's edge and one not-found tab (coordinator, 27 Nov 2026: build prototype 11's pictures; owner to confirm). The default look never reads these classes (Illustration.test.tsx)",
  },
  {
    path: "packages/ui/src/primitives/FlumpLogo/",
    reason:
      "the logo K2 (owner, 27 Nov 2026): three glass bubbles, violet lit by rose, sky and teal lit by violet; an orb-like element in the logo.* tokens",
  },
  {
    path: "apps/mobile/src/components/FlumpLogo/",
    reason:
      "the mobile logo: the same K2 drawing as packages/ui FlumpLogo, in the native logo.* tokens",
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
