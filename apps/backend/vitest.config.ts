import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { defineConfig } from "vitest/config";

const ROOT = import.meta.dirname;
const SPEC_DIRS = ["src", "test"];
const INCLUDE = ["src/**/*.spec.ts", "test/**/*.spec.ts"];

/**
 * Every spec that decides whether to run against real Postgres calls resolveDbTestMode
 * (src/testing/dbTestMode.ts). Those files reset the one shared TEST_DATABASE_URL schema, so they
 * must run one at a time: they form the serial "db" project. Everything else is the "unit"
 * project and runs in parallel (E41 P2, owner decision 10).
 *
 * The split is found from the files, not from a hand-kept list, so a new database spec lands in
 * "db" without anyone remembering to add it. A database spec that slipped into "unit" anyway would
 * still fail loudly: "unit" runs with TEST_DATABASE_URL emptied, so in CI (REQUIRE_DB_TESTS=1)
 * resolveDbTestMode throws at collection, and a spec that read the URL directly would find none.
 */
function findDbSpecs(): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(path);
      } else if (
        entry.name.endsWith(".spec.ts") &&
        readFileSync(path, "utf8").includes("resolveDbTestMode(")
      ) {
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
          // The real-Postgres suites (migrations, contract, authz) each reset the same
          // TEST_DATABASE_URL schema, so these files must not run concurrently.
          fileParallelism: false,
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
