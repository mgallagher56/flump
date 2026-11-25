import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkBundle,
  checkSourceMap,
  DEV_ONLY_MARKERS,
  FIXTURE_MARKERS,
  findBundles,
  PRODUCTION_MARKER,
  packagesBundledTwice,
} from "./check-mobile-bundle";

const bundle = (text: string) => Buffer.from(`\u0000HBC${text}\u0000`, "latin1");

describe("checkBundle", () => {
  test("passes a bundle with the tagline and no dev-only text", () => {
    expect(checkBundle("a.hbc", bundle(`x ${PRODUCTION_MARKER} y`))).toEqual([]);
  });

  test.each(DEV_ONLY_MARKERS)("fails a bundle that contains %p", (marker) => {
    expect(checkBundle("a.hbc", bundle(`${PRODUCTION_MARKER} ${marker}`))).toEqual([
      { file: "a.hbc", problem: `contains development-only text "${marker}"` },
    ]);
  });

  test.each(FIXTURE_MARKERS)("fails a bundle that contains the e2e fixture marker %p", (marker) => {
    expect(checkBundle("a.hbc", bundle(`${PRODUCTION_MARKER} http://${marker}/v1`))).toEqual([
      { file: "a.hbc", problem: `contains e2e fixture text "${marker}"` },
    ]);
  });

  test("names the fixture address and the control route prefix", () => {
    expect([...FIXTURE_MARKERS]).toEqual(["10.0.2.2:8787", "__fixture"]);
  });

  test("fails a bundle without the tagline, so an empty or unreadable file cannot pass", () => {
    expect(checkBundle("a.hbc", bundle("nothing here"))).toEqual([
      { file: "a.hbc", problem: `does not contain "${PRODUCTION_MARKER}"` },
    ]);
  });
});

describe("findBundles", () => {
  test("finds each platform's bundle and reports a missing platform as empty", () => {
    const dist = mkdtempSync(join(tmpdir(), "mobile-dist-"));
    mkdirSync(join(dist, "_expo/static/js/ios"), { recursive: true });
    writeFileSync(join(dist, "_expo/static/js/ios/entry-abc.hbc"), "x");
    writeFileSync(join(dist, "_expo/static/js/ios/entry-abc.hbc.map"), "x");
    expect(findBundles(dist)).toEqual([
      { platform: "ios", files: [join(dist, "_expo/static/js/ios/entry-abc.hbc")] },
      { platform: "android", files: [] },
    ]);
  });
});

describe("source map check (one copy of each package)", () => {
  const one = "/node_modules/.bun/expo@58.0.26+aaa/node_modules/expo/build/Expo.js";
  const sameInstall = "/node_modules/.bun/expo@58.0.26+aaa/node_modules/expo/virtual/streams.js";
  const otherInstall = "/node_modules/.bun/expo@58.0.26+bbb/node_modules/expo/build/Expo.js";
  const scoped = "/node_modules/.bun/@expo+log-box@58.0.15+ccc/node_modules/@expo/log-box/index.js";

  test("one install per package passes", () => {
    const map = JSON.stringify({
      sources: [one, sameInstall, scoped, "/apps/mobile/app/index.tsx"],
    });
    expect(checkSourceMap("a.hbc", map)).toEqual([]);
  });

  test("the same package from two installs fails, even at the same version", () => {
    expect(packagesBundledTwice([one, otherInstall, scoped])).toEqual(
      new Map([["expo", [".bun/expo@58.0.26+aaa", ".bun/expo@58.0.26+bbb"]]]),
    );
    expect(checkSourceMap("a.hbc", JSON.stringify({ sources: [one, otherInstall] }))).toEqual([
      {
        file: "a.hbc",
        problem:
          "bundles expo from more than one install: .bun/expo@58.0.26+aaa, .bun/expo@58.0.26+bbb",
      },
    ]);
  });

  test("a missing, broken or empty source map fails rather than passing", () => {
    expect(checkSourceMap("a.hbc", undefined)[0]?.problem).toBe("has no source map next to it");
    expect(checkSourceMap("a.hbc", "{")[0]?.problem).toBe(
      "has a source map that is not valid JSON",
    );
    expect(
      checkSourceMap("a.hbc", JSON.stringify({ sources: ["/apps/mobile/a.ts"] }))[0]?.problem,
    ).toBe("has a source map that lists no installed package");
  });

  test("a copy outside the Bun store still counts as a second install", () => {
    expect(packagesBundledTwice([one, "/apps/mobile/node_modules/expo/build/Expo.js"])).toEqual(
      new Map([["expo", [".bun/expo@58.0.26+aaa", "/apps/mobile/node_modules/expo"]]]),
    );
  });

  test("a workspace package bundled from both src and dist fails", () => {
    expect(
      packagesBundledTwice([
        "/packages/tokens/dist/native.generated.js",
        "/packages/tokens/src/native.generated.ts",
      ]),
    ).toEqual(new Map([["workspace:tokens", ["packages/tokens/dist", "packages/tokens/src"]]]));
  });

  test("the app's own files and Metro's shims are not packages", () => {
    expect(
      packagesBundledTwice(["/apps/mobile/app/index.tsx", "\u0000shim:HMRClientProdShim.js"]),
    ).toEqual(new Map());
  });
});
