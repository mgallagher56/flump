import { afterEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  findMotionDependencies,
  findMotionImports,
  runMotionImportCheck,
} from "./check-motion-imports";

// Library names are built at runtime so this file never reads as an import itself.
const G = ["gs", "ap"].join("");
const T = ["thr", "ee"].join("");
const q = (s: string) => JSON.stringify(s);

describe("findMotionImports (UX-GUIDELINES AT4)", () => {
  it.each([
    [`import { ${G} } from ${q(G)};`, G],
    [`import ${G} from '${G}';`, G],
    [`import { ScrollTrigger } from ${q(`${G}/ScrollTrigger`)};`, `${G}/ScrollTrigger`],
    [`import * as THREE from ${q(T)};`, T],
    [
      `import { RoomEnvironment } from ${q(`${T}/addons/environments/RoomEnvironment.js`)};`,
      `${T}/addons/environments/RoomEnvironment.js`,
    ],
    [`import type { Mesh } from ${q(T)};`, T],
    [`export { Vector3 } from ${q(T)};`, T],
    [`import ${q(T)};`, T],
    [`const kit = await import(${q(G)});`, G],
    [`const kit = await import( '${T}' );`, T],
    [`const t = require(${q(T)});`, T],
    [`vi.mock(${q(G)}, () => ({}));`, G],
    [`import { useGSAP } from ${q(`@${G}/react`)};`, `@${G}/react`],
    [`import { Canvas } from ${q(`@react-${T}/fiber`)};`, `@react-${T}/fiber`],
    ["import x from `" + T + "`;", T],
  ])("finds %s", (source, use) => {
    expect(findMotionImports(source)).toEqual([use]);
  });

  it.each([
    [`import { x } from ${q(`${T}-stdlib-not-real`)};`, "a different package that starts the same"],
    [`import { x } from ${q(`${G}sap`)};`, "a longer name"],
    [`import { x } from ${q(`./${T}`)};`, "a local file named the same"],
    [`import { x } from ${q(`@repo/${T}`)};`, "a scoped package of the same name"],
    [`const label = "${T} steps";`, "a string that is not an import"],
    [`// we never import ${G} here`, "a comment without a specifier"],
  ])("ignores %s (%s)", (source) => {
    expect(findMotionImports(source)).toEqual([]);
  });
});

describe("findMotionDependencies", () => {
  it("finds the libraries in any dependency field", () => {
    const pkg = {
      dependencies: { react: "19.3.1", [G]: "3.15.1" },
      devDependencies: { [`@types/${T}`]: "0.187.0", [T]: "0.187.0" },
      peerDependencies: { [`@react-${T}/fiber`]: "9.0.0" },
    };
    expect(findMotionDependencies(JSON.stringify(pkg))).toEqual([G, T, `@react-${T}/fiber`]);
  });

  it("finds nothing in a package without them", () => {
    expect(findMotionDependencies(JSON.stringify({ dependencies: { react: "19.3.1" } }))).toEqual(
      [],
    );
  });
});

describe("runMotionImportCheck on a repository", () => {
  let dir = "";
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = "";
  });

  function repo(files: Record<string, string>): string {
    dir = mkdtempSync(join(tmpdir(), "motion-imports-"));
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), text);
    }
    execFileSync("git", ["init", "-q"], { cwd: dir });
    execFileSync("git", ["add", "-A"], { cwd: dir });
    return dir;
  }

  const imports = `import * as THREE from ${q(T)};\nimport { ${G} } from ${q(G)};\n`;

  it("allows the libraries in apps/marketing, code and package.json alike", () => {
    const root = repo({
      "apps/marketing/src/components/Orb/orbScene.ts": imports,
      "apps/marketing/package.json": JSON.stringify({ dependencies: { [G]: "3.15.1" } }),
    });
    expect(runMotionImportCheck(root)).toEqual([]);
  });

  it("fails an import in packages/ui, the web app, the mobile app and a test", () => {
    const root = repo({
      "packages/ui/src/hooks/useOrb.ts": imports,
      "apps/web/app/routes/home.tsx": `const kit = await import(${q(G)});`,
      "apps/mobile/src/Orb.tsx": `import { Mesh } from ${q(T)};`,
      "packages/ui/src/hooks/useOrb.test.ts": `vi.mock(${q(`${G}/ScrollTrigger`)});`,
      "apps/marketingish/src/x.ts": `import ${q(T)};`,
    });
    expect(runMotionImportCheck(root)).toEqual([
      `apps/marketingish/src/x.ts: imports ${T}`,
      `apps/mobile/src/Orb.tsx: imports ${T}`,
      `apps/web/app/routes/home.tsx: imports ${G}`,
      `packages/ui/src/hooks/useOrb.test.ts: imports ${G}/ScrollTrigger`,
      `packages/ui/src/hooks/useOrb.ts: imports ${T}, ${G}`,
    ]);
  });

  it("fails a dependency declared outside apps/marketing, including the root package.json", () => {
    const root = repo({
      "package.json": JSON.stringify({ devDependencies: { [T]: "0.187.0" } }),
      "packages/ui/package.json": JSON.stringify({ dependencies: { [G]: "3.15.1" } }),
    });
    expect(runMotionImportCheck(root)).toEqual([
      `package.json: declares ${T}`,
      `packages/ui/package.json: declares ${G}`,
    ]);
  });

  it("passes on this repository", () => {
    expect(runMotionImportCheck()).toEqual([]);
  });
});
