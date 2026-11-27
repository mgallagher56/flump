import { afterEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { orbScanFiles, runOrbColourCheck } from "./check-orb-colours";
import { findOrbColourUses, isOrbColourAllowed, ORB_COLOUR_ALLOW_LIST } from "./lib/orbColours";

// Token names are built at runtime so this file never reads as a use itself.
const VR = ["orb", "violetRose"].join(".");
const TINT = ["surface", "tint"].join(".");

describe("findOrbColourUses (STYLE-GUIDE 2.7 MC1)", () => {
  it.each([
    [`css({ bg: "${VR}.core" })`, `${VR}.core`],
    [`css({ bg: "${VR}" })`, VR],
    [`css({ bg: "${TINT}.violet" })`, `${TINT}.violet`],
    [`css({ bg: "${TINT}.rose" })`, `${TINT}.rose`],
    [`css({ color: "chart.series4" })`, "chart.series4"],
    [`css({ color: "chart.series5" })`, "chart.series5"],
    [`css({ color: "chart.accentPurple" })`, "chart.accentPurple"],
    [`css({ color: "${["purple", "500"].join(".")}" })`, ["purple", "500"].join(".")],
    [`css({ color: "${["dark", "pink"].join(".")}" })`, ["dark", "pink"].join(".")],
    [`theme.colors["${VR}.rim"]`, `${VR}.rim`],
    [`box-shadow: 0 0 0 1px var(--colors-orb-violet-rose-rim);`, "--colors-orb-violet-rose-rim"],
    [`color: var(--colors-surface-tint-rose);`, "--colors-surface-tint-rose"],
    [`badge: "var(--colors-chart-accent-purple)"`, "--colors-chart-accent-purple"],
    [`fill: var(--colors-chart-series4)`, "--colors-chart-series4"],
    [`chartColor("series5")`, `"series5"`],
    ["chartColor('accentPurple')", "'accentPurple'"],
  ])("finds %s", (source, use) => {
    expect(findOrbColourUses(source)).toEqual([use]);
  });

  it.each([
    [`css({ bg: "orb.skyTeal.core" })`, "the sky and teal set"],
    [`css({ bg: "${TINT}.teal" })`, "another tint"],
    [`css({ color: "chart.series1" })`, "another series"],
    [`css({ color: "chart.series45" })`, "a longer series name"],
    [`chartColor("series6")`, "another role"],
    [`const tone = "violet";`, "the word alone, as IconTile's tone names"],
    [`// uses ${VR}.core on the orb`, "a line comment"],
    [`/* ${TINT}.rose */ const a = 1;`, "a block comment"],
    [`css({ bg: "myorb.violetRose" })`, "a longer identifier"],
    [`const url = "https://x.test/${VR}";`, "inside a URL path"],
  ])("ignores %s (%s)", (source) => {
    expect(findOrbColourUses(source)).toEqual([]);
  });

  it("counts every use in a file, in order", () => {
    expect(
      findOrbColourUses(
        `a("${VR}.core"); b("chart.series5"); c(var(--colors-surface-tint-violet))`,
      ),
    ).toEqual([`${VR}.core`, "chart.series5", "--colors-surface-tint-violet"]);
  });
});

describe("ORB_COLOUR_ALLOW_LIST", () => {
  it("names each entry with a reason", () => {
    for (const { path, reason } of ORB_COLOUR_ALLOW_LIST) {
      expect(path, path).toMatch(/^(?:apps\/(?:marketing|web|mobile)|packages\/ui)\//);
      expect(reason.length, path).toBeGreaterThan(30);
    }
  });

  it("starts with exactly the five entries main needed on 27 Nov 2026 (a new one needs sign-off)", () => {
    expect(ORB_COLOUR_ALLOW_LIST.map((e) => e.path)).toEqual([
      "packages/ui/src/primitives/IconTile/",
      "apps/web/app/features/dashboard/components/WidgetCard/",
      "packages/ui/src/charts/chartColor.ts",
      "apps/web/app/utils/pageConfig.ts",
      "packages/ui/src/foundations/MarketingTokens/",
    ]);
  });

  it("matches by path prefix, so a component's styles file is covered and a sibling is not", () => {
    expect(isOrbColourAllowed("packages/ui/src/primitives/IconTile/IconTile.styles.ts")).toBe(true);
    expect(isOrbColourAllowed("packages/ui/src/primitives/IconTileGroup/x.ts")).toBe(false);
    expect(isOrbColourAllowed("packages/ui/src/charts/chartColor.ts")).toBe(true);
    expect(isOrbColourAllowed("packages/ui/src/charts/chartTheme.ts")).toBe(false);
  });
});

describe("runOrbColourCheck on a scratch repository", () => {
  let root = "";
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  const repo = (files: Record<string, string>) => {
    root = mkdtempSync(join(tmpdir(), "orb-colours-"));
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), body);
    }
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["add", "-A"], { cwd: root });
    return root;
  };

  // Every allow-listed path must exist, or the check reports it as stale.
  const allowed = Object.fromEntries(
    ORB_COLOUR_ALLOW_LIST.map(({ path }) => [
      path.endsWith("/") ? `${path}index.ts` : path,
      "export {};\n",
    ]),
  );

  it("passes when violet and rose stay in allowed files", () => {
    const dir = repo({
      ...allowed,
      "packages/ui/src/primitives/IconTile/IconTile.styles.ts": `css({ bg: "${TINT}.violet" })`,
      "apps/marketing/src/pages/Home/Home.styles.ts": `css({ bg: "orb.skyTeal.bubble" })`,
    });
    expect(runOrbColourCheck(dir)).toEqual([]);
  });

  it("fails a violet or rose use in each scanned area, CSS included", () => {
    const dir = repo({
      ...allowed,
      "apps/marketing/src/components/Band/Band.styles.ts": `css({ bg: "${VR}.bubble" })`,
      "apps/marketing/src/index.css": "a { color: var(--colors-surface-tint-rose); }",
      "apps/web/app/features/x/X.tsx": `<div className={css({ color: "chart.series5" })} />`,
      "apps/mobile/src/components/Y/Y.styles.ts": `theme.colors["${VR}.core"]`,
      "packages/ui/src/patterns/Z/Z.styles.ts": `css({ bg: "${TINT}.violet" })`,
    });
    expect(runOrbColourCheck(dir)).toEqual([
      "apps/marketing/src/components/Band/Band.styles.ts: orb.violetRose.bubble",
      "apps/marketing/src/index.css: --colors-surface-tint-rose",
      "apps/mobile/src/components/Y/Y.styles.ts: orb.violetRose.core",
      "apps/web/app/features/x/X.tsx: chart.series5",
      "packages/ui/src/patterns/Z/Z.styles.ts: surface.tint.violet",
    ]);
  });

  it("does not scan tests, stories, generated Panda output or untracked files", () => {
    const dir = repo({
      ...allowed,
      "packages/ui/src/patterns/Z/Z.test.tsx": `"${VR}.core"`,
      "packages/ui/src/patterns/Z/Z.stories.tsx": `"${VR}.core"`,
      "apps/marketing/styled-system/tokens/index.js": `"${VR}.core"`,
    });
    writeFileSync(join(dir, "packages/ui/src/patterns/Z/Untracked.ts"), `"${VR}.core"`);
    expect(orbScanFiles(dir)).not.toContain("packages/ui/src/patterns/Z/Z.test.tsx");
    expect(runOrbColourCheck(dir)).toEqual([]);
  });

  it("reports an allow-list entry whose path is gone", () => {
    const { "apps/web/app/utils/pageConfig.ts": _gone, ...rest } = allowed;
    const dir = repo(rest);
    expect(runOrbColourCheck(dir)).toEqual([
      "STALE allow-list entry, no such path: apps/web/app/utils/pageConfig.ts",
    ]);
  });
});
