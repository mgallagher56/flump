import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gzipSync } from "node:zlib";
import {
  BASELINE_FILE,
  compareWeights,
  firstLoadAssets,
  loweredBaseline,
  measureClientBuild,
  type WeightBaseline,
} from "./check-marketing-weight";

describe("firstLoadAssets", () => {
  it("reads the module entry, modulepreloads and stylesheets, and leaves the rest", () => {
    const html = `<!doctype html><head>
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <script data-flump-theme>/* inline */</script>
      <script type="module" crossorigin src="/assets/index-abc.js"></script>
      <link rel="modulepreload" crossorigin href="/assets/vendor-def.js">
      <link rel="stylesheet" crossorigin href="/assets/index-ghi.css?v=1">
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
  it("records the plan's budgets: 25 KB script, 25 KB CSS, 230 KB lazy (ROLLOUT-PLAN section 2)", () => {
    const committed = JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as WeightBaseline;
    expect(committed.budget).toEqual({
      firstLoadJsGzip: 25_000,
      cssGzip: 25_000,
      lazyJsGzip: 230_000,
    });
    for (const value of Object.values(committed.baseline)) {
      expect(Number.isInteger(value) && value >= 0).toBe(true);
    }
  });
});
