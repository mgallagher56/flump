// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  type BuildManifest,
  entryKey,
  pageFiles,
  pageLazyFiles,
  pagePreloadLinks,
  staticClosure,
} from "./pageChunks";

// A small build as Vite's manifest describes it: the entry loads every page by dynamic import;
// home and pricing share a card chunk; home loads GSAP later, and GSAP shares the card chunk too.
const MANIFEST: BuildManifest = {
  "index.html": {
    file: "assets/index.js",
    isEntry: true,
    imports: ["_react.js"],
    dynamicImports: ["src/pages/HomePage/index.ts", "src/pages/PricingPage/index.ts"],
  },
  "_react.js": { file: "assets/react.js" },
  "src/pages/HomePage/index.ts": {
    file: "assets/HomePage.js",
    imports: ["index.html", "_Card.js"],
    dynamicImports: ["src/motion/gsapKit.ts"],
  },
  "src/pages/PricingPage/index.ts": { file: "assets/PricingPage.js", imports: ["_Card.js"] },
  "_Card.js": { file: "assets/Card.js", imports: ["_react.js"] },
  "src/motion/gsapKit.ts": { file: "assets/gsapKit.js", imports: ["_Card.js", "_gsap.js"] },
  "_gsap.js": { file: "assets/gsap.js" },
};

describe("pageChunks", () => {
  it("finds the one entry", () => {
    expect(entryKey(MANIFEST)).toBe("index.html");
  });

  it("lists a chunk's static imports before the chunk, each once", () => {
    expect(staticClosure(MANIFEST, "_Card.js")).toEqual(["assets/react.js", "assets/Card.js"]);
  });

  it("gives a page its own files, less what the entry already loads", () => {
    expect(pageFiles(MANIFEST, "src/pages/HomePage/index.ts")).toEqual([
      "assets/Card.js",
      "assets/HomePage.js",
    ]);
  });

  it("counts as lazy only what the page imports later, never another page's chunk", () => {
    expect(pageLazyFiles(MANIFEST, "src/pages/HomePage/index.ts")).toEqual([
      "assets/gsap.js",
      "assets/gsapKit.js",
    ]);
    expect(pageLazyFiles(MANIFEST, "src/pages/PricingPage/index.ts")).toEqual([]);
  });

  it("preloads a page's own scripts, and nothing for a page the build does not know", () => {
    expect(pagePreloadLinks(MANIFEST, "src/pages/PricingPage/index.ts")).toBe(
      '<link rel="modulepreload" crossorigin href="/assets/Card.js"><link rel="modulepreload" crossorigin href="/assets/PricingPage.js">',
    );
    expect(pagePreloadLinks(MANIFEST, "src/pages/Missing/index.ts")).toBe("");
  });

  it("refuses a manifest that names a chunk it does not hold", () => {
    expect(() => staticClosure({ a: { file: "a.js", imports: ["gone"] } }, "a")).toThrow(
      "The build manifest has no chunk gone",
    );
  });
});
