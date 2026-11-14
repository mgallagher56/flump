import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { UK_TAX_VECTORS } from "../packages/finance-engine/src/test-vectors/uk-tax.vectors";
import { UK_WHATIF_VECTORS } from "../packages/finance-engine/src/test-vectors/uk-whatif.vectors";
import { compareUnsignedToBaseline, unsignedVectorIds } from "./lib/tax-signoff";

describe("unsigned tax vector ratchet (BE-08)", () => {
  test("lists only vectors with signedOffBy null, sorted and unique", () => {
    const ids = unsignedVectorIds([
      { id: "b", signedOffBy: null },
      { id: "a", signedOffBy: null },
      { id: "c", signedOffBy: "owner" },
      { id: "a", signedOffBy: null },
    ]);
    expect(ids).toEqual(["a", "b"]);
  });

  test("a new unsigned vector fails", () => {
    expect(compareUnsignedToBaseline(["a", "b", "new"], ["a", "b"])).toEqual({
      added: ["new"],
      stale: [],
    });
  });

  test("a signed-off vector only makes the baseline stale", () => {
    expect(compareUnsignedToBaseline(["a"], ["a", "b"])).toEqual({ added: [], stale: ["b"] });
  });

  test("the committed baseline matches the catalogues", () => {
    const baseline = JSON.parse(
      readFileSync(resolve(import.meta.dir, "tax-signoff-baseline.json"), "utf8"),
    );
    const now = unsignedVectorIds([...UK_TAX_VECTORS, ...UK_WHATIF_VECTORS]);
    expect(compareUnsignedToBaseline(now, baseline)).toEqual({ added: [], stale: [] });
  });
});
