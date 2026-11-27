import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * CI type-checks a fresh checkout, where `expo start` has never written expo-env.d.ts or the
 * typed-route declarations. These checks fail if the mobile type check stops loading the same
 * declarations there as on a developer's machine.
 */

const appRoot = __dirname;
const tsc = join(dirname(require.resolve("typescript/package.json")), "bin", "tsc");

/** Every file the mobile program loads, with the reasons tsc gives for loading it. */
function explainFiles(): Map<string, string[]> {
  const run = spawnSync(process.execPath, [tsc, "-p", appRoot, "--explainFiles", "--noEmit"], {
    cwd: appRoot,
    encoding: "utf8",
    // The explanation runs to several megabytes; the 1 MB default would cut it short.
    maxBuffer: 64 * 1024 * 1024,
  });
  // A type error is check-types' business; here only a run that never finished is a failure.
  if (run.error || run.status === null) {
    throw new Error(`tsc did not finish: ${run.error ?? run.signal}`);
  }
  const files = new Map<string, string[]>();
  let current: string[] | undefined;
  for (const line of run.stdout.split("\n")) {
    if (line === "") continue;
    if (line.startsWith(" ")) {
      current?.push(line.trim());
    } else {
      current = [];
      files.set(line.replaceAll("\\", "/"), current);
    }
  }
  return files;
}

function reasonsFor(files: Map<string, string[]>, suffix: string): string[] | undefined {
  for (const [file, reasons] of files) if (file.endsWith(suffix)) return reasons;
  return undefined;
}

describe("mobile type declarations", () => {
  const files = explainFiles();

  it("loads expo/types from tsconfig.json, not only from the gitignored expo-env.d.ts", () => {
    expect(reasonsFor(files, "/expo/types/index.d.ts")).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^Entry point of type library 'expo\/types' specified in compilerOptions/,
        ),
      ]),
    );
  });

  it("loads the typed-route declarations (run `bunx turbo run typegen --filter=@flump/mobile`)", () => {
    expect(reasonsFor(files, ".expo/types/router.d.ts")).toEqual([
      "Matched by include pattern '.expo/types/**/*.ts' in 'tsconfig.json'",
    ]);
  });

  it("generates the typed-route declarations before turbo type-checks or tests the app", () => {
    const pkg = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8"));
    expect(pkg.scripts.typegen).toBe("expo customize tsconfig.json");
    // apps/mobile/turbo.json stays plain JSON (no comments) so this can read it.
    const turbo = JSON.parse(readFileSync(join(appRoot, "turbo.json"), "utf8"));
    expect(turbo.tasks.typegen.outputs).toEqual([".expo/types/**", "expo-env.d.ts"]);
    expect(turbo.tasks["check-types"].dependsOn).toEqual(["$TURBO_EXTENDS$", "typegen"]);
    expect(turbo.tasks.test.dependsOn).toEqual(["$TURBO_EXTENDS$", "typegen"]);
  });
});
