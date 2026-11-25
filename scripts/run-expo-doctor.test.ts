import { describe, expect, test } from "bun:test";
import {
  DUPLICATE_CHECK,
  duplicateVersions,
  failedChecks,
  failedCount,
  judge,
} from "./run-expo-doctor";

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
  const otherCheck = "Check that packages match versions required by installed Expo SDK";

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
    const output = `19/20 checks passed. 1 checks failed. Possible issues detected:\n\u2716 ${otherCheck}\n`;
    expect(judge(output, 1)).toEqual({ ok: false, reasons: [`failed check: ${otherCheck}`] });
  });

  test("the duplicate check alongside another failed check fails", () => {
    const output = duplicates("58.0.26")
      .replace("19/20 checks passed. 1 checks failed.", "18/20 checks passed. 2 checks failed.")
      .replace(`\u2716 ${DUPLICATE_CHECK}`, `\u2716 ${otherCheck}\n\u2716 ${DUPLICATE_CHECK}`);
    expect(judge(output, 1)).toEqual({ ok: false, reasons: [`failed check: ${otherCheck}`] });
  });

  test("a summary that counts more failures than it names fails", () => {
    const output = duplicates("58.0.26").replace(
      "19/20 checks passed. 1 checks failed.",
      "18/20 checks passed. 2 checks failed.",
    );
    expect(judge(output, 1)).toEqual({
      ok: false,
      reasons: ["the summary says 2 check(s) failed but 1 could be read"],
    });
  });

  test("a duplicate entry in a format the parser does not know fails", () => {
    const output = duplicates("58.0.26").replace(
      "Found duplicates for expo-linking:",
      "Found duplicates for expo-font:\n  - expo-font 58.0.12\nFound duplicates for expo-linking:",
    );
    expect(judge(output, 1)).toEqual({
      ok: false,
      reasons: ["a duplicate entry could not be read"],
    });
  });

  test("unparseable output on a failing exit fails rather than passing silently", () => {
    expect(judge("Error: cannot read config", 1)).toEqual({
      ok: false,
      reasons: ["expo-doctor exited with 1; its summary could not be read"],
    });
  });

  test("a duplicate check that lists no package fails", () => {
    const output = `19/20 checks passed. 1 checks failed.\n\u2716 ${DUPLICATE_CHECK}\n`;
    expect(judge(output, 1)).toEqual({
      ok: false,
      reasons: ["duplicate check failed but listed no package"],
    });
  });

  test("failedCount reads the summary and rejects one that does not add up", () => {
    expect(failedCount("19/20 checks passed. 1 checks failed. Possible issues")).toBe(1);
    expect(failedCount("19/20 checks passed. 2 checks failed.")).toBeUndefined();
    expect(failedCount("no summary")).toBeUndefined();
  });

  test("an entry line in another format cannot hide a version split", () => {
    const output = duplicates("58.0.26").replace(
      "     \u2514\u2500 linked to a different installation",
      "     \u2514\u2500 linked to a different installation\n  \u2514\u2500 expo@58.0.25 (linked to ../x)",
    );
    expect(judge(output, 1)).toEqual({
      ok: false,
      reasons: ["a duplicate entry could not be read"],
    });
  });
});
