import { defineConfig, type UserConfig } from "vite";
import viteConfig from "./vite.config.mts";

/**
 * The Vitest config Stryker runs (E41 M5). It is the "unit" project of vite.config.mts on its own:
 * Stryker's Vitest runner does not choose a project, and the "storybook" project runs in a browser,
 * which Stryker cannot mutation-test. The unit project's settings are read from vite.config.mts, so
 * the split between the two projects stays defined in one place.
 */

// vite.config.mts picks the test plugins (React, not React Router's build plugin) by this flag.
process.env.VITEST ??= "true";

const base: UserConfig =
  typeof viteConfig === "function"
    ? await viteConfig({ mode: "test", command: "serve", isSsrBuild: false, isPreview: false })
    : await viteConfig;

const {
  projects,
  coverage: _coverage,
  reporters: _reporters,
  outputFile: _outputFile,
  ...root
} = base.test ?? {};
const unit = projects?.find(
  (project) => typeof project === "object" && "test" in project && project.test?.name === "unit",
);
if (!unit || typeof unit !== "object" || !("test" in unit) || !unit.test) {
  throw new Error('vite.config.mts has no "unit" project for Stryker to run');
}
const { name: _name, ...unitTest } = unit.test;

export default defineConfig({
  ...base,
  test: { ...root, ...unitTest, env: { ...root.env, ...unitTest.env } },
});
