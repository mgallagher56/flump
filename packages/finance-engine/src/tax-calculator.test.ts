import { describe, expect, it } from "vitest";
import {
  buildCopiedRecordForTaxYear,
  calculateUKTax,
  getMonthsForTaxYear,
  getTaxYearForRecordDate,
  type TaxRecord,
} from "./tax-calculator.js";
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
  // taxable 120000. Per HMRC the 500 dividend allowance still occupies band space, so dividends
  // occupy 120000 to 130500: first 500 at 0%, then 125140 - 120500 = 4640 at 33.75% (higher) and
  // 130500 - 125140 = 5360 at 39.35% (additional). 2025/26 dividend rates.
  // Source: https://www.gov.uk/tax-on-dividends
  it("dividends straddling taxable 125140 split between higher and additional rates", () => {
    const r = calculateUKTax("2025/26", [dividendRecord(10500, "2025-06-01")], 120000, 100);
    expect(r.dividendTaxDue).toBeCloseTo(4640 * 0.3375 + 5360 * 0.3935, 2);
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

describe("dividend vectors through calculateUKTax", () => {
  const vectors = selectUkTaxVectors({ kind: "dividends" });

  it("has dividend vectors for every supported year", () => {
    expect(vectors.length).toBeGreaterThanOrEqual(18);
  });

  it("dividendTaxDue matches every dividend vector in the catalogue", () => {
    for (const v of vectors) {
      const { employmentIncome, dividendIncome } = v.input as {
        employmentIncome: number;
        dividendIncome: number;
      };
      const date = `${v.taxYear.slice(0, 4)}-07-01`;
      const r = calculateUKTax(
        v.taxYear,
        [dividendRecord(dividendIncome, date)],
        employmentIncome,
        100,
      );
      expect(roundPence(r.dividendTaxDue), v.id).toBeCloseTo(v.expected, 2);
    }
  });
});

describe("getTaxYearForRecordDate (whole-month bucketing, matches getMonthsForTaxYear)", () => {
  it("files a record by its calendar month: April onwards starts the tax year, Jan-Mar ends it", () => {
    // Month bucketing: tax year N/N+1 owns months N-04 .. (N+1)-03, so a 1-5 April date
    // belongs to the year starting that April (unlike getTaxYearForDate's 6 April boundary).
    expect(getTaxYearForRecordDate("2024-04-01")).toBe("2024/25");
    expect(getTaxYearForRecordDate("2024-04-05")).toBe("2024/25");
    expect(getTaxYearForRecordDate("2024-04-06")).toBe("2024/25");
    expect(getTaxYearForRecordDate("2025-03-31")).toBe("2024/25");
    expect(getTaxYearForRecordDate("2025-01-15")).toBe("2024/25");
    expect(getTaxYearForRecordDate("2024-12-31")).toBe("2024/25");
    expect(getTaxYearForRecordDate("2025-04-01")).toBe("2025/26");
  });

  it("agrees with getMonthsForTaxYear for every date's own month", () => {
    for (const date of ["2024-04-01", "2024-04-05", "2025-03-31", "2026-01-02"]) {
      const year = getTaxYearForRecordDate(date);
      expect(getMonthsForTaxYear(year)).toContain(date.substring(0, 7));
    }
  });
});

describe("buildCopiedRecordForTaxYear derives the source year by month bucketing", () => {
  const base = { ...dividendRecord(100, "2024-04-01"), name: "Salary (2024/25)" };

  // Source year for all four dates is 2024/25 (see above); target 2025/26 => yearDiff 1,
  // so each date moves forward exactly one year with day and month unchanged.
  it.each([
    ["2024-04-01", "2025-04-01"],
    ["2024-04-05", "2025-04-05"],
    ["2024-04-06", "2025-04-06"],
    ["2025-03-31", "2026-03-31"],
  ])("copies %s to 2025/26 as %s", (from, to) => {
    const copy = buildCopiedRecordForTaxYear({ ...base, date: from }, "2025/26");
    expect(copy.date).toBe(to);
    expect(copy.name).toBe("Salary (2025/26)");
    expect(copy.notes).toBe("Copied from 2024/25");
  });

  it("shifts endDate by the same whole-year difference", () => {
    const copy = buildCopiedRecordForTaxYear(
      { ...base, date: "2024-04-01", endDate: "2025-03-31" },
      "2025/26",
    );
    expect(copy.endDate).toBe("2026-03-31");
  });
});
