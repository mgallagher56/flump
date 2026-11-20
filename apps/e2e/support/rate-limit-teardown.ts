import { appendFileSync, rmSync } from "node:fs";
import { DESTRUCTIVE_LOG, MAX_DESTRUCTIVE_PER_RUN, readDestructive } from "./destructive-budget";
import { MAX_RETRIES_PER_RUN, RETRY_LOG, readRetries } from "./rate-limit-retry";

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
  ];
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
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
