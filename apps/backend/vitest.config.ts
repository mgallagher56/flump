import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { defineConfig } from "vitest/config";

const ROOT = import.meta.dirname;
const SPEC_DIRS = ["src", "test"];
const INCLUDE = ["src/**/*.spec.ts", "test/**/*.spec.ts"];

/**
 * Every spec that decides whether to run against real Postgres calls resolveDbTestMode
 * (src/testing/dbTestMode.ts). Those files reset the TEST_DATABASE_URL schema, so they form the
 * "db" project, where each worker has a database of its own. Everything else is the "unit"
 * project, with no database (E41 P2, owner decision 10).
 *
 * The split is found from the files, not from a hand-kept list, so a new database spec lands in
 * "db" without anyone remembering to add it. A spec counts as a database spec if it calls
 * resolveDbTestMode, boots the authz harness (test/authz/support.ts) or reads
 * process.env.TEST_DATABASE_URL. One that slipped into "unit" anyway would run with
 * TEST_DATABASE_URL emptied: resolveDbTestMode then throws at collection in CI
 * (REQUIRE_DB_TESTS=1), and anything else would find no database.
 */
const DB_MARKERS = /resolveDbTestMode\(|bootAuthzHarness\(|process\.env\.TEST_DATABASE_URL/;

function findDbSpecs(): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(path);
      } else if (entry.name.endsWith(".spec.ts") && DB_MARKERS.test(readFileSync(path, "utf8"))) {
        found.push(relative(ROOT, path));
      }
    }
  };
  for (const dir of SPEC_DIRS) walk(join(ROOT, dir));
  return found.sort();
}

const DB_SPECS = findDbSpecs();

export default defineConfig({
  test: {
    globals: true,
    root: "./",
    environment: "node",
    testTimeout: 15_000,
    // Production pins the process to UTC (src/config/timezone.ts); tests run the same way.
    env: { TZ: "UTC" },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: INCLUDE,
          exclude: DB_SPECS,
          // No database for the parallel project: see findDbSpecs.
          env: { TZ: "UTC", TEST_DATABASE_URL: "" },
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: DB_SPECS,
          // The real-Postgres suites (migrations, contract, authz) each reset the schema of
          // TEST_DATABASE_URL, so two must never share a database at once. Each worker gets its
          // own database on the same local server ("<name>_w<worker>"), so the files run in
          // parallel while each still has a database to itself (test/support/perWorkerDatabase.ts).
          setupFiles: ["./test/support/per-worker-database.setup.mts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.{test,spec}.ts",
        "src/**/*.d.ts",
        "src/**/__fixtures__/**",
        "src/main.ts",
        "src/instrument.ts",
        "src/migrations/**",
      ],
      reporter: ["text", "json-summary", "lcov"],
      // Floors = floor(measured) - 1 (owner decision D6-a). Raise when a PR gains 2+ points.
      // Checked once on the combined result of both projects.
      thresholds: { statements: 90, branches: 74, functions: 84, lines: 91 },
    },
  },
});
