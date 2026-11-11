import { describe, expect, it } from "vitest";
import { calculateUKTax, type TaxRecord } from "./tax-calculator.js";
import { calculateUKEWNIIncomeTaxOnTaxable, UK_EWNI_INCOME_TAX } from "./tax-rules.js";
import { selectUkTaxVectors } from "./test-vectors/uk-tax.vectors.js";
import { roundPence } from "./uk-tax-year.js";

function dividendRecord(amount: number, date: string): TaxRecord {
  return {
    id: "d1",
    userId: "u1",
    type: "income",
    source: "savings",
    category: "dividend_income",
    name: "Dividends",
    amount,
    frequency: "one-off",
    date,
    endDate: null,
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: date,
    updatedAt: date,
  };
}

function savingsRecord(amount: number, date: string): TaxRecord {
  return { ...dividendRecord(amount, date), category: "savings_interest", name: "Interest" };
}

describe("calculateUKEWNIIncomeTaxOnTaxable (shared EWNI band function)", () => {
  // Source: https://www.gov.uk/income-tax-rates (2025/26, 2026/27): additional rate
  // above 125,140 taxable income. 37,700 x 20% + (125,140 - 37,700) x 40% = 7,540 + 34,976.
  it("125140 taxable 2025/26 is 42516 (45% starts above taxable 125140)", () => {
    expect(calculateUKEWNIIncomeTaxOnTaxable(125140, UK_EWNI_INCOME_TAX["2025/26"]!)).toBe(42516);
  });

  // 42516 + (150000 - 125140) x 45% = 42516 + 11187 = 53703
  it("150000 taxable 2026/27 is 53703", () => {
    expect(calculateUKEWNIIncomeTaxOnTaxable(150000, UK_EWNI_INCOME_TAX["2026/27"]!)).toBe(53703);
  });

  // Pre-2023/24 the additional rate starts above taxable 150,000 (2020/21: 37500 x 20% + 112500 x 40%).
  it("150000 taxable 2020/21 has no additional-rate tax (52500)", () => {
    expect(calculateUKEWNIIncomeTaxOnTaxable(150000, UK_EWNI_INCOME_TAX["2020/21"]!)).toBe(52500);
  });
});

describe("calculateUKTax uses the shared EWNI band function", () => {
  it("150000 salary 2026/27 totalIncomeTaxDue is 53703", () => {
    expect(calculateUKTax("2026/27", [], 150000, 100).totalIncomeTaxDue).toBe(53703);
  });

  it("125140 salary 2025/26 totalIncomeTaxDue is 42516", () => {
    expect(calculateUKTax("2025/26", [], 125140, 100).totalIncomeTaxDue).toBe(42516);
  });

  // 140000 salary: PA 0, taxable 140000 (above 125140). Dividends 5000 stack above it, all in the
  // additional dividend band: (5000 - 500 allowance) x 39.35% = 1770.75 (vector dividends.2026-27.additional).
  it("dividends above taxable 125140 are taxed at the additional dividend rate", () => {
    const r = calculateUKTax("2026/27", [dividendRecord(5000, "2026-06-01")], 140000, 100);
    expect(r.taxableDividends).toBe(4500);
    expect(r.dividendTaxDue).toBeCloseTo(1770.75, 2);
  });

  // 120000 salary + 10500 dividends: gross 130500, taper floor(30500/2)=15250 so PA 0. Non-dividend
  // taxable 120000; taxable dividends 10500 - 500 = 10000 stack from 120000: higher band up to
  // 125140 is 5140 x 33.75%, the remaining 4860 x 39.35% (2025/26 dividend rates).
  it("dividends straddling taxable 125140 split between higher and additional rates", () => {
    const r = calculateUKTax("2025/26", [dividendRecord(10500, "2025-06-01")], 120000, 100);
    expect(r.dividendTaxDue).toBeCloseTo(5140 * 0.3375 + 4860 * 0.3935, 2);
  });

  // PSA band is chosen from taxable income. 130000 salary: PA 0, taxable 130000 > 125140 -> PSA 0.
  it("additional-rate taxpayer gets no personal savings allowance", () => {
    const r = calculateUKTax("2025/26", [savingsRecord(2000, "2025-06-01")], 130000, 100);
    expect(r.personalSavingsAllowance).toBe(0);
  });

  // Gross 125140 exactly: PA 0, taxable 125140 is not above the threshold -> higher-rate PSA 500.
  it("taxable income exactly 125140 is still higher rate for the PSA", () => {
    const r = calculateUKTax("2025/26", [savingsRecord(2000, "2025-06-01")], 123140, 100);
    expect(r.totalGrossIncome).toBe(125140);
    expect(r.personalSavingsAllowance).toBe(500);
  });
});

describe("EWNI income tax vectors through the shared band function", () => {
  const vectors = selectUkTaxVectors({ kind: "incomeTax", region: "ENGLAND_NI_WALES" });

  it("has vectors to check", () => {
    expect(vectors.length).toBeGreaterThan(20);
  });

  it("calculateUKTax totalIncomeTaxDue matches every vector", () => {
    for (const v of vectors) {
      const gross = (v.input as { grossIncome: number }).grossIncome;
      const r = calculateUKTax(v.taxYear, [], gross, 100);
      expect(roundPence(r.totalIncomeTaxDue), v.id).toBeCloseTo(v.expected, 2);
    }
  });
});
