import { describe, expect, it } from "vitest";
import {
  checkMtdQualifyingIncome,
  MTD_INCOME_TAX_SOURCES_CHECKED_ON,
  mtdIncomeTaxPosition,
  mtdIncomeTaxThreshold,
  mtdQualifyingIncomeForTaxYear,
} from "./mtd-income-tax.js";
import type { RentalShares, TaxRecordFields } from "./tax-calculator.js";

// Expected figures come from regulations 23, 26 and 27 of SI 2026/336 as made, read by
// fable-decider on 2026-11-25, never from the functions under test.

let nextId = 0;
const record = (fields: Partial<TaxRecordFields>): TaxRecordFields => ({
  id: `r${nextId++}`,
  type: "income",
  source: "self-employed",
  category: "self_employed_income",
  name: "Income",
  amount: 0,
  frequency: "annual",
  date: "2024-06-01",
  endDate: null,
  notes: null,
  accountId: null,
  ...fields,
});

describe("mtdIncomeTaxThreshold", () => {
  it("measures 2024/25 against £50,000 for 6 April 2026", () => {
    expect(mtdIncomeTaxThreshold("2024/25")).toMatchObject({
      thresholdGbp: 50_000,
      startDate: "2026-04-06",
    });
  });

  it("measures 2025/26 against £30,000 for 6 April 2027", () => {
    expect(mtdIncomeTaxThreshold("2025/26")).toMatchObject({
      thresholdGbp: 30_000,
      startDate: "2027-04-06",
    });
  });

  it("measures 2026/27 and later years against £20,000, two years on", () => {
    expect(mtdIncomeTaxThreshold("2026/27")).toMatchObject({
      thresholdGbp: 20_000,
      startDate: "2028-04-06",
    });
    // Regulation 27(c): "2026-27 and any subsequent tax year"; regulation 23: year Y-2.
    expect(mtdIncomeTaxThreshold("2027/28")).toMatchObject({
      thresholdGbp: 20_000,
      startDate: "2029-04-06",
    });
  });

  it("has no threshold before 2024/25 or for a malformed year", () => {
    expect(mtdIncomeTaxThreshold("2023/24")).toBeNull();
    expect(mtdIncomeTaxThreshold("2024")).toBeNull();
    expect(mtdIncomeTaxThreshold("x2024/25")).toBeNull();
    expect(mtdIncomeTaxThreshold("2024/25x")).toBeNull();
  });

  it("cites SI 2026/336 and the read date", () => {
    expect(mtdIncomeTaxThreshold("2024/25")?.source).toMatchObject({
      url: "https://www.legislation.gov.uk/uksi/2026/336/regulation/27/made",
      status: "verified",
    });
    expect(MTD_INCOME_TAX_SOURCES_CHECKED_ON).toBe("2026-11-25");
  });
});

describe("mtdQualifyingIncomeForTaxYear", () => {
  it("adds gross self-employed and rental income and ignores expenses", () => {
    const records = [
      record({ amount: 20_000 }),
      record({ source: "rental", category: "rental_income", amount: 1_000, frequency: "monthly" }),
      record({ type: "expense", category: "office_costs", amount: 9_000 }),
      record({ type: "expense", source: "rental", category: "repairs_maintenance", amount: 500 }),
    ];
    // 20,000 + 1,000 x 10 months (June 2024 to March 2025) = 30,000. Expenses are not deducted.
    expect(mtdQualifyingIncomeForTaxYear(records, "2024/25")).toBe(30_000);
  });

  it("leaves out employment and savings income", () => {
    const records = [
      record({ amount: 5_000 }),
      record({ source: "paye", category: "salary", amount: 60_000 }),
      record({ source: "savings", category: "savings_interest", amount: 2_000 }),
    ];
    expect(mtdQualifyingIncomeForTaxYear(records, "2024/25")).toBe(5_000);
  });

  it("counts only the person's share of rental income", () => {
    const shares: RentalShares = {
      byAccountId: { flat: 50 },
      unlinked: { share: 100, basis: "only-rental" },
    };
    const records = [
      record({ source: "rental", category: "rental_income", amount: 40_000, accountId: "flat" }),
      record({ amount: 10_000 }),
    ];
    // 40,000 x 50% + 10,000 = 30,000.
    expect(mtdQualifyingIncomeForTaxYear(records, "2024/25", shares)).toBe(30_000);
    // A self-employed record linked to the same account still counts in full: 30,000 + 5,000.
    const linkedTrade = [...records, record({ amount: 5_000, accountId: "flat" })];
    expect(mtdQualifyingIncomeForTaxYear(linkedTrade, "2024/25", shares)).toBe(35_000);
    // Without shares the whole rent counts: 40,000 + 10,000 = 50,000.
    expect(mtdQualifyingIncomeForTaxYear(records, "2024/25")).toBe(50_000);
  });

  it("is null when no qualifying income is recorded for the year", () => {
    expect(
      mtdQualifyingIncomeForTaxYear([record({ amount: 1, date: "2025-06-01" })], "2024/25"),
    ).toBeNull();
    expect(
      mtdQualifyingIncomeForTaxYear(
        [record({ type: "expense", category: "office_costs", amount: 1 })],
        "2024/25",
      ),
    ).toBeNull();
  });
});

describe("checkMtdQualifyingIncome", () => {
  const afterAll = "2026-11-25";

  it("is not over at exactly £50,000 and over at £50,001", () => {
    // Regulations 22 and 23: outside only if income "is not more than the qualifying amount".
    expect(
      checkMtdQualifyingIncome([record({ amount: 50_000 })], "2024/25", afterAll)?.status,
    ).toBe("notOver");
    expect(
      checkMtdQualifyingIncome([record({ amount: 50_001 })], "2024/25", afterAll)?.status,
    ).toBe("over");
  });

  it("uses £30,000 for 2025/26 at the edge", () => {
    const at = [record({ amount: 30_000, date: "2025-06-01" })];
    const above = [record({ amount: 30_000.01, date: "2025-06-01" })];
    expect(checkMtdQualifyingIncome(at, "2025/26", afterAll)?.status).toBe("notOver");
    expect(checkMtdQualifyingIncome(above, "2025/26", afterAll)?.status).toBe("over");
  });

  it("is unknown for an unfinished year that is not over yet, and over once it is", () => {
    // 2026/27 is still running on 25 November 2026.
    const partial = [record({ amount: 20_000, date: "2026-06-01" })];
    const over = [record({ amount: 20_001, date: "2026-06-01" })];
    expect(checkMtdQualifyingIncome(partial, "2026/27", afterAll)?.status).toBe("unknown");
    expect(checkMtdQualifyingIncome(over, "2026/27", afterAll)?.status).toBe("over");
    // The day after 2026/27 ends, the same £20,000 is a finished year: not over.
    expect(checkMtdQualifyingIncome(partial, "2026/27", "2027-04-06")?.status).toBe("notOver");
    expect(checkMtdQualifyingIncome(partial, "2026/27", "2027-04-05")?.status).toBe("unknown");
  });

  it("is unknown with nothing recorded and reports the recorded income", () => {
    expect(checkMtdQualifyingIncome([], "2024/25", afterAll)).toMatchObject({
      status: "unknown",
      recordedQualifyingIncomeGbp: null,
    });
    expect(
      checkMtdQualifyingIncome([record({ amount: 51_000 })], "2024/25", afterAll),
    ).toMatchObject({ recordedQualifyingIncomeGbp: 51_000 });
  });

  it("is null for a year the rules do not measure", () => {
    expect(checkMtdQualifyingIncome([], "2023/24", afterAll)).toBeNull();
  });
});

describe("mtdIncomeTaxPosition", () => {
  const asOf = "2026-11-25";

  it("picks the earliest measured year that is over", () => {
    const records = [
      record({ amount: 35_000, date: "2025-06-01" }),
      record({ amount: 25_000, date: "2026-06-01" }),
    ];
    // 2024/25: nothing. 2025/26: 35,000 > 30,000, so 6 April 2027 comes before 2026/27's 2028.
    const position = mtdIncomeTaxPosition({ records, asOf });
    expect(position.kind).toBe("over");
    expect(position.kind === "over" && position.check.threshold.startDate).toBe("2027-04-06");
  });

  it("is over for 2024/25 above £50,000 even when later years are lower", () => {
    const records = [record({ amount: 60_000 }), record({ amount: 10_000, date: "2025-06-01" })];
    const position = mtdIncomeTaxPosition({ records, asOf });
    expect(position.kind === "over" && position.check.threshold.startDate).toBe("2026-04-06");
  });

  it("counts the current tax year once it is over", () => {
    // 25 November 2026 is in 2026/27: 25,000 > 20,000 gives 6 April 2028.
    const records = [record({ amount: 25_000, date: "2026-06-01" })];
    const position = mtdIncomeTaxPosition({ records, asOf });
    expect(position.kind === "over" && position.check.threshold.startDate).toBe("2028-04-06");
  });

  it("is unknown for a self-employed user with no records", () => {
    expect(mtdIncomeTaxPosition({ records: [], employmentType: "self-employed", asOf }).kind).toBe(
      "unknown",
    );
  });

  it("is unknown for a landlord with figures not over the thresholds", () => {
    const records = [
      record({ source: "rental", category: "rental_income", amount: 12_000 }),
      record({ source: "paye", category: "salary", amount: 40_000 }),
    ];
    expect(mtdIncomeTaxPosition({ records, employmentType: "employed", asOf }).kind).toBe(
      "unknown",
    );
  });

  it("is none for an employed user with no self-employed or property records", () => {
    const records = [record({ source: "paye", category: "salary", amount: 90_000 })];
    expect(mtdIncomeTaxPosition({ records, employmentType: "employed", asOf }).kind).toBe("none");
  });

  it("stays unknown while the current tax year runs, even when finished years are not over", () => {
    // On 6 April 2027 2024/25, 2025/26 and 2026/27 are finished and none is over, but 2027/28 has
    // just started, and its income is measured for 6 April 2029. So a self-employed user still
    // sees the general line.
    const records = [
      record({ amount: 50_000 }),
      record({ amount: 30_000, date: "2025-06-01" }),
      record({ amount: 20_000, date: "2026-06-01" }),
    ];
    expect(mtdIncomeTaxPosition({ records, asOf: "2027-04-06" }).kind).toBe("unknown");
  });
});
