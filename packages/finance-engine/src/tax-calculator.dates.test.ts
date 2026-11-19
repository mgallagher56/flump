import { describe, expect, it } from "vitest";
import {
  buildCopiedRecordForTaxYear,
  getNextTaxYear,
  getPreviousTaxYear,
  getRecordAnnualTotalForTaxYear,
  getTaxYearForDate,
  type TaxRecord,
} from "./tax-calculator.js";

/**
 * Tax year labels, record values and copying a record to another year. The UK tax year runs
 * from 6 April to 5 April (GOV.UK "Income Tax rates and Personal Allowances"), labelled "YYYY/YY"
 * by the year it starts in.
 */
const record = (over: Partial<TaxRecord> = {}): TaxRecord => ({
  id: "r1",
  userId: "u1",
  type: "income",
  source: "rental",
  category: "rental_income",
  name: "Rent",
  amount: 100,
  frequency: "one-off",
  date: "2024-06-01",
  endDate: null,
  notes: null,
  receiptFilename: null,
  receiptMimeType: null,
  receiptData: null,
  createdAt: "2024-06-01",
  updatedAt: "2024-06-01",
  ...over,
});

describe("getTaxYearForDate", () => {
  it("reads the date from the start of an ISO string even when text follows it", () => {
    // 6 April 2025 starts 2025/26. "2025-04-06 x" is not a date the Date parser reads, so only
    // the ISO prefix can give the year.
    expect(getTaxYearForDate("2025-04-06 x")).toBe("2025/26");
  });

  it("falls back to the date parser for strings that are not YYYY-MM-DD", () => {
    // 10 April 2025 and 6 April 2025 are both on or after 6 April: 2025/26.
    expect(getTaxYearForDate("April 10, 2025")).toBe("2025/26");
    expect(getTaxYearForDate("2025-04-6")).toBe("2025/26");
    expect(getTaxYearForDate("Sun 2025-04-06")).toBe("2025/26");
  });

  it("puts 5 April in the year that ends and 6 April in the year that starts", () => {
    expect(getTaxYearForDate("2025-04-05")).toBe("2024/25");
    expect(getTaxYearForDate("2025-04-06")).toBe("2025/26");
  });
});

describe("getPreviousTaxYear and getNextTaxYear", () => {
  it("step one year back and forward", () => {
    expect(getPreviousTaxYear("2025/26")).toBe("2024/25");
    expect(getNextTaxYear("2025/26")).toBe("2026/27");
  });

  it("carry across a century", () => {
    expect(getPreviousTaxYear("2100/01")).toBe("2099/00");
    expect(getNextTaxYear("2099/00")).toBe("2100/01");
  });

  it("return a label that is not a year unchanged", () => {
    expect(getPreviousTaxYear("not a year")).toBe("not a year");
    expect(getNextTaxYear("not a year")).toBe("not a year");
  });
});

describe("record amounts stored as text", () => {
  it("reads a decimal amount sent as a string", () => {
    // 100.50 a month for the twelve months of 2025/26 = 1,206.
    const r = record({ amount: "100.5", frequency: "monthly", date: "2025-04-10" });
    expect(getRecordAnnualTotalForTaxYear(r, "2025/26")).toBe(1206);
  });

  it("counts an amount that is not a number as nothing", () => {
    expect(getRecordAnnualTotalForTaxYear(record({ amount: "" }), "2024/25")).toBe(0);
    expect(getRecordAnnualTotalForTaxYear(record({ amount: "abc" }), "2024/25")).toBe(0);
  });
});

describe("buildCopiedRecordForTaxYear", () => {
  it("moves the date one year on when the target is not a year label", () => {
    expect(buildCopiedRecordForTaxYear(record(), "not a year").date).toBe("2025-06-01");
  });

  it("keeps an end date that is not YYYY-MM-DD as it is", () => {
    expect(buildCopiedRecordForTaxYear(record({ endDate: "open" }), "2025/26").endDate).toBe(
      "open",
    );
  });

  it("follows the century leap year rule for 29 February", () => {
    // 2100 is divisible by 100 but not 400, so not a leap year: 29 Feb becomes 28 Feb.
    // 29 Feb 2096 is in 2095/96; copied to 2099/00 it moves 4 years, to 2100.
    expect(buildCopiedRecordForTaxYear(record({ date: "2096-02-29" }), "2099/00").date).toBe(
      "2100-02-28",
    );
    // 2000 is divisible by 400, so a leap year: 29 Feb stays. 1995/96 to 1999/00 is 4 years.
    expect(buildCopiedRecordForTaxYear(record({ date: "1996-02-29" }), "1999/00").date).toBe(
      "2000-02-29",
    );
  });

  it("changes only 29 February, not the 29th of another month or another February day", () => {
    // Both dates are in 2023/24; copied to 2024/25 they move to 2025, not a leap year.
    expect(buildCopiedRecordForTaxYear(record({ date: "2024-03-29" }), "2024/25").date).toBe(
      "2025-03-29",
    );
    expect(buildCopiedRecordForTaxYear(record({ date: "2024-02-15" }), "2024/25").date).toBe(
      "2025-02-15",
    );
  });

  it("moves a short year reference in the name", () => {
    const copy = buildCopiedRecordForTaxYear(
      record({ date: "2024-03-01", name: "Rent 23/24" }),
      "2024/25",
    );
    expect(copy.name).toBe("Rent 24/25");
  });

  it("uses the amount given in place of the record's own", () => {
    expect(buildCopiedRecordForTaxYear(record({ amount: 100 }), "2025/26", 500).amount).toBe(500);
    expect(buildCopiedRecordForTaxYear(record({ amount: 100 }), "2025/26").amount).toBe(100);
  });

  it("turns an amount stored as text into a number", () => {
    expect(buildCopiedRecordForTaxYear(record({ amount: "250.75" }), "2025/26").amount).toBe(
      250.75,
    );
  });

  it("keeps the record's notes after the copied-from line", () => {
    const copy = buildCopiedRecordForTaxYear(record({ notes: "First flat" }), "2025/26");
    expect(copy.notes).toBe("Copied from 2024/25: First flat");
  });
});
