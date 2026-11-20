/**
 * Copies stdin to a file with each line prefixed by its arrival time in milliseconds, so the smoke
 * suite can count the backend's requests per minute and read its 429s (support/read-budget.ts).
 * Used only by the smoke config's backend server (support/servers.ts). Test harness only.
 *
 *   bun dist/main.js 2>&1 | bun ../e2e/support/stamp-log.ts <file>
 */
import { createWriteStream } from "node:fs";
import { createInterface } from "node:readline";

const file = process.argv[2];
if (!file) throw new Error("stamp-log: pass the output file");
const out = createWriteStream(file, { flags: "w" });
for await (const line of createInterface({ input: process.stdin })) {
  out.write(`${Date.now()} ${line}\n`);
}
out.end();
