/**
 * Runs expo-doctor on apps/mobile for CI (E12 S1a) and fails on every failed check but one known case.
 *
 * Cause: the repo's Bun isolated linker installs a second copy of `expo`, `expo-constants`,
 * `expo-linking` and `expo-status-bar` at the same version, because of the peer cycle between
 * `expo` and `@expo/cli`. Metro still bundles one copy of each package; scripts/check-mobile-bundle.ts
 * asserts that from the export's source map on every run.
 *
 * The tolerance is exact and fails closed: a failing run passes only when the summary says exactly
 * one check failed, that check is the duplicate check, and every duplicated package it lists has one
 * version. Any other failed check, a version split, or output this script cannot parse fails.
 *
 * Signed off by the coordinator on 25 November 2026 (Guard changes in the S1a PR; spike notes in
 * docs/audit/plans/E12-spike-notes.md). Remove this tolerance, and call `expo-doctor` directly,
 * when the repo moves to Bun's hoisted linker or Bun or Expo fix the peer cycle. The parser is written
 * for expo-doctor 1.21.8, pinned exactly in apps/mobile/package.json.
 *
 *   bun scripts/run-expo-doctor.ts
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

export const DUPLICATE_CHECK = "Check that no duplicate dependencies are installed";

export interface DoctorVerdict {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

/** Names of the checks expo-doctor marked as failed (lines that start with the cross mark). */
export function failedChecks(output: string): string[] {
  return output
    .split("\n")
    .map((line) => line.match(/^\s*✖\s+(.+?)\s*$/)?.[1])
    .filter((name): name is string => name !== undefined);
}

/** Each "Found duplicates for <name>:" block with the versions listed under it. */
export function duplicateVersions(output: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  let current: string | undefined;
  for (const line of output.split("\n")) {
    const header = line.match(/^Found duplicates for (\S+):/);
    if (header?.[1]) {
      current = header[1];
      result.set(current, []);
      continue;
    }
    const entry = line.match(/^\s*[├└]─\s+(\S+)@(\S+)\s+\(at:/);
    if (current && entry?.[1] === current && entry[2]) result.get(current)?.push(entry[2]);
  }
  return result;
}

/** The "<passed>/<total> checks passed. <failed> checks failed." summary, or undefined when absent. */
export function failedCount(output: string): number | undefined {
  const m = output.match(/^(\d+)\/(\d+) checks passed\. (\d+) checks? failed\./m);
  if (!m) return undefined;
  const [passed, total, failed] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return passed + failed === total ? failed : undefined;
}

export function judge(output: string, exitCode: number): DoctorVerdict {
  if (exitCode === 0) return { ok: true, reasons: [] };
  const fail = (reason: string): DoctorVerdict => ({ ok: false, reasons: [reason] });

  const count = failedCount(output);
  if (count === undefined)
    return fail(`expo-doctor exited with ${exitCode}; its summary could not be read`);
  const failed = failedChecks(output);
  if (failed.length !== count) {
    return fail(`the summary says ${count} check(s) failed but ${failed.length} could be read`);
  }
  const others = failed.filter((check) => check !== DUPLICATE_CHECK);
  if (others.length > 0) return { ok: false, reasons: others.map((c) => `failed check: ${c}`) };

  const headers = output
    .split("\n")
    .filter((line) => line.startsWith("Found duplicates for ")).length;
  const duplicates = duplicateVersions(output);
  if (duplicates.size === 0) return fail("duplicate check failed but listed no package");
  if (duplicates.size !== headers || [...duplicates.values()].some((v) => v.length < 2)) {
    return fail("a duplicate entry could not be read");
  }
  const reasons: string[] = [];
  for (const [name, versions] of duplicates) {
    if (new Set(versions).size !== 1) {
      reasons.push(`${name} is installed at more than one version: ${versions.join(", ")}`);
    }
  }
  return { ok: reasons.length === 0, reasons };
}

if (import.meta.main) {
  const run = spawnSync("bun", ["run", "doctor:raw"], {
    cwd: resolve(import.meta.dir, "../apps/mobile"),
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
  });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  console.log(output);
  const verdict = judge(output, run.status ?? 1);
  for (const reason of verdict.reasons) console.error(`FAIL ${reason}`);
  if (!verdict.ok) process.exit(1);
  console.log(
    "run-expo-doctor: OK (any duplicate is a same-version copy from the isolated linker)",
  );
}
