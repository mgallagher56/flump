/**
 * Storage design condition (coordinator, 25 November 2026): no token value reaches the console, an
 * error message or crash reporting. The sign-in code has no logging at all, and this keeps it so:
 * any console call, or a crash reporter, in the code that holds tokens fails here. The runtime
 * side (no token in any console output, thrown message or state across real flows) is checked in
 * e2e/fixture-server/session.integration.test.ts.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const TOKEN_CODE = ["src/auth", "src/data", "src/screens/SignInCheck"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const root = resolve(__dirname, "../..");
const files = TOKEN_CODE.flatMap((dir) => sourceFiles(join(root, dir)));

describe("no token logging", () => {
  it("finds the files that hold tokens", () => {
    const names = files.map((f) => f.slice(root.length + 1));
    expect(names).toEqual(expect.arrayContaining(["src/auth/session.ts", "src/data/workos.ts"]));
  });

  it.each(files.map((f) => [f.slice(root.length + 1), f]))(
    "%s has no console call",
    (_name, path) => {
      expect(readFileSync(path, "utf8")).not.toMatch(/\bconsole\s*\./);
    },
  );

  it("no crash reporter is installed yet (Sentry comes with S18, after the scrubber tests)", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((d) => /sentry|bugsnag|crashlytics/i.test(d))).toEqual([]);
  });
});
