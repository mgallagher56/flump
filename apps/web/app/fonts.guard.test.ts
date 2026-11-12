import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Self-hosted fonts guard (E19 A3). Loading fonts from Google sends each visitor's IP address and
 * user agent to a US third party, so web and marketing must use `@repo/ui/fonts.css` only.
 */
const root = resolve(__dirname, "..", "..");
const DIRS = [join(root, "web", "app"), join(root, "marketing", "src")];
const FILES = [join(root, "marketing", "index.html")];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "node_modules" ? [] : files(p);
    return /\.(tsx?|css|html)$/.test(p) && !/fonts\.guard\.test\.ts$/.test(p) ? [p] : [];
  });
}

describe("fonts are self-hosted", () => {
  const sources = [...DIRS.flatMap(files), ...FILES].map(
    (f) => [f, readFileSync(f, "utf8")] as const,
  );

  it("no source references Google Fonts hosts", () => {
    expect(sources.length).toBeGreaterThan(50);
    const hits = sources
      .filter(([, text]) => /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(text))
      .map(([f]) => f);
    expect(hits).toEqual([]);
  });

  it("both apps import the shared fonts.css", () => {
    const has = (suffix: string) =>
      sources.some(([f, text]) => f.endsWith(suffix) && text.includes("@repo/ui/fonts.css"));
    expect(has("web/app/root.tsx")).toBe(true);
    expect(has("marketing/src/entry-client.tsx")).toBe(true);
  });
});
