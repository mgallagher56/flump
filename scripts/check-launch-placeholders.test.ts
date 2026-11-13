import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BUSINESS_DETAILS, type BusinessDetails } from "../packages/business-details/src/index";
import {
  businessDetailPatterns,
  isLaunchGuardActive,
  placeholderConfigFields,
  scanDirectories,
  scanText,
} from "./lib/launch-placeholders";

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
    if (v !== undefined && k !== "FLUMP_LAUNCH" && k !== "ALLOW_INDEXING") base[k] = v;
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
  test("domain patterns need a left boundary", () => {
    expect(scanText("a.js", "myflump.app and my-flump.co.uk")).toEqual([]);
    expect(scanText("a.js", "https://flump.app/x")).toHaveLength(1);
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
  test("flag on: a clean build still fails while business details are placeholders", () => {
    const dir = dirWith("clean", { "a.js": "nothing here" });
    const r = run([dir], { FLUMP_LAUNCH: "true" });
    expect(r.code).toBe(1);
    expect(r.out).toContain("business detail(s) are still placeholders");
    expect(r.out).not.toContain("hit(s) in the build output");
  });
  test("ALLOW_INDEXING=true alone activates the guard and fails on placeholders", () => {
    const dir = dirWith("indexing", { "a.js": "nothing here" });
    const r = run([dir], { ALLOW_INDEXING: "true" });
    expect(r.code).toBe(1);
    expect(r.out).toContain("legalName");
    expect(run([dir], { ALLOW_INDEXING: "1" }).code).toBe(0);
  });
  test("a build that contains a placeholder business detail fails with its hit", () => {
    const dir = dirWith("leak", { "a.js": `© 2026 ${BUSINESS_DETAILS.legalName.value}` });
    const r = run([dir], { ALLOW_INDEXING: "true" });
    expect(r.code).toBe(1);
    expect(r.out).toContain("business detail: legalName");
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
  test("empty dir exits 3 when active, no-op when the flag is off", () => {
    const dir = dirWith("empty", {});
    const onlyMap = dirWith("only-map", { "a.js.map": "x" });
    expect(run([dir], { FLUMP_LAUNCH: "true" }).code).toBe(3);
    expect(run([onlyMap], { FLUMP_LAUNCH: "true" }).code).toBe(3);
    expect(run([dir]).code).toBe(0);
  });
  test("missing dir exits 3 when active; no dir exits 2", () => {
    expect(run([join(root, "nope")], { FLUMP_LAUNCH: "true" }).code).toBe(3);
    expect(run([], { FLUMP_LAUNCH: "true" }).code).toBe(2);
  });
});

const realDetails = (): BusinessDetails => {
  const clone = structuredClone(BUSINESS_DETAILS);
  for (const key of Object.keys(clone) as (keyof BusinessDetails)[])
    clone[key].isPlaceholder = false;
  return clone;
};

describe("business details guard", () => {
  test("reports every placeholder field and none once all are real", () => {
    expect(placeholderConfigFields().map((f) => f.key)).toEqual(
      expect.arrayContaining(["legalName", "companyNumber", "registeredOffice", "price"]),
    );
    expect(placeholderConfigFields(realDetails())).toEqual([]);
  });
  test("scans distinctive placeholder text, not the bare company number", () => {
    const ids = businessDetailPatterns().map((p) => p.id);
    expect(ids).toContain("business detail: registeredOffice");
    expect(ids).toContain("business detail: price");
    expect(ids).not.toContain("business detail: companyNumber");
    expect(businessDetailPatterns(realDetails())).toEqual([]);
  });
  test("a launch environment is ALLOW_INDEXING or FLUMP_LAUNCH exactly true", () => {
    expect(isLaunchGuardActive({ ALLOW_INDEXING: "true" })).toBe(true);
    expect(isLaunchGuardActive({ FLUMP_LAUNCH: "true" })).toBe(true);
    expect(isLaunchGuardActive({})).toBe(false);
  });
});
