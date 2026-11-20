import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { isDestructive, MAX_DESTRUCTIVE_PER_RUN } from "../apps/e2e/support/destructive-budget";

// E41: the smoke suite counts its resets and deletes (the backend allows 10 an hour per user, and
// the suite runs as one user) and fails above MAX_DESTRUCTIVE_PER_RUN. A spec that reset or
// deleted through its own fetch helper would not be counted, so every reset or delete in the
// smoke specs must go through a counted helper: backendCall (support/backend.ts), the shared links
// `api` (tests/links/budget-links.helpers.ts), pageApi, applyPersona or clearToNewUser.

const e2eDir = resolve(import.meta.dir, "../apps/e2e");
const scanDirs = [join(e2eDir, "tests"), join(e2eDir, "support")];
// The counted helpers themselves: each records the call (destructive-budget.ts) before it makes it.
const COUNTED_HELPER_FILES = new Set([
  "support/backend.ts",
  "support/personas.ts",
  "support/links-api.ts",
  "support/destructive-budget.ts",
  "support/rate-limit-retry.ts",
  "tests/links/budget-links.helpers.ts",
]);
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules") return [];
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
// A reset or a delete, however it is written: the method in any quote style or as an options key,
// Playwright's request.delete(), or the reset route.
const DESTRUCTIVE_TEXT = /["'`]DELETE["'`]|\.delete\(|reset-financial-data/i;

test("the allowance stays well inside the backend's 10 an hour", () => {
  expect(MAX_DESTRUCTIVE_PER_RUN).toBeLessThanOrEqual(6);
});

test("a reset or a delete is destructive; other calls are not", () => {
  expect(isDestructive("DELETE", "/accounts/1")).toBe(true);
  expect(isDestructive("delete", "/tax-records/2")).toBe(true);
  expect(isDestructive("POST", "/user-profile/reset-financial-data")).toBe(true);
  expect(isDestructive("POST", "/api/user-profile/reset-financial-data")).toBe(true);
  expect(isDestructive("PATCH", "/tax-records/2")).toBe(false);
  expect(isDestructive("POST", "/accounts")).toBe(false);
});

test("every reset or delete in the e2e specs and support goes through a counted helper", () => {
  const offenders: string[] = [];
  for (const dir of scanDirs) {
    for (const file of sourceFiles(dir)) {
      const rel = relative(e2eDir, file);
      if (COUNTED_HELPER_FILES.has(rel)) continue;
      const source = readFileSync(file, "utf8");
      // A file with a helper of its own named `api` (in any form) makes its api() calls uncounted.
      const definesOwnApi = /\b(const|let|function)\s+api\b/.test(source);
      source.split("\n").forEach((line, i) => {
        if (!DESTRUCTIVE_TEXT.test(line) || /^\s*(\/\/|\*)/.test(line)) return;
        const counted =
          /\bbackendCall\(/.test(line) ||
          /\bpageApi\(/.test(line) ||
          (/\bapi\(/.test(line) && !definesOwnApi);
        if (!counted) offenders.push(`${rel}:${i + 1}`);
      });
    }
  }
  expect(offenders).toEqual([]);
});
