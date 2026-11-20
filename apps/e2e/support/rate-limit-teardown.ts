import { appendFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { DESTRUCTIVE_LOG, MAX_DESTRUCTIVE_PER_RUN, readDestructive } from "./destructive-budget";
import { MAX_RETRIES_PER_RUN, RETRY_LOG, readRetries } from "./rate-limit-retry";
import {
  BACKEND_LOG,
  PACE_AT,
  parseBackendLog,
  READ_LIMIT,
  readsPerSpec,
  readWindows,
  SPEC_MARKS,
  unexplainedReadRefusals,
  userReads,
} from "./read-budget";

/**
 * After the smoke run: prints how many seeding calls were refused with 429 and retried after the
 * backend's Retry-After (rate-limit-retry.ts) and how many destructive calls the run made
 * (destructive-budget.ts), in the log and the CI job summary, and fails the run above either
 * allowance, so a rise in request volume or a new reset or delete shows as a failure.
 */
export default function rateLimitTeardown(): void {
  const retries = readRetries();
  const destructive = readDestructive();
  // Removed once read, so a later run (or one with --output elsewhere) never counts these again.
  rmSync(RETRY_LOG, { force: true });
  rmSync(DESTRUCTIVE_LOG, { force: true });
  const lines = [
    `### E2E: seeding calls retried after a 429: ${retries.length} (allowed: ${MAX_RETRIES_PER_RUN})`,
    ...retries.map(
      (r) => `- ${r.method} ${r.path}, waited ${Math.round(r.waitMs / 1000)} s, in ${r.test}`,
    ),
    `### E2E: destructive calls (resets and deletes; the backend allows 10 an hour): ${destructive.length} (allowed: ${MAX_DESTRUCTIVE_PER_RUN})`,
    ...destructive.map((d) => `- ${d.method} ${d.path}, in ${d.test}`),
    ...readBudgetLines(),
  ];
  const refusedReads = unexplainedReadRefusals(
    existsSync(BACKEND_LOG) ? parseBackendLog(readFileSync(BACKEND_LOG, "utf8")).refusals : [],
    retries.filter((r) => r.method === "GET").length,
  );
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
  }
  if (refusedReads.length > 0) {
    throw new Error(
      `The backend refused ${refusedReads.length} read(s) with 429 that no seeding retry accounts for (${refusedReads.map((r) => r.line).join("; ")}): the suite leaned on the 600-reads-a-minute limit. Find what grew or pace it (read-budget.ts); never raise the limit.`,
    );
  }
  if (destructive.length > MAX_DESTRUCTIVE_PER_RUN) {
    throw new Error(
      `${destructive.length} destructive calls (allowed ${MAX_DESTRUCTIVE_PER_RUN}; the backend allows 10 an hour): a spec added a reset or delete. Reuse seeded data or move records aside instead; do not raise the allowance to hide it.`,
    );
  }
  if (retries.length > MAX_RETRIES_PER_RUN) {
    throw new Error(
      `${retries.length} seeding calls hit the backend's request limits (allowed ${MAX_RETRIES_PER_RUN}): the suite makes more requests than it did. Find what grew; do not raise the allowance to hide it.`,
    );
  }
}

/** The read budget from the backend's own log: its 429s, the user's read windows, pacing waits. */
function readBudgetLines(): string[] {
  if (!existsSync(BACKEND_LOG)) return ["### E2E: read budget: no backend log (server reused?)"];
  const { access, refusals } = parseBackendLog(readFileSync(BACKEND_LOG, "utf8"));
  const reads = userReads(access);
  const windows = readWindows(reads);
  const peak = Math.max(0, ...windows.map((w) => w.count));
  const marks = existsSync(SPEC_MARKS) ? readFileSync(SPEC_MARKS, "utf8") : "";
  const specs = readsPerSpec(reads, marks);
  const waits = specs.filter((s) => s.waitedMs > 0);
  const top = [...specs].sort((a, b) => b.reads - a.reads).slice(0, 5);
  return [
    `### E2E: backend refusals (429) in this run: ${refusals.length}`,
    ...refusals.map((r) => `- ${r.perUser ? "per user" : "per address"}: ${r.line}`),
    `### E2E: user reads ${reads.length}; peak in one window ${peak} of ${READ_LIMIT}; windows: ${windows.map((w) => w.count).join(", ")}`,
    `### E2E: pacing waits before a link spec (window at ${PACE_AT}+ reads): ${waits.length}`,
    ...waits.map((w) => `- waited ${Math.round(w.waitedMs / 1000)} s before ${w.title}`),
    "Most reads per spec (from its seeding to the next spec's):",
    ...top.map((s) => `- ${s.reads}: ${s.title}`),
  ];
}
