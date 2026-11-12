import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanDirectories, scanText } from "./lib/launch-placeholders";

const script = join(import.meta.dir, "check-launch-placeholders.ts");
let root: string;

function dirWith(name: string, files: Record<string, string>): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  for (const [f, c] of Object.entries(files)) writeFileSync(join(dir, f), c);
  return dir;
}
function run(args: string[], env: Record<string, string> = {}) {
  const base: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== "FLUMP_LAUNCH") base[k] = v;
  }
  const r = Bun.spawnSync(["bun", script, ...args], { env: { ...base, ...env } });
  return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "launch-ph-"));
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("scanText", () => {
  test.each([
    ["PLACEHOLDER", 'x="[COMPANY NAME PLACEHOLDER]"'],
    ["example.invalid", "mailto:support@example.invalid"],
    ["£X/£Y price", "from £X per month"],
    ["£X/£Y price", "from £Y"],
    ["\\u00a3X/\\u00a3Y price", 'a="\\u00a3X"'],
    ["unowned domain flump.app", "support@flump.app"],
    ["unowned domain flump.co.uk", "https://flump.co.uk/x"],
  ])("detects %s", (id, text) => {
    expect(scanText("a.js", text).map((h) => h.pattern)).toContain(id);
  });
  test("is case-sensitive and ignores £X inside a word and plain prices", () => {
    expect(scanText("a.js", "placeholder text, £Xylophone, £10 a month")).toEqual([]);
  });
  test("allow-list suppresses by file and pattern only", () => {
    const allow = [{ file: /vendor\.js$/, pattern: "PLACEHOLDER", reason: "dep" }];
    expect(scanText("dist/vendor.js", "PLACEHOLDER", allow)).toEqual([]);
    expect(scanText("dist/app.js", "PLACEHOLDER", allow)).toHaveLength(1);
    expect(scanText("dist/vendor.js", "example.invalid", allow)).toHaveLength(1);
  });
});

describe("default allow-list", () => {
  test("allows the visualizer PLACEHOLDER constant in stats.html only", () => {
    expect(scanText("build/client/stats.html", 'const PLACEHOLDER = "*/**/file.js"')).toEqual([]);
    expect(scanText("build/client/stats.html", "support@flump.app")).toHaveLength(1);
    expect(scanText("build/client/assets/x.js", "PLACEHOLDER")).toHaveLength(1);
  });
});

describe("scanDirectories", () => {
  test("skips .map files and binary assets, and recurses", () => {
    const dir = dirWith("maps", {
      "a.js.map": "PLACEHOLDER",
      "inter.woff2": "..£Y..",
      "ok.js": "fine",
    });
    mkdirSync(join(dir, "sub"));
    writeFileSync(join(dir, "sub", "b.js"), "example.invalid");
    const hits = scanDirectories([dir]);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.file).toContain("sub/b.js");
  });
});

describe("CLI", () => {
  test("flag off is a no-op, even with placeholders and a missing dir", () => {
    const dir = dirWith("off", { "a.js": "PLACEHOLDER" });
    expect(run([dir]).code).toBe(0);
    expect(run([join(root, "nope")]).code).toBe(0);
  });
  test("flag on: clean dir passes", () => {
    const dir = dirWith("clean", { "a.js": "nothing here" });
    expect(run([dir], { FLUMP_LAUNCH: "true" }).code).toBe(0);
  });
  test("flag on: hits exit 1 and list file and pattern", () => {
    const dir = dirWith("dirty", { "a.js": "price £X" });
    const r = run([dir], { FLUMP_LAUNCH: "true" });
    expect(r.code).toBe(1);
    expect(r.out).toContain("a.js");
    expect(r.out).toContain("£X/£Y price");
  });
  test("only exactly 'true' enables it; --force enables it too", () => {
    const dir = dirWith("flag", { "a.js": "PLACEHOLDER" });
    expect(run([dir], { FLUMP_LAUNCH: "1" }).code).toBe(0);
    expect(run([dir, "--force"]).code).toBe(1);
  });
  test("missing dir exits 3 when active; no dir exits 2", () => {
    expect(run([join(root, "nope")], { FLUMP_LAUNCH: "true" }).code).toBe(3);
    expect(run([], { FLUMP_LAUNCH: "true" }).code).toBe(2);
  });
});
