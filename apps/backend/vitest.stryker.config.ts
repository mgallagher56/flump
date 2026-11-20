import { defineConfig } from "vitest/config";
import base from "./vitest.config";

/**
 * The Vitest config Stryker runs (E41 M4). It is the "unit" project of vitest.config.ts on its
 * own: owner decision 11 leaves the database specs out of mutation runs at first, and Stryker's
 * Vitest runner does not choose a project. The unit project's settings are read from
 * vitest.config.ts, so the split between unit and database specs stays defined in one place.
 */
const { projects, coverage: _coverage, ...root } = base.test ?? {};
const unit = projects?.find(
  (project) => typeof project === "object" && "test" in project && project.test?.name === "unit",
);
if (!unit || typeof unit !== "object" || !("test" in unit) || !unit.test) {
  throw new Error('vitest.config.ts has no "unit" project for Stryker to run');
}
const { name: _name, ...unitTest } = unit.test;

export default defineConfig({
  test: { ...root, ...unitTest, env: { ...root.env, ...unitTest.env } },
});
