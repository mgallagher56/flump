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
const INDIRECT: Record<string, (typeof APPS)[number][]> = {
  PORT: ["backend", "marketing"],
  BANKING_TOKEN_ENCRYPTION_KEY: ["backend"],
  WORKOS_COOKIE_PASSWORD: ["web"],
  WORKOS_REDIRECT_URI: ["web"],
  VITE_WORKOS_REDIRECT_URI: ["web"],
  RAILWAY_DEPLOYMENT_DRAINING_SECONDS: ["backend", "web"],
  SENTRY_DSN: ["backend", "web"],
  SENTRY_ENVIRONMENT: ["backend", "web"],
  LOG_FORMAT: ["backend"],
  // Read by name from POOL_SETTINGS in apps/backend/src/config/db.config.ts.
  DB_POOL_MAX: ["backend"],
  DB_POOL_CONNECTION_TIMEOUT_MS: ["backend"],
  DB_POOL_IDLE_TIMEOUT_MS: ["backend"],
  DB_STATEMENT_TIMEOUT_MS: ["backend"],
  DB_LOCK_TIMEOUT_MS: ["backend"],
  DB_IDLE_IN_TRANSACTION_TIMEOUT_MS: ["backend"],
};

const SECTION_HEADING: Record<(typeof APPS)[number], string> = {
  backend: "### 4.1 Backend",
  web: "### 4.2 Web",
  marketing: "### 4.3 Marketing",
};

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
          found.get(name)?.add(app);
        }
      }
    }
  }
  for (const [name, apps] of Object.entries(INDIRECT)) {
    for (const app of apps) {
      if (!found.has(name)) found.set(name, new Set());
      found.get(name)?.add(app);
    }
  }
  return found;
}

/** The table rows of one service's section (its heading up to the next heading). */
function sectionRows(doc: string, app: (typeof APPS)[number]): string {
  const start = doc.indexOf(SECTION_HEADING[app]);
  if (start === -1) throw new Error(`staging.md has no "${SECTION_HEADING[app]}" heading`);
  const rest = doc.slice(start + 1);
  const next = rest.search(/\n#{2,3} /);
  const section = next === -1 ? rest : rest.slice(0, next);
  return section
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .join("\n");
}

/** Names (with the app that reads them) missing from that app's table. */
function missingFrom(doc: string, names: Map<string, Set<string>>): string[] {
  const missing: string[] = [];
  for (const [name, apps] of names) {
    if (name in IGNORED) continue;
    for (const app of apps) {
      if (!sectionRows(doc, app as (typeof APPS)[number]).includes(`\`${name}\``)) {
        missing.push(`${name} (${app})`);
      }
    }
  }
  return missing;
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
    const fake = new Map([["NOT_A_REAL_FLUMP_VARIABLE", new Set(["backend"])]]);
    expect(missingFrom(doc, fake)).toEqual(["NOT_A_REAL_FLUMP_VARIABLE (backend)"]);
  });

  test("a name documented only under another service does not count", () => {
    const wrongService = new Map([["WORKOS_COOKIE_PASSWORD", new Set(["backend"])]]);
    expect(missingFrom(doc, wrongService)).toEqual(["WORKOS_COOKIE_PASSWORD (backend)"]);
  });
});
