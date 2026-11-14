/**
 * OpenAPI breaking-change law (BE-09, audit M-API5). Regenerates the document from
 * @flump/api-contract and compares it twice:
 *
 * 1. with the working-tree packages/api-contract/openapi.json: any difference fails, because the
 *    committed snapshot must be up to date;
 * 2. with openapi.json at the merge base with main (`git merge-base origin/main HEAD`, falling
 *    back to `main`): every breaking change (see openapi-diff.ts) fails unless it is listed in
 *    packages/api-contract/openapi-breaking-allowlist.json. Allow-list entries that match nothing
 *    only warn, so the list can be emptied in a later PR.
 *
 * The base comparison is skipped, with a note, only when git is unavailable (or this is not a
 * repository) or openapi.json does not exist at the base. A repository without a merge base (a
 * shallow CI checkout) fails, because skipping there would silently disable the law.
 *
 * Run: bun scripts/backend-laws/check-openapi-breaking.ts (part of `bun run check:laws`).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serializeOpenApiDocument } from "../../packages/api-contract/src/openapi";
import {
  type BreakingChange,
  type BreakingKind,
  findBreakingChanges,
  jsonEqual,
} from "./openapi-diff";

type Json = Record<string, unknown>;

const ROOT = join(import.meta.dir, "..", "..");
const OPENAPI_RELATIVE = "packages/api-contract/openapi.json";
export const OPENAPI_PATH = join(ROOT, OPENAPI_RELATIVE);
export const ALLOWLIST_PATH = join(
  ROOT,
  "packages",
  "api-contract",
  "openapi-breaking-allowlist.json",
);

const WRITE_COMMAND = "bun run --cwd packages/api-contract openapi:write";

export interface AllowEntry {
  kind: BreakingKind;
  where: string;
  reason: string;
}

/** The base document, or why the base comparison cannot run. */
export type BaseDocument = { doc: Json; ref: string } | { skipped: string } | { error: string };

export interface CheckResult {
  ok: boolean;
  /** Failures, one line each, ready to print. */
  errors: string[];
  /** Non-fatal notes (skipped base comparison, unused allow-list entries). */
  warnings: string[];
  /** Breaking changes against the base that the allow-list does not cover. */
  unallowed: BreakingChange[];
  /** Allow-list entries that matched no breaking change. */
  unused: AllowEntry[];
  stale: boolean;
}

const sameChange = (entry: AllowEntry, change: BreakingChange): boolean =>
  entry.kind === change.kind && entry.where === change.where;

/** Splits breaking changes into those the allow-list covers and those it does not. */
export function applyAllowlist(
  changes: BreakingChange[],
  allowlist: AllowEntry[],
): { unallowed: BreakingChange[]; unused: AllowEntry[] } {
  const unallowed = changes.filter((c) => !allowlist.some((e) => sameChange(e, c)));
  const unused = allowlist.filter((e) => !changes.some((c) => sameChange(e, c)));
  return { unallowed, unused };
}

/** Validates the parsed allow-list file: an array of `{kind, where, reason}` with a reason. */
export function parseAllowlist(raw: unknown): AllowEntry[] {
  if (!Array.isArray(raw)) throw new Error("openapi-breaking-allowlist.json must be a JSON array");
  return raw.map((entry, i) => {
    const e = entry as Partial<AllowEntry>;
    if (
      typeof e?.kind !== "string" ||
      typeof e.where !== "string" ||
      typeof e.reason !== "string" ||
      e.reason.trim() === ""
    ) {
      throw new Error(
        `openapi-breaking-allowlist.json entry ${i} needs string kind, where and reason`,
      );
    }
    return { kind: e.kind as BreakingKind, where: e.where, reason: e.reason };
  });
}

const describe = (c: BreakingChange) => `  - [${c.kind}] ${c.where}: ${c.detail}`;

/** Runs both comparisons and collects the messages. Pure, so the tests drive it directly. */
export function runCheck(input: {
  committed: Json;
  fresh: Json;
  base: BaseDocument;
  allowlist: AllowEntry[];
}): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const stale = !jsonEqual(input.committed, input.fresh);
  if (stale) {
    const vsCommitted = findBreakingChanges(input.committed, input.fresh);
    errors.push(
      "check-openapi-breaking: packages/api-contract/openapi.json is out of date.",
      ...(vsCommitted.length > 0
        ? [
            `The contract differs from it in ${vsCommitted.length} breaking way(s):`,
            ...vsCommitted.map(describe),
          ]
        : []),
      `Regenerate it with \`${WRITE_COMMAND}\` and commit the result.`,
    );
  }

  let unallowed: BreakingChange[] = [];
  let unused: AllowEntry[] = [];
  const base = input.base;
  if ("skipped" in base) {
    warnings.push(`check-openapi-breaking: base comparison skipped: ${base.skipped}`);
  } else if ("error" in base) {
    errors.push(`check-openapi-breaking: ${base.error}`);
  } else {
    const changes = findBreakingChanges(base.doc, input.fresh);
    ({ unallowed, unused } = applyAllowlist(changes, input.allowlist));
    if (unallowed.length > 0) {
      errors.push(
        `check-openapi-breaking: ${unallowed.length} breaking change(s) against openapi.json at ${base.ref}:`,
        ...unallowed.map(describe),
        "",
        "Within /v1 only additive changes are allowed (docs/api/versioning.md). Either make the change",
        "additive, or put it on a new version path (/v2) or under the deprecation policy.",
        "A deliberate, agreed exception goes in packages/api-contract/openapi-breaking-allowlist.json",
        "as {kind, where, reason}; say so in the PR.",
      );
    }
    for (const entry of unused) {
      warnings.push(
        `check-openapi-breaking: unused allow-list entry [${entry.kind}] ${entry.where} (clear it once merged).`,
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings, unallowed, unused, stale };
}

type Git = (args: string[]) => { ok: boolean; stdout: string };

const realGit: Git = (args) => {
  try {
    const proc = Bun.spawnSync(["git", ...args], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
    return { ok: proc.exitCode === 0, stdout: proc.stdout.toString() };
  } catch {
    return { ok: false, stdout: "" };
  }
};

/** Reads openapi.json at the merge base with origin/main (or main). */
export function loadBaseDocument(git: Git = realGit): BaseDocument {
  if (!git(["rev-parse", "--is-inside-work-tree"]).ok) {
    return { skipped: "git is unavailable or this is not a git repository." };
  }
  let ref: string | undefined;
  for (const main of ["origin/main", "main"]) {
    if (!git(["rev-parse", "--verify", "--quiet", `${main}^{commit}`]).ok) continue;
    const mergeBase = git(["merge-base", main, "HEAD"]);
    if (mergeBase.ok) {
      ref = mergeBase.stdout.trim();
      break;
    }
  }
  if (!ref) {
    return {
      error:
        "no merge base with origin/main or main, so breaking changes cannot be checked. " +
        "Fetch main with full history (CI: actions/checkout `fetch-depth: 0`).",
    };
  }
  const shown = git(["show", `${ref}:${OPENAPI_RELATIVE}`]);
  if (!shown.ok) return { skipped: `${OPENAPI_RELATIVE} does not exist at the merge base ${ref}.` };
  return { doc: JSON.parse(shown.stdout) as Json, ref: `merge base ${ref.slice(0, 12)}` };
}

if (import.meta.main) {
  const result = runCheck({
    committed: JSON.parse(readFileSync(OPENAPI_PATH, "utf8")),
    fresh: JSON.parse(serializeOpenApiDocument()),
    base: loadBaseDocument(),
    allowlist: parseAllowlist(JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"))),
  });
  for (const line of result.warnings) console.warn(line);
  if (result.ok) {
    console.log("check-openapi-breaking: openapi.json is up to date and nothing unallowed breaks.");
  } else {
    console.error(result.errors.join("\n"));
    process.exit(1);
  }
}
