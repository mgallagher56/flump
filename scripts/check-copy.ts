import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { COPY_OWNERS, copyOwner } from "./lib/copy-owners";
import { type CopyHit, findCopyHits } from "./lib/copy-rules";
import { extractCopyStrings, extractJsonStrings } from "./lib/copy-strings";
import { compareToBaseline } from "./lib/design-tokens";
import { collectFiles, readSource, repoRoot } from "./lib/scan";

/**
 * Copy guard: the mechanical rules of docs/copy/COPY-GUIDE.md (banned words, Title Case,
 * exclamation marks, jargon, en-US spelling) as a ratchet. Existing hits sit in
 * scripts/copy-baseline.json; a file may never gain hits, and the baseline shrinks as copy is
 * fixed.
 *
 *   bun scripts/check-copy.ts                    check against the baseline
 *   bun scripts/check-copy.ts --write-baseline   regenerate after fixing copy
 *   bun scripts/check-copy.ts --list [path]      print every current hit (optionally one path prefix)
 *   bun scripts/check-copy.ts --inventory <dir>  write every user-facing string, one file per owner
 */

export const COPY_SCAN_DIRS = [
  "apps/web/app",
  "apps/marketing/src",
  "packages/ui/src",
  "packages/mcp/src",
  "packages/finance-engine/src",
];
const LOCALE_FILES = ["apps/web/public/locales/en/common.json"];
// Rule text, lexicons and generated code name the banned words on purpose.
const SKIP =
  /\.styles\.ts$|\/(policy|compliance|evals|testing|testUtils|test|ratchets|foundations|__tests__|__fixtures__)\/|advice-allowlist\.ts$/;

function sourceFiles(): string[] {
  return [...collectFiles(repoRoot, COPY_SCAN_DIRS).filter((f) => !SKIP.test(f)), ...LOCALE_FILES];
}

function main() {
  const args = process.argv.slice(2);
  const files = sourceFiles();

  const inventoryAt = args.indexOf("--inventory");
  if (inventoryAt >= 0) {
    const dir = resolve(args[inventoryAt + 1] ?? "copy-inventory");
    mkdirSync(dir, { recursive: true });
    const byOwner = new Map<string, string[]>(COPY_OWNERS.map((o) => [o, []]));
    for (const file of files) {
      const source = readSource(repoRoot, file);
      const strings = file.endsWith(".json")
        ? extractJsonStrings(source)
        : extractCopyStrings(source, file);
      if (!strings.length) continue;
      const flagged = new Map<string, string[]>();
      for (const h of findCopyHits(source, file)) {
        const key = `${h.line}\t${h.text}`;
        flagged.set(key, [...(flagged.get(key) ?? []), h.rule]);
      }
      const lines = byOwner.get(copyOwner(file)) ?? [];
      lines.push(`## ${file}`);
      for (const s of strings) {
        const rules = flagged.get(`${s.line}\t${s.text}`);
        lines.push(`${s.line}\t${s.text}${rules ? `\t[${rules.join(", ")}]` : ""}`);
      }
      lines.push("");
      byOwner.set(copyOwner(file), lines);
    }
    for (const [owner, lines] of byOwner) {
      const path = join(dir, `${owner.toLowerCase().replace(" ", "-")}.txt`);
      writeFileSync(path, `${lines.join("\n")}\n`);
      console.log(`${owner}: ${lines.filter((l) => /^\d+\t/.test(l)).length} string(s) -> ${path}`);
    }
    return;
  }

  const hits: Record<string, CopyHit[]> = {};
  for (const file of files) {
    const found = findCopyHits(readSource(repoRoot, file), file);
    if (found.length) hits[file] = found;
  }
  const counts = Object.fromEntries(Object.entries(hits).map(([f, h]) => [f, h.length]));
  const print = (file: string) => {
    for (const h of hits[file] ?? [])
      console.error(`  ${file}:${h.line} [${h.rule}, guide ${h.guide}] "${h.text}" -> ${h.use}`);
  };

  if (args.includes("--list")) {
    const prefix = args[args.indexOf("--list") + 1] ?? "";
    for (const file of Object.keys(hits)) if (file.startsWith(prefix)) print(file);
    return;
  }

  const baselinePath = resolve(import.meta.dir, "copy-baseline.json");
  if (args.includes("--write-baseline")) {
    writeFileSync(baselinePath, `${JSON.stringify(counts, null, 2)}\n`);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(
      `Wrote ${total} hit(s) in ${Object.keys(counts).length} file(s) to ${baselinePath}`,
    );
    return;
  }

  const baseline: Record<string, number> = existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, "utf8"))
    : {};
  const { failures, stale } = compareToBaseline(counts, baseline);
  for (const f of failures) {
    console.error(`FAIL ${f.replace("violation(s)", "copy hit(s)")} (docs/copy/COPY-GUIDE.md)`);
    print(f.slice(0, f.indexOf(":")));
  }
  for (const s of stale)
    console.error(`STALE ${s} (run: bun scripts/check-copy.ts --write-baseline)`);
  if (failures.length || stale.length) process.exit(1);
  console.log("check-copy: OK");
}

if (import.meta.main) main();
