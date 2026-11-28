import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import { PAGE_NAMES } from "../apps/marketing/src/pageSet";
import {
  BASELINE_FILE,
  chunksShared,
  compareWeights,
  firstLoadAssets,
  loweredBaseline,
  measureClientBuild,
  NO_SCENE_PAGES,
  reachableHolding,
  THREE_MARKER,
  type WeightBaseline,
  type WeightFile,
} from "./check-marketing-weight";

describe("firstLoadAssets", () => {
  it("reads the module entry, modulepreloads and stylesheets, and leaves the rest", () => {
    const html = `<!doctype html><head>
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <script data-flump-theme>/* inline */</script>
      <script type="module" data-src="/assets/decoy.js" src="/assets/index-abc.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/vendor-def.js">
      <link rel="stylesheet" data-href="/assets/decoy.css" href="/assets/index-ghi.css?v=1">
      <link rel="preload" as="font" href="/assets/inter.woff2">
      <script src="https://example.com/analytics.js"></script>
    </head>`;
    expect(firstLoadAssets(html)).toEqual({
      scripts: ["assets/index-abc.js", "assets/vendor-def.js"],
      styles: ["assets/index-ghi.css"],
    });
  });
});

describe("measureClientBuild", () => {
  let dir = "";
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = "";
  });

  function build(files: Record<string, string>): string {
    dir = mkdtempSync(join(tmpdir(), "marketing-weight-"));
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), text);
    }
    return dir;
  }
  const gz = (text: string) => gzipSync(text).length;

  it("sums first-load script, first-load CSS and the lazy chunks, each gzipped", () => {
    const entry = "console.log('entry');".repeat(40);
    const preload = "export const shared = 1;".repeat(30);
    const lazy = "export const scene = () => 'orb';".repeat(50);
    const lazyNested = "export const more = 2;";
    const css = ".a{color:red}".repeat(20);
    const root = build({
      "index.html": `<script type="module" src="/assets/index.js"></script><link rel="modulepreload" href="/assets/shared.js"><link rel="stylesheet" href="/assets/index.css">`,
      "assets/index.js": entry,
      "assets/shared.js": preload,
      "assets/scene.js": lazy,
      "assets/deep/more.mjs": lazyNested,
      "assets/index.css": css,
      "assets/font.woff2": "not counted",
    });
    expect(measureClientBuild(root)).toEqual({
      firstLoadJsGzip: gz(entry) + gz(preload),
      cssGzip: gz(css),
      lazyJsGzip: gz(lazy) + gz(lazyNested),
    });
  });

  it("with a build manifest, counts the home page's own chunks as first load and only what home imports later as lazy", () => {
    const entry = "console.log('entry');".repeat(40);
    const home = "export const home = 'hero';".repeat(30);
    const shared = "export const card = 1;".repeat(20);
    const motion = "export const gsap = () => 'tween';".repeat(50);
    const pricing = "export const price = 'later';".repeat(60);
    const css = ".a{color:red}".repeat(20);
    const manifest = {
      "index.html": {
        file: "assets/index.js",
        isEntry: true,
        dynamicImports: ["src/pages/HomePage/index.ts", "src/pages/PricingPage/index.ts"],
      },
      "src/pages/HomePage/index.ts": {
        file: "assets/HomePage.js",
        imports: ["_Card.js", "index.html"],
        dynamicImports: ["src/motion/gsap.ts"],
      },
      "src/pages/PricingPage/index.ts": { file: "assets/PricingPage.js", imports: ["_Card.js"] },
      "_Card.js": { file: "assets/Card.js" },
      "src/motion/gsap.ts": { file: "assets/gsap.js", imports: ["_Card.js"] },
    };
    const root = build({
      "index.html": `<script type="module" src="/assets/index.js"></script><link rel="stylesheet" href="/assets/index.css">`,
      ".vite/manifest.json": JSON.stringify(manifest),
      "assets/index.js": entry,
      "assets/HomePage.js": home,
      "assets/Card.js": shared,
      "assets/gsap.js": motion,
      "assets/PricingPage.js": pricing,
      "assets/index.css": css,
    });
    // First load: the entry, home's chunk and the shared card chunk it imports. Lazy: GSAP only
    // (its shared import is already loaded). The pricing page's chunk counts nowhere.
    expect(measureClientBuild(root)).toEqual({
      firstLoadJsGzip: gz(entry) + gz(home) + gz(shared),
      cssGzip: gz(css),
      lazyJsGzip: gz(motion),
    });
    // A named page: the pricing page's own chunk and the card, and nothing lazy; home's chunk and
    // GSAP count nowhere for it.
    expect(measureClientBuild(root, "PricingPage")).toEqual({
      firstLoadJsGzip: gz(entry) + gz(pricing) + gz(shared),
      cssGzip: gz(css),
      lazyJsGzip: 0,
    });
    expect(() => measureClientBuild(root, "AreaPage")).toThrow(
      "has no src/pages/AreaPage/index.ts",
    );
  });

  it("tells whether a page's chunks holding a text are all ones another page also loads", () => {
    const manifest = {
      "index.html": {
        file: "assets/index.js",
        isEntry: true,
        dynamicImports: ["src/pages/HomePage/index.ts", "src/pages/AreaPage/index.ts"],
      },
      "src/pages/HomePage/index.ts": { file: "assets/HomePage.js", imports: ["_Sample.js"] },
      "src/pages/AreaPage/index.ts": { file: "assets/AreaPage.js", imports: ["_Sample.js"] },
      "_Sample.js": { file: "assets/Sample.js" },
    };
    const files = {
      "index.html": `<script type="module" src="/assets/index.js"></script>`,
      ".vite/manifest.json": JSON.stringify(manifest),
      "assets/index.js": "entry",
      "assets/HomePage.js": "home",
      "assets/AreaPage.js": "area",
      "assets/Sample.js": "Estimated paid off",
    };
    expect(chunksShared(build(files), "AreaPage", "HomePage", "Estimated paid off")).toEqual({
      holding: ["assets/Sample.js"],
      ok: true,
    });
    rmSync(dir, { recursive: true, force: true });
    // The sample moved into the area page's own chunk: home never loads it.
    const own = build({
      ...files,
      "assets/AreaPage.js": "area Estimated paid off",
      "assets/Sample.js": "shared",
    });
    expect(chunksShared(own, "AreaPage", "HomePage", "Estimated paid off")).toEqual({
      holding: ["assets/AreaPage.js"],
      ok: false,
    });
    // No chunk holds it at all: not passed unseen.
    expect(chunksShared(own, "AreaPage", "HomePage", "not there").ok).toBe(false);
  });

  it("finds three.js wherever a page can reach it, at once or later, and nowhere it cannot", () => {
    const manifest = {
      "index.html": {
        file: "assets/index.js",
        isEntry: true,
        dynamicImports: ["src/pages/HomePage/index.ts", "src/pages/PricingPage/index.ts"],
      },
      "src/pages/HomePage/index.ts": { file: "assets/HomePage.js", dynamicImports: ["_scene.js"] },
      "src/pages/PricingPage/index.ts": { file: "assets/PricingPage.js", imports: ["_Orbs.js"] },
      "_Orbs.js": { file: "assets/Orbs.js" },
      "_scene.js": { file: "assets/scene.js" },
    };
    const files = {
      "index.html": `<script type="module" src="/assets/index.js"></script>`,
      ".vite/manifest.json": JSON.stringify(manifest),
      "assets/index.js": "entry",
      "assets/HomePage.js": "home",
      "assets/PricingPage.js": "pricing",
      "assets/Orbs.js": "still orbs",
      "assets/scene.js": `new ${THREE_MARKER}()`,
    };
    expect(reachableHolding(build(files), "HomePage", THREE_MARKER)).toEqual(["assets/scene.js"]);
    expect(reachableHolding(build(files), "PricingPage", THREE_MARKER)).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
    // The still orbs' chunk picks up a dynamic import of the scene: now pricing reaches it.
    const leaked = {
      ...manifest,
      "_Orbs.js": { file: "assets/Orbs.js", dynamicImports: ["_scene.js"] },
    };
    expect(
      reachableHolding(
        build({ ...files, ".vite/manifest.json": JSON.stringify(leaked) }),
        "PricingPage",
        THREE_MARKER,
      ),
    ).toEqual(["assets/scene.js"]);
  });

  it("names every page with no live scene: S0 and the legal pages, none of the scene pages", () => {
    expect([...NO_SCENE_PAGES].sort()).toEqual(
      PAGE_NAMES.filter(
        (page) => !["HomePage", "FeaturesIndexPage", "AreaPage", "AiConnectionPage"].includes(page),
      ).sort(),
    );
  });

  it("refuses a build whose index.html loads no script, or loads a missing file", () => {
    expect(() => measureClientBuild(build({ "index.html": "<p>empty</p>" }))).toThrow(
      "loads no script",
    );
    rmSync(dir, { recursive: true, force: true });
    expect(() =>
      measureClientBuild(
        build({ "index.html": `<script type="module" src="/assets/gone.js"></script>` }),
      ),
    ).toThrow("loads a missing file: assets/gone.js");
  });
});

describe("compareWeights and loweredBaseline", () => {
  const file: WeightBaseline = {
    baseline: { firstLoadJsGzip: 1000, cssGzip: 500, lazyJsGzip: 0 },
    budget: { firstLoadJsGzip: 100, cssGzip: 50, lazyJsGzip: 2000 },
  };

  it("passes at exactly the ceiling and fails one byte over, per measure", () => {
    const atCeiling = { firstLoadJsGzip: 1100, cssGzip: 550, lazyJsGzip: 2000 };
    expect(compareWeights(atCeiling, file).map((r) => [r.ceiling, r.ok])).toEqual([
      [1100, true],
      [550, true],
      [2000, true],
    ]);
    const over = { firstLoadJsGzip: 1101, cssGzip: 551, lazyJsGzip: 2001 };
    expect(compareWeights(over, file).map((r) => r.ok)).toEqual([false, false, false]);
  });

  it("only ever lowers a baseline", () => {
    expect(
      loweredBaseline({ firstLoadJsGzip: 900, cssGzip: 700, lazyJsGzip: 10 }, file.baseline),
    ).toEqual({ firstLoadJsGzip: 900, cssGzip: 500, lazyJsGzip: 0 });
  });
});

describe("the committed baseline file", () => {
  const committed = JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as WeightFile;
  const budget = (page: string) => committed.pages[page]?.budget;

  it("has one entry for every page, and no other", () => {
    expect(Object.keys(committed.pages).sort()).toEqual([...PAGE_NAMES].sort());
    for (const entry of Object.values(committed.pages)) {
      for (const value of [...Object.values(entry.baseline), ...Object.values(entry.budget)]) {
        expect(Number.isInteger(value) && value >= 0).toBe(true);
      }
    }
  });

  it("records the plans' budgets: home 25 KB script, 25 KB CSS, 230 KB lazy (ROLLOUT-PLAN section 2)", () => {
    expect(budget("HomePage")).toEqual({
      firstLoadJsGzip: 25_000,
      cssGzip: 25_000,
      lazyJsGzip: 230_000,
    });
  });

  it("records the per-family budgets of OTHER-PAGES-PLAN section 4", () => {
    const family = (first: number, lazy: number) => ({
      firstLoadJsGzip: first,
      cssGzip: 25_000,
      lazyJsGzip: lazy,
    });
    for (const page of ["FeaturesIndexPage", "AiConnectionPage"])
      expect(budget(page), page).toEqual(family(15_000, 230_000));
    // AreaPage only, signed by the coordinator on 27 Nov 2026: its set piece, the home journey's
    // sample, is server-rendered (MK1) and measured +27.3 KB over main.
    // Raised to 32 KB, signed by the coordinator on 28 Nov 2026: 1.2 KB more from splitting the hero
    // so the no-scene pages cannot reach three.js.
    expect(budget("AreaPage")).toEqual(family(32_000, 230_000));
    for (const page of ["PricingPage", "NotFoundPage"])
      expect(budget(page), page).toEqual(family(8_000, 80_000));
    // Re-set from measurement (MP3), signed by the coordinator on 28 Nov 2026: preview +10.3 KB,
    // security +14.8 KB (its document picture), contact +8.6 KB.
    expect(budget("PreviewPage")).toEqual(family(11_000, 80_000));
    expect(budget("SecurityPage")).toEqual(family(16_000, 80_000));
    expect(budget("ContactPage")).toEqual(family(10_000, 80_000));
    for (const page of ["PrivacyPage", "TermsPage", "CookiesPage", "AccessibilityPage"])
      expect(budget(page), page).toEqual(family(2_000, 0));
  });
});
