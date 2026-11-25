import { execFileSync } from "node:child_process";
import { repoRoot } from "./scan";

/**
 * A ratchet baseline may only shrink. Compares a baseline with its copy on origin/main and lists
 * every file whose allowance is new or higher there. CI's lint job checks out full history, so
 * origin/main is present; without it (a shallow clone) the comparison is skipped and says so.
 */
export function baselineRaises(
  baselineRelPath: string,
  baseline: Record<string, number>,
): { raises: string[]; skipped?: string } {
  let onMain: Record<string, number>;
  try {
    onMain = JSON.parse(
      execFileSync("git", ["show", `origin/main:${baselineRelPath}`], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    );
  } catch {
    return { raises: [], skipped: `${baselineRelPath} is not on origin/main here` };
  }
  return { raises: compareBaselines(onMain, baseline) };
}

export function compareBaselines(
  onMain: Record<string, number>,
  baseline: Record<string, number>,
): string[] {
  return Object.entries(baseline)
    .filter(([file, n]) => n > (onMain[file] ?? 0))
    .map(([file, n]) => `${file}: ${onMain[file] ?? 0} on main, ${n} here`);
}
