/**
 * Runs expo-doctor on apps/mobile for CI (E12 S1a) and fails on every failed check but one known case.
 *
 * The repo's Bun isolated linker installs a second copy of a few Expo packages at the same version,
 * because of the peer cycle between `expo` and `@expo/cli`. Metro bundles one copy of each, so the
 * duplicate check's finding is tolerated only when every duplicate it lists has the same version as
 * the first copy. A duplicate at a different version, or any other failed check, fails the run.
 * The tolerance is recorded under "Guard changes" in the S1a PR and in docs/audit/plans/E12-spike-notes.md.
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

export function judge(output: string, exitCode: number): DoctorVerdict {
  if (exitCode === 0) return { ok: true, reasons: [] };
  const reasons: string[] = [];
  const failed = failedChecks(output);
  if (failed.length === 0) reasons.push(`expo-doctor exited with ${exitCode} and named no check`);
  for (const check of failed) {
    if (check !== DUPLICATE_CHECK) {
      reasons.push(`failed check: ${check}`);
      continue;
    }
    const duplicates = duplicateVersions(output);
    if (duplicates.size === 0) reasons.push("duplicate check failed but listed no package");
    for (const [name, versions] of duplicates) {
      if (versions.length < 2 || new Set(versions).size !== 1) {
        reasons.push(`${name} is installed at more than one version: ${versions.join(", ")}`);
      }
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
