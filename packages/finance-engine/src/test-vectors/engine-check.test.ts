import { describe, expect, it } from "vitest";
import { ENGINE_CHECK_KINDS, runEngineCheck } from "./engine-check.js";
import { selectUkTaxVectors, UK_TAX_VECTORS, type UkTaxVector } from "./uk-tax.vectors.js";

// The engine check on V8. The mobile app runs the same function on Hermes (E12 S1a).
describe("runEngineCheck", () => {
  it("checks every income tax, Gift Aid and employer NI vector and finds no failure", () => {
    const expectedCount =
      selectUkTaxVectors({ kind: "incomeTax" }).length +
      selectUkTaxVectors({ kind: "giftAid" }).length +
      selectUkTaxVectors({ kind: "employerNiSaving" }).length;
    const result = runEngineCheck();
    expect(result.failures).toEqual([]);
    expect(result.checked).toBe(expectedCount);
    // Both regions are present: at least 37 Scotland income tax and 16 Scotland Gift Aid vectors.
    expect(selectUkTaxVectors({ kind: "incomeTax", region: "SCOTLAND" }).length).toBeGreaterThan(
      36,
    );
  });

  it("leaves out the kinds it has no evaluator for", () => {
    const others = UK_TAX_VECTORS.filter(
      (v) => !(ENGINE_CHECK_KINDS as readonly string[]).includes(v.kind),
    );
    expect(others.length).toBeGreaterThan(0);
    expect(runEngineCheck(others)).toEqual({ checked: 0, failures: [] });
  });

  // One vector per kind with its expected value moved by a penny: the check must report each.
  it.each(ENGINE_CHECK_KINDS)("reports a %s vector whose expected value is a penny out", (kind) => {
    const [vector] = selectUkTaxVectors({ kind });
    const tampered: UkTaxVector = { ...vector, expected: vector.expected + 0.01 };
    const result = runEngineCheck([tampered]);
    expect(result.checked).toBe(1);
    expect(result.failures).toEqual([
      { id: vector.id, expected: vector.expected + 0.01, actual: vector.expected },
    ]);
  });

  it("routes a Scotland income tax vector through the Scottish bands", () => {
    // 2025/26 Scotland, 50000 gross: the Scottish bands give a different figure from England's,
    // so a check that dropped the region would fail this vector.
    const scot = selectUkTaxVectors({ kind: "incomeTax", region: "SCOTLAND", taxYear: "2025/26" });
    const ewni = selectUkTaxVectors({
      kind: "incomeTax",
      region: "ENGLAND_NI_WALES",
      taxYear: "2025/26",
    });
    const pair = scot.find((s) =>
      ewni.some(
        (e) =>
          (e.input as { grossIncome: number }).grossIncome ===
            (s.input as { grossIncome: number }).grossIncome && e.expected !== s.expected,
      ),
    );
    expect(pair).toBeDefined();
    expect(runEngineCheck([pair as UkTaxVector]).failures).toEqual([]);
  });
});
