/**
 * Household membership law (E34 C3). Who is in which household is the most sensitive fact the
 * household feature holds: reading it is how one person could learn about the other. So the
 * `household_members` table, and its entity `HouseholdMember`, are named only inside the household
 * module (which decides visibility in one function, household-visibility.ts) and the privacy code
 * that erases and exports it. A new reader elsewhere (a finance read, an AI tool, a report) fails
 * this law and has to be added here, in review, with its reason.
 *
 * Comments are ignored; strings are not (a query is a string).
 *
 * Standalone: exit 0 passes. Run by scripts/check-backend-laws.ts in `check:laws`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../..");

export const BACKEND_SOURCE_ROOT = "apps/backend/src";

/** Folders whose files may name the table, relative to the repo root. */
export const ALLOWED_DIRECTORIES: Record<string, string> = {
  "apps/backend/src/modules/household/": "the household module itself",
  "apps/backend/src/migrations/": "the migration that creates the table",
};

/** Single files outside those folders that may name it, each with its reason. */
export const ALLOWED_FILES: Record<string, string> = {
  "apps/backend/src/entities/household-member.entity.ts": "the entity itself",
  "apps/backend/src/config/typeorm.options.ts": "ENTITIES, the one list of entities",
  "apps/backend/src/modules/privacy/user-data-registry.ts":
    "the erasure, export and reset decision for the table",
  "apps/backend/src/modules/privacy/household-leave.ts":
    "the one leave function, used by leaving and by account erasure",
  "apps/backend/src/modules/privacy/account-export.service.ts":
    "the export's notes on the person's own membership",
};

const NAMES = /\bhousehold_members\b|\bHouseholdMember\b|household-member\.entity/;

export interface HouseholdMembersViolation {
  file: string;
  line: number;
  text: string;
}

/** Production source only: no tests, specs, fixtures or test helpers. */
export function isCoveredFile(path: string): boolean {
  if (!/\.ts$/.test(path) || /\.d\.ts$/.test(path)) return false;
  if (/\.(test|spec)\.ts$/.test(path)) return false;
  return !/(^|\/)(__fixtures__|testing)\//.test(path);
}

export function isAllowedFile(path: string): boolean {
  return (
    Object.hasOwn(ALLOWED_FILES, path) ||
    Object.keys(ALLOWED_DIRECTORIES).some((dir) => path.startsWith(dir))
  );
}

/** The line without comments, strings kept. */
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
    } else if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) j += line[j] === "\\" ? 2 : 1;
      code += line.slice(i, j + 1);
      i = j + 1;
    } else {
      code += line[i];
      i += 1;
    }
  }
  return { code, inBlock: block };
}

/** Lines of one file that name the table or entity while the file is not allowed to. */
export function findHouseholdMembersViolations(
  file: string,
  source: string,
): HouseholdMembersViolation[] {
  if (isAllowedFile(file)) return [];
  const violations: HouseholdMembersViolation[] = [];
  let inBlock = false;
  source.split("\n").forEach((raw, index) => {
    const stripped = codeOf(raw, inBlock);
    inBlock = stripped.inBlock;
    if (NAMES.test(stripped.code)) violations.push({ file, line: index + 1, text: raw.trim() });
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

export function scanHouseholdMembers(root: string = repoRoot): HouseholdMembersViolation[] {
  const violations: HouseholdMembersViolation[] = [];
  for (const full of walk(resolve(root, BACKEND_SOURCE_ROOT))) {
    const file = relative(root, full);
    if (!isCoveredFile(file)) continue;
    violations.push(...findHouseholdMembersViolations(file, readFileSync(full, "utf8")));
  }
  return violations;
}

if (import.meta.main) {
  const violations = scanHouseholdMembers();
  if (violations.length) {
    console.error(`check-household-members: ${violations.length} violation(s)`);
    for (const v of violations) console.error(`  ${v.file}:${v.line} ${v.text}`);
    console.error(
      "household_members is read only in modules/household and the privacy code listed in scripts/backend-laws/check-household-members.ts.",
    );
    process.exit(1);
  }
  console.log("check-household-members: OK");
}
