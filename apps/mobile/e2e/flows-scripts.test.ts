/**
 * @jest-environment node
 */
/**
 * knip treats every file in e2e/scripts as an entry (the flows call them from YAML, which knip
 * cannot read). This keeps a dead script from hiding behind that glob: each one must be named by a
 * `runScript` in a flow or subflow, and each named script must exist (E12 S2a, coordinator).
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const e2e = __dirname;
const yaml = ["flows", "subflows"].flatMap((dir) =>
  readdirSync(join(e2e, dir))
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => readFileSync(join(e2e, dir, f), "utf8")),
);
const named = new Set(
  yaml.flatMap((text) =>
    [...text.matchAll(/file:\s*\.\.\/scripts\/([\w-]+\.js)/g)].map((m) => m[1]),
  ),
);
const scripts = readdirSync(join(e2e, "scripts")).filter((f) => f.endsWith(".js"));

describe("Maestro scripts", () => {
  it.each(scripts)("%s is called by a flow", (script) => {
    expect(named).toContain(basename(script));
  });

  it("every script a flow calls exists", () => {
    expect([...named].filter((s) => !scripts.includes(s ?? ""))).toEqual([]);
  });
});
