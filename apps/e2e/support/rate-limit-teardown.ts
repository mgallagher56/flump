import { appendFileSync, rmSync } from "node:fs";
import { MAX_RETRIES_PER_RUN, RETRY_LOG, readRetries } from "./rate-limit-retry";

/**
 * After the smoke run: prints how many seeding calls were refused with 429 and retried after the
 * backend's Retry-After (rate-limit-retry.ts), in the log and the CI job summary, and fails the
 * run above MAX_RETRIES_PER_RUN, so a real rise in request volume shows as a failure.
 */
export default function rateLimitTeardown(): void {
  const retries = readRetries();
  // Removed once read, so a later run (or one with --output elsewhere) never counts these again.
  rmSync(RETRY_LOG, { force: true });
  const lines = [
    `### E2E: seeding calls retried after a 429: ${retries.length} (allowed: ${MAX_RETRIES_PER_RUN})`,
    ...retries.map(
      (r) => `- ${r.method} ${r.path}, waited ${Math.round(r.waitMs / 1000)} s, in ${r.test}`,
    ),
  ];
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
  }
  if (retries.length > MAX_RETRIES_PER_RUN) {
    throw new Error(
      `${retries.length} seeding calls hit the backend's request limits (allowed ${MAX_RETRIES_PER_RUN}): the suite makes more requests than it did. Find what grew; do not raise the allowance to hide it.`,
    );
  }
}
