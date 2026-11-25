import { describe, expect, test } from "bun:test";
import { DUPLICATE_CHECK, duplicateVersions, failedChecks, judge } from "./run-expo-doctor";

// Shaped like expo-doctor 1.21.8's real output on apps/mobile (25 November 2026), trimmed.
const duplicates = (secondVersion: string) => `Running 20 checks on your project...
19/20 checks passed. 1 checks failed. Possible issues detected:

✖ ${DUPLICATE_CHECK}
Found duplicates for expo:
  ├─ expo@58.0.26 (at: node_modules/expo)
  │  └─ linked to: ../../node_modules/.bun/expo@58.0.26+a/node_modules/expo
  └─ expo@${secondVersion} (at: ../../node_modules/.bun/expo-router@58.0.32+b/node_modules/expo)
     └─ linked to a different installation
Found duplicates for expo-linking:
  ├─ expo-linking@58.0.17 (at: node_modules/expo-linking)
  └─ expo-linking@58.0.17 (at: ../../node_modules/.bun/expo-router@58.0.32+b/node_modules/expo-linking)
1 checks failed, indicating possible issues with the project.
`;

describe("expo-doctor output parsing", () => {
  test("finds the failed check names", () => {
    expect(failedChecks(duplicates("58.0.26"))).toEqual([DUPLICATE_CHECK]);
  });

  test("reads the versions under each duplicate, not the 'linked to' lines", () => {
    expect(Object.fromEntries(duplicateVersions(duplicates("58.0.26")))).toEqual({
      expo: ["58.0.26", "58.0.26"],
      "expo-linking": ["58.0.17", "58.0.17"],
    });
  });
});

describe("judge", () => {
  test("a clean run passes", () => {
    expect(judge("20/20 checks passed.", 0)).toEqual({ ok: true, reasons: [] });
  });

  test("same-version duplicates from the isolated linker pass", () => {
    expect(judge(duplicates("58.0.26"), 1)).toEqual({ ok: true, reasons: [] });
  });

  test("a duplicate at a different version fails", () => {
    expect(judge(duplicates("58.0.25"), 1)).toEqual({
      ok: false,
      reasons: ["expo is installed at more than one version: 58.0.26, 58.0.25"],
    });
  });

  test("any other failed check fails", () => {
    const output = `✖ Check that packages match versions required by installed Expo SDK\n`;
    expect(judge(output, 1)).toEqual({
      ok: false,
      reasons: ["failed check: Check that packages match versions required by installed Expo SDK"],
    });
  });

  test("a failing exit that names no check fails rather than passing silently", () => {
    expect(judge("Error: cannot read config", 1).ok).toBe(false);
  });

  test("a duplicate check that lists no package fails", () => {
    expect(judge(`✖ ${DUPLICATE_CHECK}\n`, 1)).toEqual({
      ok: false,
      reasons: ["duplicate check failed but listed no package"],
    });
  });
});
