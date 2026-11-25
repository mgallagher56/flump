import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { findImportCycles, importCycleMessage, runtimeImports } from "./import-cycles";

const files = (entries: Record<string, string>) => new Map(Object.entries(entries));

const engineRoot = resolve(import.meta.dir, "../../packages/finance-engine/src");
function engineSources(): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry))
        out.set(relative(engineRoot, path), readFileSync(path, "utf8"));
    }
  };
  walk(engineRoot);
  return out;
}

describe("runtime import cycles (finance-engine)", () => {
  test("the real engine restored to its old tax-rules <-> uk-tax-year import fails, naming the path and the fix", () => {
    const sources = engineSources();
    expect(findImportCycles(sources)).toEqual([]);
    const taxRules = sources.get("tax-rules.ts") ?? "";
    const restored = taxRules.replace(
      'import { getUkTaxYearContext } from "./uk-tax-year-calendar.js";',
      'import { getUkTaxYearContext } from "./uk-tax-year.js";',
    );
    expect(restored).not.toBe(taxRules);
    sources.set("tax-rules.ts", restored);
    expect(findImportCycles(sources).map(importCycleMessage)).toEqual([
      "runtime import cycle: tax-rules.ts -> uk-tax-year.ts -> tax-rules.ts. Fix: move the shared piece to a module both can import",
    ]);
  });

  test("a longer cycle is reported as the path through it", () => {
    const found = findImportCycles(
      files({
        "x.ts": 'export * from "./picture/index.js";',
        "picture/index.ts": 'export { y } from "./y.js";',
        "picture/y.ts": 'import {\n  x,\n} from "../x.js";\nexport const y = x;',
        "unrelated.ts": 'import { x } from "./x.js";',
      }),
    );
    expect(found).toEqual([["picture/index.ts", "picture/y.ts", "x.ts", "picture/index.ts"]]);
  });

  test("a module importing itself is a cycle", () => {
    expect(findImportCycles(files({ "s.ts": 'import "./s.js";' }))).toEqual([["s.ts", "s.ts"]]);
  });

  test("import type and export type are ignored", () => {
    expect(runtimeImports('import type { A } from "./a.js";')).toEqual([]);
    expect(runtimeImports('export type { A } from "./a.js";')).toEqual([]);
    expect(runtimeImports('export type * from "./a.js";')).toEqual([]);
    const found = findImportCycles(
      files({
        "a.ts": 'import type { B } from "./b.js";\nexport const a = 1;',
        "b.ts": 'export type { A } from "./a.js";\nimport { a } from "./a.js";',
      }),
    );
    expect(found).toEqual([]);
  });

  test("a mixed import is a runtime edge", () => {
    expect(runtimeImports('import { type A, b } from "./a.js";')).toEqual(["./a.js"]);
    expect(runtimeImports('import D, { type A } from "./a.js";')).toEqual(["./a.js"]);
  });

  test("type specifiers only: erased without verbatimModuleSyntax, a side-effect import with it", () => {
    const source = 'import {\n  type A,\n  type B,\n} from "./a.js";';
    expect(runtimeImports(source)).toEqual([]);
    expect(runtimeImports(source, { keepTypeSpecifierImports: true })).toEqual(["./a.js"]);
    const pair = files({
      "a.ts": 'import { type B } from "./b.js";',
      "b.ts": 'import { a } from "./a.js";',
    });
    expect(findImportCycles(pair)).toEqual([]);
    expect(findImportCycles(pair, { keepTypeSpecifierImports: true })).toEqual([
      ["a.ts", "b.ts", "a.ts"],
    ]);
  });

  test("export * from and export { x } from are runtime edges", () => {
    expect(runtimeImports('export * from "./a.js";')).toEqual(["./a.js"]);
    expect(runtimeImports('export * as ns from "./a.js";')).toEqual(["./a.js"]);
    expect(runtimeImports('export { x } from "./a.js";')).toEqual(["./a.js"]);
  });

  test("dynamic import() and bare imports count", () => {
    expect(runtimeImports('const m = await import("./a.js");')).toEqual(["./a.js"]);
    expect(runtimeImports('import "./a.js";')).toEqual(["./a.js"]);
  });

  test("package imports and commented-out imports are not followed", () => {
    const source = [
      'import { z } from "zod";',
      '// import { a } from "./a.js";',
      '/* export * from "./b.js"; */',
      '/**\n * const m = import("./c.js");\n */',
      'const url = "https://example.test/x"; // a URL is not a comment',
      'import { d } from "./d.js";',
      '// const e = await import("./e.js");',
      'const page = "https://example.test/y"; const f = await import("./f.js");',
    ].join("\n");
    expect(runtimeImports(source)).toEqual(["./d.js", "./f.js"]);
  });
});
