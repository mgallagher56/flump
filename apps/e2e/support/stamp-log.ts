/**
 * Copies stdin to a file with each line prefixed by its arrival time in milliseconds, so the smoke
 * suite can count the backend's requests per minute and read its 429s (support/read-budget.ts).
 * Every line except the routine access log and info-level lines is also written to stderr, so the
 * backend's warnings, errors and stack traces still reach the CI job log, as they did before.
 * Used only by the smoke config's backend server (support/servers.ts). Test harness only.
 *
 *   bun dist/main.js 2>&1 | bun ../e2e/support/stamp-log.ts <file>
 */
import { createWriteStream } from "node:fs";
import { createInterface } from "node:readline";

const file = process.argv[2];
if (!file) throw new Error("stamp-log: pass the output file");
const out = createWriteStream(file, { flags: "w" });
let inAccessEntry = false;
for await (const line of createInterface({ input: process.stdin })) {
  out.write(`${Date.now()} ${line}\n`);
  // The access log is a multi-line object from its "[HttpAccess]" header to a closing "}".
  if (line.includes("[HttpAccess]")) {
    inAccessEntry = true;
    continue;
  }
  if (inAccessEntry) {
    if (line.trim() === "}") inAccessEntry = false;
    continue;
  }
  if (line.includes(" LOG ")) continue;
  process.stderr.write(`${line}\n`);
}
out.end();
