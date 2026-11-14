import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `@repo/ui/tools` is read by the marketing server for the sitemap, so the index and everything it
 * imports must stay free of React (and of anything that pulls React in, such as lucide-react).
 */
const collect = (file: string, seen = new Set<string>()): Set<string> => {
  if (seen.has(file)) return seen;
  seen.add(file);
  const text = readFileSync(file, "utf8");
  for (const [, spec] of text.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)) {
    if (!spec?.startsWith(".")) continue;
    const base = resolve(dirname(file), spec.replace(/\.js$/, ""));
    collect(`${base}.ts`, seen);
  }
  return seen;
};

describe("@repo/ui/tools stays React-free", () => {
  const files = [...collect(join(__dirname, "index.ts"))];

  it("follows the index's imports", () => {
    expect(files.map((f) => f.split("/").pop())).toEqual(
      expect.arrayContaining(["index.ts", "toolCatalog.ts", "toolGuides.ts"]),
    );
  });

  it.each(files)("%s imports no React", (file) => {
    const text = readFileSync(file, "utf8");
    const specs = [...text.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)].map((m) => m[1]);
    expect(specs.filter((s) => /^(react|react-dom|lucide-react)(\/|$)/.test(s ?? ""))).toEqual([]);
    expect(file).not.toMatch(/\.tsx$/);
  });
});
