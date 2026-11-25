/**
 * Write-fence exemption law (privacy finding F1, verify-account-erasure skill). `withoutWriteFence`
 * turns off the user-data write fence, which is what stops a row outliving a finished account
 * erasure. Only code that takes the exclusive `lockUserData` and checks the tombstone itself, or that
 * cannot write, may run without it. This law fails when the backend calls it anywhere else, or more
 * often than the list below allows, so a new caller has to be added here in review, with its reason.
 *
 * Standalone: exit 0 passes. Run by scripts/check-backend-laws.ts in `check:laws`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../..");

/** Where the law looks, relative to the repo root. */
export const BACKEND_SOURCE_ROOT = "apps/backend/src";

/** The file that defines withoutWriteFence (and documents it). */
export const DEFINING_FILE = "apps/backend/src/modules/privacy/user-data-lock.ts";

/** Every allowed caller: the file, how many calls it may make, and why it may run unfenced. */
export const ALLOWED_CALLERS: Record<string, { calls: number; reason: string }> = {
  "apps/backend/src/modules/privacy/account-deletion.service.ts": {
    calls: 1,
    reason: "deleteAccount takes the exclusive lockUserData itself (the erasure)",
  },
  "apps/backend/src/modules/profile/user-profile.service.ts": {
    calls: 1,
    reason: "resetFinancialData takes the exclusive lockUserData and checks the tombstone",
  },
  "apps/backend/src/modules/privacy/account-export.service.ts": {
    calls: 1,
    reason: "the export's transaction is READ ONLY and cannot write",
  },
};

export interface FenceExemptionViolation {
  file: string;
  line: number;
  text: string;
}

const NAME = /\bwithoutWriteFence\b/g;
const CALL = /\bwithoutWriteFence\s*(?:<[^>()]*>)?\s*\(/;

/** Production source only: no tests, specs, fixtures or test helpers. */
export function isCoveredFile(path: string): boolean {
  if (!/\.ts$/.test(path)) return false;
  if (/\.(test|spec)\.ts$/.test(path)) return false;
  if (/(^|\/)(__fixtures__|testing)\//.test(path)) return false;
  return path !== DEFINING_FILE;
}

/** The line with comments removed: a mention in prose is not a use. */
function codeOf(line: string, inBlock: boolean): { code: string; inBlock: boolean } {
  let code = "";
  let i = 0;
  let block = inBlock;
  while (i < line.length) {
    if (block) {
      const end = line.indexOf("*/", i);
      if (end === -1) return { code, inBlock: true };
      block = false;
      i = end + 2;
    } else if (line.startsWith("/*", i)) {
      block = true;
      i += 2;
    } else if (line.startsWith("//", i)) {
      break;
    } else {
      code += line[i];
      i += 1;
    }
  }
  return { code, inBlock: block };
}

/**
 * Uses of withoutWriteFence in one file that the list does not allow. In a file that is not listed,
 * any use counts (an import, an alias, a call). In a listed file, calls past its allowance count.
 */
export function findFenceExemptionViolations(
  file: string,
  source: string,
): FenceExemptionViolation[] {
  const allowed = ALLOWED_CALLERS[file];
  const violations: FenceExemptionViolation[] = [];
  let calls = 0;
  let inBlock = false;
  source.split("\n").forEach((raw, index) => {
    const stripped = codeOf(raw, inBlock);
    inBlock = stripped.inBlock;
    const uses = stripped.code.match(NAME)?.length ?? 0;
    if (uses === 0) return;
    const record = () => violations.push({ file, line: index + 1, text: raw.trim() });
    if (!allowed) {
      record();
      return;
    }
    if (CALL.test(stripped.code)) {
      calls += 1;
      if (calls > allowed.calls) record();
    }
  });
  return violations;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "node_modules") out.push(...walk(full));
    } else out.push(full);
  }
  return out;
}

export function scanFenceExemptions(root: string = repoRoot): FenceExemptionViolation[] {
  const violations: FenceExemptionViolation[] = [];
  for (const full of walk(resolve(root, BACKEND_SOURCE_ROOT))) {
    const file = relative(root, full);
    if (!isCoveredFile(file)) continue;
    violations.push(...findFenceExemptionViolations(file, readFileSync(full, "utf8")));
  }
  return violations;
}

if (import.meta.main) {
  const violations = scanFenceExemptions();
  if (violations.length) {
    console.error(`check-write-fence-exemptions: ${violations.length} violation(s)`);
    for (const v of violations) console.error(`  ${v.file}:${v.line} ${v.text}`);
    console.error(
      "withoutWriteFence is only for code that takes the exclusive lockUserData and checks the tombstone, or cannot write. A new caller goes in ALLOWED_CALLERS in scripts/backend-laws/check-write-fence-exemptions.ts, with its reason, and needs sign-off (AGENTS.md section 15).",
    );
    process.exit(1);
  }
  console.log("check-write-fence-exemptions: OK");
}
