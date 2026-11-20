import { describe, expect, test } from "bun:test";
import { evaluateSignoff } from "../packages/finance-engine/src/test-vectors/signoff";
import {
  UK_TAX_VECTORS,
  type UkTaxVector,
} from "../packages/finance-engine/src/test-vectors/uk-tax.vectors";
import { UK_WHATIF_VECTORS } from "../packages/finance-engine/src/test-vectors/uk-whatif.vectors";
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
    const r = applySignoff(
      file,
      v.taxYear,
      [{ id: v.id }],
      UK_TAX_VECTORS,
      "2026-12-01",
      "fable-decider",
    );
    expect(r.signed).toEqual([v.id]);
    expect(r.text.match(/signedOffBy: null/g)?.length).toBe(2);
    expect(r.text).toContain('signedOffBy: "fable-decider",');
    const hash = /signedOffHash: "([0-9a-f]{64})"/.exec(r.text)?.[1];
    expect(
      evaluateSignoff({
        ...v,
        signedOffBy: "fable-decider",
        signedOffAt: "2026-12-01",
        signedOffHash: hash,
      }).state,
    ).toBe("signed");
  });
  test("writes the signer exactly as given, and refuses a name that is not plain", () => {
    const r = applySignoff(
      fake(v.id),
      v.taxYear,
      [{ id: v.id }],
      UK_TAX_VECTORS,
      "2026-12-01",
      "owner",
    );
    expect(r.text).toContain('signedOffBy: "owner",');
    for (const bad of ["", "a b", 'x"y', "-x"]) {
      expect(() =>
        applySignoff(fake(v.id), v.taxYear, [{ id: v.id }], UK_TAX_VECTORS, "2026-12-01", bad),
      ).toThrow("not a valid signer name");
    }
  });
  test("skips UNVERIFIED without ruling, wrong year, unknown id", () => {
    const file = fake(u.id);
    const r = applySignoff(
      file,
      u.taxYear,
      [{ id: u.id }, { id: "nope" }, { id: v.id }],
      UK_TAX_VECTORS,
      "2026-12-01",
      "fable-decider",
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
      "fable-decider",
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
  test("apply refuses in CI, even with a signer", () => {
    const r = run(["apply", "--year", "2026/27", "--sheet", "x", "--signer", "fable-decider"], {
      CI: "true",
    });
    expect(r.exitCode).toBe(2);
    expect(r.stderr.toString()).toContain("Refusing to sign off in CI");
  });
  test("apply needs --signer with a plain name", () => {
    for (const extra of [[], ["--signer"], ["--signer", "a b"], ["--signer", "--sheet"]]) {
      const r = run(["apply", "--year", "2026/27", "--sheet", "x", ...extra], { CI: "" });
      expect(r.exitCode, extra.join(" ")).toBe(2);
      expect(r.stderr.toString()).toContain("--signer <name> is required");
    }
  });
  test("the old owner flag is gone", () => {
    const r = run(["apply", "--year", "2026/27", "--sheet", "x", "--i-am-the-owner"], { CI: "" });
    expect(r.exitCode).toBe(2);
    expect(r.stderr.toString()).toContain("--signer <name> is required");
  });
});

describe("E25 what-if catalogue sign-off", () => {
  const w = UK_WHATIF_VECTORS[0] as (typeof UK_WHATIF_VECTORS)[number];
  test("the sheet lists what-if vectors alongside the core ones", () => {
    const all = [...UK_TAX_VECTORS, ...UK_WHATIF_VECTORS];
    const sheet = generateSheet(w.taxYear, all);
    expect(sheet).toContain(`\`${w.id}\``);
    expect(sheet.match(/^- \[ \] /gm)?.length).toBe(
      all.filter((x) => x.taxYear === w.taxYear).length,
    );
  });
  test("an UNVERIFIED what-if vector is skipped without a ruling and signed with one", () => {
    const file = fake(w.id);
    const skipped = applySignoff(
      file,
      w.taxYear,
      [{ id: w.id }],
      UK_WHATIF_VECTORS,
      "2026-12-01",
      "fable-decider",
    );
    expect(skipped.signed).toEqual([]);
    expect(skipped.skipped[0]?.reason).toContain("needs a ruling");
    const signed = applySignoff(
      file,
      w.taxYear,
      [{ id: w.id, ruling: "owner ruled" }],
      UK_WHATIF_VECTORS,
      "2026-12-01",
      "fable-decider",
    );
    expect(signed.signed).toEqual([w.id]);
  });
});
