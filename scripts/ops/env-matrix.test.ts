import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// Guards docs/runbooks/staging.md: every environment variable the apps read must
// appear in it (in backticks). Add a row to the matrix when this test fails.

const ROOT = resolve(import.meta.dir, "../..");
const RUNBOOK = join(ROOT, "docs/runbooks/staging.md");
const APPS = ["backend", "web", "marketing"] as const;

/** Names that are intentionally not documented, with the reason. */
const IGNORED: Record<string, string> = {
  TEST_DATABASE_URL: "test-only: CI test database",
  REQUIRE_DB_TESTS: "test-only: makes DB-backed tests fail instead of skip",
  PROD: "import.meta.env.PROD, a Vite built-in",
  MODE: "import.meta.env.MODE, a Vite built-in",
  DEV: "import.meta.env.DEV, a Vite built-in",
  SSR: "import.meta.env.SSR, a Vite built-in",
};

/** Read indirectly (configService, libraries, the platform), so a source grep misses them. */
const INDIRECT = [
  "PORT",
  "BANKING_TOKEN_ENCRYPTION_KEY",
  "WORKOS_COOKIE_PASSWORD",
  "WORKOS_REDIRECT_URI",
  "VITE_WORKOS_REDIRECT_URI",
  "RAILWAY_DEPLOYMENT_DRAINING_SECONDS",
  "SENTRY_DSN",
  "SENTRY_ENVIRONMENT",
  "LOG_FORMAT",
];

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".react-router",
  "coverage",
  "test",
  "tests",
  "e2e",
  "__tests__",
]);
const SOURCE = /\.(ts|tsx|js|mjs)$/;
const TEST_FILE = /\.(test|spec|stories)\.[a-z]+$/;
const PATTERNS = [
  /process\.env\.([A-Z][A-Z0-9_]+)/g,
  /process\.env\[["']([A-Z][A-Z0-9_]+)["']\]/g,
  /import\.meta\.env\.([A-Z][A-Z0-9_]+)/g,
  /\benv\.([A-Z][A-Z0-9_]+)/g,
  /\benv\[["']([A-Z][A-Z0-9_]+)["']\]/g,
  /[cC]onfig(?:Service)?\.get(?:OrThrow)?(?:<[^>]*>)?\(\s*["']([A-Z][A-Z0-9_]+)["']/g,
];

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name)) yield* walk(path);
    } else if (SOURCE.test(name) && !TEST_FILE.test(name)) {
      yield path;
    }
  }
}

function collectNames(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();
  for (const app of APPS) {
    for (const file of walk(join(ROOT, "apps", app))) {
      const text = readFileSync(file, "utf8");
      for (const pattern of PATTERNS) {
        for (const match of text.matchAll(pattern)) {
          const name = match[1] as string;
          if (!found.has(name)) found.set(name, new Set());
          found.get(name)?.add(`apps/${app}`);
        }
      }
    }
  }
  for (const name of INDIRECT) {
    if (!found.has(name)) found.set(name, new Set(["indirect"]));
  }
  return found;
}

function missingFrom(doc: string, names: Map<string, Set<string>>): string[] {
  return [...names.entries()]
    .filter(([name]) => !(name in IGNORED))
    .filter(([name]) => !doc.includes(`\`${name}\``))
    .map(([name, where]) => `${name} (${[...where].join(", ")})`);
}

describe("staging runbook env matrix", () => {
  const doc = readFileSync(RUNBOOK, "utf8");
  const names = collectNames();

  test("the grep finds the variables it should", () => {
    for (const expected of [
      "DATABASE_URL",
      "WORKOS_CLIENT_ID",
      "VITE_API_URL",
      "SECURITY_CONTACT",
    ]) {
      expect(names.has(expected)).toBe(true);
    }
  });

  test("every variable read in the code is documented in staging.md", () => {
    const missing = missingFrom(doc, names);
    expect(missing, `Add these to docs/runbooks/staging.md: ${missing.join("; ")}`).toEqual([]);
  });

  test("the check reports a name that the document lacks", () => {
    const fake = new Map([["NOT_A_REAL_FLUMP_VARIABLE", new Set(["apps/backend"])]]);
    expect(missingFrom(doc, fake)).toEqual(["NOT_A_REAL_FLUMP_VARIABLE (apps/backend)"]);
  });
});
