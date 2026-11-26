/**
 * Runs expo-doctor on apps/mobile for CI (E12 S1a) and fails on every failed check but two known
 * cases.
 *
 * 1. Same-version duplicates. The repo's Bun isolated linker installs a second copy of `expo`,
 *    `expo-constants`, `expo-linking` and `expo-status-bar` at the same version, because of the peer
 *    cycle between `expo` and `@expo/cli`. Metro still bundles one copy of each package;
 *    scripts/check-mobile-bundle.ts asserts that from the export's source map on every run. The
 *    tolerance passes only when every duplicated package it lists has one version. Signed off by the
 *    coordinator on 25 November 2026 (Guard changes in the S1a PR; spike notes in
 *    docs/audit/plans/E12-spike-notes.md). Remove it, and call `expo-doctor` directly, when the repo
 *    moves to Bun's hoisted linker or Bun or Expo fix the peer cycle.
 *
 * 2. A fresh SDK release (cooling-off). The "packages match the Expo SDK" check compares what is
 *    installed with what the newest release of the SDK recommends, read live from npm, so an
 *    upstream release turned this required check red for every pull request within minutes (Expo
 *    58.1.0, 26 November 2026). The repo takes a release only once it is 7 days old (renovate.json's
 *    `minimumReleaseAge`), so for those 7 days the finding is a warning: it passes only when every
 *    mismatch is a minor or patch version the SDK now recommends over an older installed one, and
 *    each recommended version was published to npm less than 7 days ago. From day 7 it fails, so the
 *    bump is not forgotten. A major or prerelease mismatch, an installed version newer than the
 *    recommendation, a table this script cannot read, or a publish date npm does not give still
 *    fail. Signed off by the coordinator on 26 November 2026 (Guard changes in its PR).
 *
 * Both tolerances fail closed: any other failed check, or output this script cannot parse, fails.
 * The parser is written for expo-doctor 1.21.8, pinned exactly in apps/mobile/package.json.
 *
 *   bun scripts/run-expo-doctor.ts
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const UNREADABLE = "<unreadable>";

export const DUPLICATE_CHECK = "Check that no duplicate dependencies are installed";
export const SDK_VERSION_CHECK =
  "Check that packages match versions required by installed Expo SDK";

/** How long a newly recommended version may wait before the check fails (renovate.json). */
export const COOLING_OFF_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DoctorVerdict {
  readonly ok: boolean;
  readonly reasons: readonly string[];
  /** Set only when a tolerated finding should still be read, such as a release that is due. */
  readonly warnings?: readonly string[];
}

/** One row of the version table: the version the SDK recommends and the one installed. */
export interface Mismatch {
  readonly name: string;
  readonly recommended: string;
  readonly installed: string;
}

/** Publish times from npm, keyed `name@version`; null when npm did not give one. */
export type PublishTimes = ReadonlyMap<string, Date | null>;

export const releaseKey = (m: Pick<Mismatch, "name" | "recommended">) =>
  `${m.name}@${m.recommended}`;

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
    // Every "├─ name@" or "└─ name@" line in a block is an entry; one that does not end in "(at: …)"
    // is recorded as unreadable, so it can never hide a version split.
    const listed = line.match(/^\s*[├└]─\s+(\S+?)@(\S*)(.*)$/);
    if (!current || listed?.[1] !== current) continue;
    const version = listed[2];
    result.get(current)?.push(version && /^\s+\(at:/.test(listed[3] ?? "") ? version : UNREADABLE);
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

const semver = (v: string) => v.split(".").map(Number) as [number, number, number];
const compare = (a: string, b: string) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

/**
 * The version table under the SDK check, or why it cannot be tolerated. Only the "Minor version
 * mismatches" and "Patch version mismatches" sections are allowed; every row must read
 * `name  ~x.y.z  x.y.z` with the installed version older, and the rows must add up to the
 * "<n> packages out of date." line. Anything else is a reason to fail.
 */
export function sdkMismatches(
  output: string,
): { readonly mismatches: Mismatch[] } | { readonly reason: string } {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: strips colour codes, should any appear
  const lines = output.replace(/\u001b\[[0-9;]*m/g, "").split("\n");
  const start = lines.findIndex((line) => line.trim() === `✖ ${SDK_VERSION_CHECK}`);
  if (start < 0) return { reason: "the SDK version check's report could not be found" };
  const mismatches: Mismatch[] = [];
  let section: "minor" | "patch" | undefined;
  let changelogs = false;
  for (const raw of lines.slice(start + 1)) {
    const line = raw.trim();
    const total = line.match(/^(\d+) packages? out of date\.$/);
    if (total) {
      if (mismatches.length === 0) return { reason: "the SDK version check listed no package" };
      if (Number(total[1]) !== mismatches.length) {
        return { reason: "the SDK version check's rows do not add up to its total" };
      }
      return { mismatches };
    }
    if (line === "") {
      section = undefined;
      continue;
    }
    if (changelogs) {
      if (!line.startsWith("- ")) return { reason: `unexpected line in the changelogs: ${line}` };
      continue;
    }
    if (line === "Changelogs:") {
      changelogs = true;
      continue;
    }
    const header = line.match(
      /(Major|Minor|Patch) version mismatches$|Other\/prerelease mismatches$/,
    );
    if (header) {
      if (header[1] !== "Minor" && header[1] !== "Patch") {
        return { reason: `expo-doctor reports ${line.replace(/^\S+\s+/, "").toLowerCase()}` };
      }
      section = header[1] === "Minor" ? "minor" : "patch";
      continue;
    }
    if (section && /^package\s+expected\s+found$/.test(line)) continue;
    const row = line.match(/^(\S+)\s+~?(\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+)$/);
    if (!section || !row) return { reason: `unexpected line in the SDK version check: ${line}` };
    const [, name = "", recommended = "", installed = ""] = row;
    if (compare(installed, recommended) >= 0) {
      return { reason: `${name} ${installed} is newer than the SDK recommends (${recommended})` };
    }
    if (semver(installed)[0] !== semver(recommended)[0]) {
      return { reason: `${name} ${installed} is a different major version from ${recommended}` };
    }
    mismatches.push({ name, recommended, installed });
  }
  return { reason: "the SDK version check's total could not be read" };
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/** The SDK check's verdict: every recommended version under 7 days old passes with a warning. */
export function judgeSdkVersions(
  output: string,
  published: PublishTimes,
  now: Date,
): DoctorVerdict {
  const table = sdkMismatches(output);
  if ("reason" in table) return { ok: false, reasons: [table.reason] };
  const reasons: string[] = [];
  const warnings: string[] = [];
  for (const m of table.mismatches) {
    const at = published.get(releaseKey(m));
    if (!at || Number.isNaN(at.getTime()) || at.getTime() > now.getTime()) {
      reasons.push(`npm gave no publish date for ${releaseKey(m)}`);
      continue;
    }
    const due = new Date(at.getTime() + COOLING_OFF_DAYS * DAY_MS);
    if (now.getTime() >= due.getTime()) {
      reasons.push(
        `${m.name} ${m.recommended} (installed ${m.installed}) was published on ${day(at)}, ${COOLING_OFF_DAYS} or more days ago: bump the Expo SDK group (npx expo install --check in apps/mobile)`,
      );
    } else {
      warnings.push(
        `${m.name} ${m.recommended} (installed ${m.installed}) was published on ${day(at)}; the bump is due on or after ${day(due)}`,
      );
    }
  }
  if (reasons.length > 0) return { ok: false, reasons };
  return { ok: true, reasons: [], warnings };
}

function judgeDuplicates(output: string): DoctorVerdict {
  const fail = (reason: string): DoctorVerdict => ({ ok: false, reasons: [reason] });
  const headers = output
    .split("\n")
    .filter((line) => line.startsWith("Found duplicates for ")).length;
  const duplicates = duplicateVersions(output);
  if (duplicates.size === 0) return fail("duplicate check failed but listed no package");
  if (
    duplicates.size !== headers ||
    [...duplicates.values()].some((v) => v.length < 2 || v.includes(UNREADABLE))
  ) {
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

/**
 * The run's verdict. `published` and `now` are only read when the SDK version check failed; with
 * neither given, that check fails as any other would.
 */
export function judge(
  output: string,
  exitCode: number,
  sdk?: { readonly published: PublishTimes; readonly now: Date },
): DoctorVerdict {
  if (exitCode === 0) return { ok: true, reasons: [] };
  const fail = (reason: string): DoctorVerdict => ({ ok: false, reasons: [reason] });

  const count = failedCount(output);
  if (count === undefined)
    return fail(`expo-doctor exited with ${exitCode}; its summary could not be read`);
  const failed = failedChecks(output);
  if (failed.length !== count) {
    return fail(`the summary says ${count} check(s) failed but ${failed.length} could be read`);
  }
  const tolerated = new Set([DUPLICATE_CHECK, ...(sdk ? [SDK_VERSION_CHECK] : [])]);
  const others = failed.filter((check) => !tolerated.has(check));
  if (others.length > 0) return { ok: false, reasons: others.map((c) => `failed check: ${c}`) };

  const verdicts = [
    ...(failed.includes(DUPLICATE_CHECK) ? [judgeDuplicates(output)] : []),
    ...(sdk && failed.includes(SDK_VERSION_CHECK)
      ? [judgeSdkVersions(output, sdk.published, sdk.now)]
      : []),
  ];
  const reasons = verdicts.flatMap((v) => v.reasons);
  const warnings = verdicts.flatMap((v) => v.warnings ?? []);
  return {
    ok: reasons.length === 0,
    reasons,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

/** When npm published each recommended version; null for any it does not answer for. */
async function publishTimes(mismatches: readonly Mismatch[]): Promise<PublishTimes> {
  const entries = await Promise.all(
    mismatches.map(async (m): Promise<[string, Date | null]> => {
      try {
        const res = await fetch(`https://registry.npmjs.org/${m.name.replace("/", "%2f")}`, {
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) return [releaseKey(m), null];
        const time = ((await res.json()) as { time?: Record<string, string> }).time?.[
          m.recommended
        ];
        return [releaseKey(m), time ? new Date(time) : null];
      } catch {
        return [releaseKey(m), null];
      }
    }),
  );
  return new Map(entries);
}

if (import.meta.main) {
  const run = spawnSync("bun", ["run", "doctor:raw"], {
    cwd: resolve(import.meta.dir, "../apps/mobile"),
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
  });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  console.log(output);
  const table = failedChecks(output).includes(SDK_VERSION_CHECK) ? sdkMismatches(output) : null;
  const published =
    table && "mismatches" in table ? await publishTimes(table.mismatches) : new Map();
  const verdict = judge(output, run.status ?? 1, { published, now: new Date() });
  for (const warning of verdict.warnings ?? []) console.warn(`WARN ${warning}`);
  for (const reason of verdict.reasons) console.error(`FAIL ${reason}`);
  if (!verdict.ok) process.exit(1);
  console.log(
    "run-expo-doctor: OK (any duplicate is a same-version copy from the isolated linker; any SDK version mismatch is a release under 7 days old)",
  );
}
