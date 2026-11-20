import { expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { isDestructive, MAX_DESTRUCTIVE_PER_RUN } from "../apps/e2e/support/destructive-budget";

// E41: the smoke suite counts its resets and deletes (the backend allows 10 an hour per user, and
// the suite runs as one user) and fails above MAX_DESTRUCTIVE_PER_RUN. A spec that reset or
// deleted through its own fetch helper would not be counted, so every reset or delete in the
// smoke specs must go through a counted helper: backendCall (support/backend.ts), the shared links
// `api` (tests/links/budget-links.helpers.ts), pageApi, applyPersona or clearToNewUser.

const testsDir = resolve(import.meta.dir, "../apps/e2e/tests");
const specFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? specFiles(path) : path.endsWith(".ts") ? [path] : [];
  });

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

test("every reset or delete in the smoke specs goes through a counted helper", () => {
  const offenders: string[] = [];
  for (const file of specFiles(testsDir)) {
    const source = readFileSync(file, "utf8");
    const definesOwnApi = /\bconst api = \(/.test(source);
    source.split("\n").forEach((line, i) => {
      if (!/"DELETE"|reset-financial-data/.test(line) || line.trim().startsWith("//")) return;
      const counted =
        /\bbackendCall\(/.test(line) ||
        /\bpageApi\(/.test(line) ||
        (/\bapi\(/.test(line) && !definesOwnApi);
      if (!counted) offenders.push(`${relative(testsDir, file)}:${i + 1}`);
    });
  }
  expect(offenders).toEqual([]);
});
