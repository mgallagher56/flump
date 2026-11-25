import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkBundle,
  DEV_ONLY_MARKERS,
  findBundles,
  PRODUCTION_MARKER,
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
