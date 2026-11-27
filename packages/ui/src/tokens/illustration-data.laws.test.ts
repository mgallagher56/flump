// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
 * CROSS-PLATFORM X2 exception (slice F3, coordinator, 27 Nov 2026): the mobile app may read the
 * document pictures' shape lists, and nothing else, from @repo/ui. This law keeps that safe:
 * 1. `Illustration.documents.ts` stays pure data: no runtime import or require of anything (a
 *    type-only import is allowed), so it can never pull React, the DOM or Panda into the app.
 * 2. Every `@repo/ui` specifier in apps/mobile is exactly `@repo/ui/illustration-data`, and the
 *    app's package.json takes no dependency on @repo/ui.
 */

const REPO = path.resolve(__dirname, "../../../..");
const DATA_FILE = path.join(
  REPO,
  "packages/ui/src/primitives/Illustration/Illustration.documents.ts",
);
const MOBILE = path.join(REPO, "apps/mobile");
const ALLOWED_SPECIFIER = "@repo/ui/illustration-data";

/** Drops comments, keeping string contents, so a word in a comment is never read as code. */
function stripComments(source: string): string {
  return source.replace(
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (match, quoted) => quoted ?? "",
  );
}

/**
 * Module specifiers the source loads at run time: value imports, side-effect imports, re-exports,
 * import() and require(). `import type`, `export type` and imports whose every name is marked
 * `type` load nothing and are let through. (TypeScript 7 has no JavaScript compiler API to parse
 * with, so this reads the statements; the first test pins each form.)
 */
function runtimeImports(source: string): string[] {
  const code = stripComments(source);
  const found: { at: number; specifier: string }[] = [];
  const statements = /(^|[;\n])\s*(import|export)\s+([^;]*?)\s*from\s*["']([^"']+)["']/g;
  for (const match of code.matchAll(statements)) {
    const clause = (match[3] ?? "").trim();
    const typeOnly =
      clause.startsWith("type ") ||
      clause.startsWith("type{") ||
      (/^\{[^}]*\}$/.test(clause) &&
        clause
          .slice(1, -1)
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
          .every((name) => name.startsWith("type ")));
    if (!typeOnly) found.push({ at: match.index ?? 0, specifier: match[4] ?? "" });
  }
  for (const match of code.matchAll(/(^|[;\n])\s*import\s*["']([^"']+)["']/g)) {
    found.push({ at: match.index ?? 0, specifier: match[2] ?? "" });
  }
  for (const match of code.matchAll(/\b(?:import|require)\s*\(\s*(["'`]([^"'`]+)["'`])?/g)) {
    found.push({ at: match.index ?? 0, specifier: match[2] ?? "<computed>" });
  }
  return found.sort((a, b) => a.at - b.at).map((entry) => entry.specifier);
}

/** Every quoted `@repo/ui...` specifier in a file's text. */
function repoUiSpecifiers(text: string): string[] {
  return [...text.matchAll(/["'`](@repo\/ui(?:\/[^"'`]*)?)["'`]/g)].map((match) => match[1] ?? "");
}

const SKIP = new Set(["node_modules", "dist", ".expo", "android", "ios", "coverage"]);

function mobileFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return mobileFiles(full);
    return /\.(ts|tsx|js|jsx|mjs|cjs|json)$/.test(entry.name) ? [full] : [];
  });
}

describe("the document picture data mobile reads (CROSS-PLATFORM X2)", () => {
  it("finds value imports, re-exports, import() and require(), and lets type-only imports through", () => {
    expect(
      runtimeImports(`
        import type { A } from "type-only";
        import { type B, type C } from "inline-types";
        export type { D } from "type-reexport";
        import React from "react";
        import { css } from "../styled-system/css";
        import { type E, f } from "mixed";
        import "side-effect";
        export { g } from "reexport";
        export * from "star";
        const h = require("required");
        const i = await import("dynamic");
        // import { j } from "in-a-comment";
        const k = "import { l } from 'in-a-string'";
      `),
    ).toEqual([
      "react",
      "../styled-system/css",
      "mixed",
      "side-effect",
      "reexport",
      "star",
      "required",
      "dynamic",
    ]);
  });

  it("keeps Illustration.documents.ts pure data, with no runtime import at all", () => {
    expect(runtimeImports(fs.readFileSync(DATA_FILE, "utf8"))).toEqual([]);
  });

  it("finds every @repo/ui specifier in a file's text", () => {
    expect(
      repoUiSpecifiers(`import { a } from "@repo/ui"; import b from '@repo/ui/illustration-data';
        jest.mock(\`@repo/ui/styled-system/css\`); "@repo/uikit-other";`),
    ).toEqual(["@repo/ui", ALLOWED_SPECIFIER, "@repo/ui/styled-system/css"]);
  });

  it("lets apps/mobile name @repo/ui only as the illustration-data subpath", () => {
    const offending = mobileFiles(MOBILE).flatMap((file) =>
      repoUiSpecifiers(fs.readFileSync(file, "utf8"))
        .filter((specifier) => specifier !== ALLOWED_SPECIFIER)
        .map((specifier) => `${path.relative(REPO, file)}: ${specifier}`),
    );
    expect(offending).toEqual([]);
  });

  it("gives apps/mobile no package dependency on @repo/ui", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(MOBILE, "package.json"), "utf8"));
    for (const field of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ]) {
      expect(Object.keys(manifest[field] ?? {}), field).not.toContain("@repo/ui");
    }
  });
});
