/**
 * Fails when a skill names its sync commit by hash (scripts/lib/skill-sync-commits.ts).
 *   bun scripts/check-skill-sync-commits.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { repoRoot } from "./lib/scan";
import { findSyncHashes } from "./lib/skill-sync-commits";

const SKILL_ROOTS = [".claude/skills", ".agents/skills"];

function skillFiles(): string[] {
  return SKILL_ROOTS.flatMap((root) => {
    try {
      return readdirSync(join(repoRoot, root), { recursive: true, encoding: "utf8" })
        .filter((f) => f.endsWith(".md"))
        .map((f) => join(repoRoot, root, f));
    } catch {
      return [];
    }
  });
}

const hits = skillFiles().flatMap((file) =>
  findSyncHashes(readFileSync(file, "utf8")).map(
    (h) => `${relative(repoRoot, file)}:${h.line}: ${h.hash}`,
  ),
);
if (hits.length) {
  console.error(
    `Skill sync commit named by hash:\n${hits.join("\n")}\nPRs are rebase-merged, so a hash written on a branch never reaches main. Name the commit by its title and find it with git log --fixed-strings --grep, as .claude/skills/verify-bank-sync/SKILL.md "Coverage record" does.`,
  );
  process.exit(1);
}
console.log("Skill sync commits: named by title.");
