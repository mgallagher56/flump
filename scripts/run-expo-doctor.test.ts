import { describe, expect, test } from "bun:test";
import {
  DUPLICATE_CHECK,
  duplicateVersions,
  failedChecks,
  failedCount,
  judge,
  judgeSdkVersions,
  SDK_VERSION_CHECK,
  sdkMismatches,
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

// Shaped like expo-doctor 1.21.8's real output on CI run 45865530788 (26 November 2026, the day
// Expo 58.1.0 was published), trimmed to the SDK version check.
const sdkReport = (sections: string, total: number) => `Running 20 checks on your project...
19/20 checks passed. 1 checks failed. Possible issues detected:

\u2716 ${SDK_VERSION_CHECK}

${sections}
Changelogs:
- expo-crypto \u2192 https://github.com/expo/expo/blob/sdk-58/packages/expo-crypto/CHANGELOG.md
- expo-router \u2192 https://github.com/expo/expo/blob/sdk-58/packages/expo-router/CHANGELOG.md

${total} packages out of date.
Advice:
Use 'npx expo install --check' to review and upgrade your dependencies.
1 checks failed, indicating possible issues with the project.
`;
const MINOR = `\u26a0\ufe0f Minor version mismatches
package          expected  found
expo             ~58.1.0   58.0.26
`;
const PATCH = `\ud83d\udd27 Patch version mismatches
package          expected  found
expo-crypto      ~58.0.9   58.0.8
expo-router      ~58.0.33  58.0.32
`;
const fresh = sdkReport(`${MINOR}\n${PATCH}`, 3);
const NOW = new Date("2026-11-26T17:30:00Z");
const RELEASED = new Date("2026-11-26T16:26:37.609Z");
const times = (entries: Record<string, Date | null>) => new Map(Object.entries(entries));
const allFresh = times({
  "expo@58.1.0": RELEASED,
  "expo-crypto@58.0.9": RELEASED,
  "expo-router@58.0.33": RELEASED,
});

describe("the SDK version check's cooling-off", () => {
  test("reads the minor and patch rows", () => {
    expect(sdkMismatches(fresh)).toEqual({
      mismatches: [
        { name: "expo", recommended: "58.1.0", installed: "58.0.26" },
        { name: "expo-crypto", recommended: "58.0.9", installed: "58.0.8" },
        { name: "expo-router", recommended: "58.0.33", installed: "58.0.32" },
      ],
    });
  });

  test("a release under 7 days old passes, with a warning naming its date and when it is due", () => {
    const verdict = judge(fresh, 1, { published: allFresh, now: NOW });
    expect(verdict.ok).toBe(true);
    expect(verdict.reasons).toEqual([]);
    expect(verdict.warnings).toContain(
      "expo 58.1.0 (installed 58.0.26) was published on 2026-11-26; the bump is due on or after 2026-12-03",
    );
    expect(verdict.warnings).toHaveLength(3);
  });

  test("a release 7 days old fails", () => {
    const sevenDaysOn = new Date(RELEASED.getTime() + 7 * 24 * 60 * 60 * 1000);
    const verdict = judge(fresh, 1, { published: allFresh, now: sevenDaysOn });
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons).toHaveLength(3);
    expect(verdict.reasons[0]).toContain(
      "expo 58.1.0 (installed 58.0.26) was published on 2026-11-26, 7 or more days ago",
    );
  });

  test("one old release among fresh ones fails", () => {
    const published = times({
      "expo@58.1.0": RELEASED,
      "expo-crypto@58.0.9": new Date("2026-11-10T00:00:00Z"),
      "expo-router@58.0.33": RELEASED,
    });
    const verdict = judgeSdkVersions(fresh, published, NOW);
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons).toEqual([
      expect.stringContaining("expo-crypto 58.0.9 (installed 58.0.8) was published on 2026-11-10"),
    ]);
  });

  test("a fresh minor alongside a major mismatch fails", () => {
    const major = `\u2757 Major version mismatches
package          expected  found
react-native     ~0.89.0   0.88.2
`;
    const output = sdkReport(`${major}\n${MINOR}`, 2);
    expect(judge(output, 1, { published: allFresh, now: NOW })).toEqual({
      ok: false,
      reasons: ["expo-doctor reports major version mismatches"],
    });
  });

  test("a prerelease mismatch fails", () => {
    const other = `\u27bf Other/prerelease mismatches
package          expected  found
expo             ~58.1.0   58.1.0-canary
`;
    expect(judgeSdkVersions(sdkReport(other, 1), allFresh, NOW)).toEqual({
      ok: false,
      reasons: ["expo-doctor reports other/prerelease mismatches"],
    });
  });

  test("an installed version newer than the recommendation fails", () => {
    const output = sdkReport(MINOR.replace("~58.1.0   58.0.26", "~58.0.20  58.1.0"), 1);
    expect(judgeSdkVersions(output, allFresh, NOW)).toEqual({
      ok: false,
      reasons: ["expo 58.1.0 is newer than the SDK recommends (58.0.20)"],
    });
  });

  test("a publish date npm did not give fails", () => {
    const published = times({ ...Object.fromEntries(allFresh), "expo-router@58.0.33": null });
    expect(judgeSdkVersions(fresh, published, NOW)).toEqual({
      ok: false,
      reasons: ["npm gave no publish date for expo-router@58.0.33"],
    });
    const missing = times({ "expo@58.1.0": RELEASED });
    expect(judgeSdkVersions(fresh, missing, NOW).ok).toBe(false);
  });

  test("a table that does not add up to its total, or a row it cannot read, fails", () => {
    expect(judgeSdkVersions(sdkReport(`${MINOR}\n${PATCH}`, 4), allFresh, NOW).reasons).toEqual([
      "the SDK version check's rows do not add up to its total",
    ]);
    const odd = sdkReport(MINOR.replace("~58.1.0", ">=58.1.0"), 1);
    expect(judgeSdkVersions(odd, allFresh, NOW).ok).toBe(false);
  });

  test("without publish times the SDK check fails like any other", () => {
    expect(judge(fresh, 1)).toEqual({ ok: false, reasons: [`failed check: ${SDK_VERSION_CHECK}`] });
  });

  test("a fresh release beside same-version duplicates passes; beside a version split it fails", () => {
    const both = (second: string) =>
      duplicates(second)
        .replace("19/20 checks passed. 1 checks failed.", "18/20 checks passed. 2 checks failed.")
        .replace(
          "1 checks failed, indicating",
          `\u2716 ${SDK_VERSION_CHECK}\n\n${MINOR}\n1 packages out of date.\n2 checks failed, indicating`,
        );
    const one = times({ "expo@58.1.0": RELEASED });
    expect(judge(both("58.0.26"), 1, { published: one, now: NOW }).ok).toBe(true);
    expect(judge(both("58.0.25"), 1, { published: one, now: NOW })).toEqual({
      ok: false,
      reasons: ["expo is installed at more than one version: 58.0.26, 58.0.25"],
      warnings: [
        "expo 58.1.0 (installed 58.0.26) was published on 2026-11-26; the bump is due on or after 2026-12-03",
      ],
    });
  });
});
