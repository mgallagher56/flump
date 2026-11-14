/**
 * Bank-provider call law (BE-11; audit H2, H5). Bank provider code must:
 *
 * - call providers only through `providerFetch` / `providerFetchJson` from `@flump/banking`
 *   (8 s deadline, one jittered GET retry, Retry-After, typed errors), never a bare `fetch(`;
 * - never swallow an error in an empty `catch {}` (that is how a failed balance became £0), nor
 *   turn it into a made-up result (`catch { return []; }`, `.catch(() => [])`);
 * - never default a missing value to zero or an empty list (`|| 0`, `?? 0`, `|| []`, `?? []`).
 *
 * Standalone: exit 0 passes. Run by scripts/check-backend-laws.ts in `check:laws`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../..");

/** Directories the law covers, relative to the repo root. */
export const PROVIDER_CODE_ROOTS = [
  "apps/backend/src/modules/banking/providers",
  "packages/banking/src/server",
];

/** In `packages/banking/src/server`, only the provider HTTP layer is bank-call code. */
const BANKING_PROVIDER_FILE = /^packages\/banking\/src\/server\/(provider-[\w-]+|interface)\.ts$/;

export interface ProviderCallViolation {
  file: string;
  line: number;
  rule: "raw-fetch" | "swallowed-catch" | "catch-default" | "zero-default" | "empty-default";
  text: string;
}

const RULES: { rule: ProviderCallViolation["rule"]; pattern: RegExp }[] = [
  { rule: "raw-fetch", pattern: /(?<![\w.$])fetch\s*\(/g },
  { rule: "raw-fetch", pattern: /\b(?:globalThis|window|self)\.fetch\s*\(/g },
  {
    rule: "swallowed-catch",
    pattern: /catch\s*(?:\([^)]*\))?\s*\{(?:\s|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*\}/g,
  },
  {
    rule: "catch-default",
    pattern:
      /catch\s*(?:\([^)]*\))?\s*\{(?:\s|\/\/[^\n]*)*return\s+(?:\[\s*\]|0|null|undefined)\s*;?(?:\s|\/\/[^\n]*)*\}/g,
  },
  {
    rule: "catch-default",
    pattern: /\.catch\(\s*(?:\([^)]*\)|\w+)\s*=>\s*(?:\[\s*\]|0|null|\{\s*\})\s*\)/g,
  },
  { rule: "zero-default", pattern: /(?:\|\||\?\?)\s*0(?![\d.xXbBoOn_])/g },
  { rule: "empty-default", pattern: /(?:\|\||\?\?)\s*\[\s*\]/g },
];

/** Production source only: no tests, specs or fixtures. */
export function isCoveredFile(path: string): boolean {
  if (!/\.ts$/.test(path)) return false;
  if (/\.(test|spec)\.ts$/.test(path)) return false;
  if (/(^|\/)__fixtures__\//.test(path)) return false;
  if (path.startsWith("packages/banking/")) return BANKING_PROVIDER_FILE.test(path);
  return true;
}

function stripLineComment(line: string): string {
  const idx = line.indexOf("//");
  return idx === -1 ? line : line.slice(0, idx);
}

export function findProviderCallViolations(file: string, source: string): ProviderCallViolation[] {
  const violations: ProviderCallViolation[] = [];
  const lineOf = (index: number) => source.slice(0, index).split("\n").length;
  for (const { rule, pattern } of RULES) {
    pattern.lastIndex = 0;
    for (let m = pattern.exec(source); m !== null; m = pattern.exec(source)) {
      const line = lineOf(m.index);
      const lineText = source.split("\n")[line - 1] ?? "";
      // A match inside a line comment or a doc comment is prose, not code.
      const trimmed = lineText.trim();
      if (trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
      if (
        rule !== "swallowed-catch" &&
        rule !== "catch-default" &&
        !stripLineComment(lineText).includes(m[0].split("\n")[0] ?? m[0])
      ) {
        continue;
      }
      violations.push({ file, line, rule, text: trimmed });
    }
  }
  return violations.sort((a, b) => a.line - b.line);
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

export function scanProviderCode(root: string = repoRoot): ProviderCallViolation[] {
  const violations: ProviderCallViolation[] = [];
  for (const rel of PROVIDER_CODE_ROOTS) {
    for (const full of walk(resolve(root, rel))) {
      const file = relative(root, full);
      if (!isCoveredFile(file)) continue;
      violations.push(...findProviderCallViolations(file, readFileSync(full, "utf8")));
    }
  }
  return violations;
}

if (import.meta.main) {
  const violations = scanProviderCode();
  if (violations.length) {
    console.error(`check-provider-calls: ${violations.length} violation(s)`);
    for (const v of violations) console.error(`  ${v.file}:${v.line} [${v.rule}] ${v.text}`);
    console.error(
      "Bank calls go through providerFetch/providerFetchJson (@flump/banking); failures throw a typed BankProviderError, never a default.",
    );
    process.exit(1);
  }
  console.log("check-provider-calls: OK");
}
