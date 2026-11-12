import { describe, expect, test } from "bun:test";
import { evaluateSignoff } from "../packages/finance-engine/src/test-vectors/signoff";
import {
  UK_TAX_VECTORS,
  type UkTaxVector,
} from "../packages/finance-engine/src/test-vectors/uk-tax.vectors";
import { applySignoff, generateSheet, parseTicked } from "./lib/tax-signoff";

const v = UK_TAX_VECTORS.find((x) => x.status === "VERIFIED") as UkTaxVector;
const u = UK_TAX_VECTORS.find((x) => x.status === "UNVERIFIED") as UkTaxVector;
const fake = (id: string, extra = "") =>
  `  {\n    id: "${id}",\n    taxYear: "x",\n    signedOffBy: null,${extra}\n  },\n`;

describe("tax sign-off sheet", () => {
  test("lists every vector of the year as unticked", () => {
    const sheet = generateSheet(v.taxYear, UK_TAX_VECTORS);
    const n = UK_TAX_VECTORS.filter((x) => x.taxYear === v.taxYear).length;
    expect(sheet.match(/^- \[ \] /gm)?.length).toBe(n);
    expect(parseTicked(sheet)).toEqual([]);
  });
  test("parses ticked ids and rulings", () => {
    const sheet = `- [x] \`${v.id}\` a\n  - source: s\n- [x] \`${u.id}\` b\n  - ruling: ruling one\n- [ ] \`other\` c\n`;
    expect(parseTicked(sheet)).toEqual([{ id: v.id }, { id: u.id, ruling: "ruling one" }]);
  });
});

describe("applySignoff", () => {
  test("signs the right vector only, with a hash that validates", () => {
    const file = fake("a") + fake(v.id) + fake("b");
    const r = applySignoff(file, v.taxYear, [{ id: v.id }], UK_TAX_VECTORS, "2026-12-01");
    expect(r.signed).toEqual([v.id]);
    expect(r.text.match(/signedOffBy: null/g)?.length).toBe(2);
    const hash = /signedOffHash: "([0-9a-f]{64})"/.exec(r.text)?.[1];
    expect(
      evaluateSignoff({
        ...v,
        signedOffBy: "owner",
        signedOffAt: "2026-12-01",
        signedOffHash: hash,
      }).state,
    ).toBe("signed");
  });
  test("skips UNVERIFIED without ruling, wrong year, unknown id", () => {
    const file = fake(u.id);
    const r = applySignoff(
      file,
      u.taxYear,
      [{ id: u.id }, { id: "nope" }, { id: v.id }],
      UK_TAX_VECTORS,
      "2026-12-01",
    );
    expect(r.signed).toEqual([]);
    expect(r.skipped.map((s) => s.id).sort()).toEqual([u.id, "nope", v.id].sort());
    expect(r.text).toBe(file);
  });
  test("a ruling is recorded as rulingRef", () => {
    const r = applySignoff(
      fake(u.id),
      u.taxYear,
      [{ id: u.id, ruling: "R1" }],
      UK_TAX_VECTORS,
      "2026-12-01",
    );
    expect(r.text).toContain('rulingRef: "R1"');
  });
});

describe("CLI guards", () => {
  const run = (args: string[], env: Record<string, string> = {}) =>
    Bun.spawnSync(["bun", "scripts/tax-signoff.ts", ...args], {
      cwd: `${import.meta.dir}/..`,
      env: { ...process.env, ...env },
    });
  test("apply refuses in CI and without the owner flag", () => {
    expect(
      run(["apply", "--year", "2026/27", "--sheet", "x", "--i-am-the-owner"], { CI: "true" })
        .exitCode,
    ).toBe(2);
    expect(run(["apply", "--year", "2026/27", "--sheet", "x"], { CI: "" }).exitCode).toBe(2);
  });
});
