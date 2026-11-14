import { describe, expect, it } from "vitest";
import { calculateUKTax, type TaxRecordFields } from "./tax-calculator.js";

/**
 * How logged payslips combine with the saved salary (2026/27, England, Wales and NI).
 * Month by month: a month with a logged payslip uses what was logged, every other month uses a
 * twelfth of the saved salary. A salary record for the whole year stands in for the saved salary.
 * Personal allowance 12,570; basic rate 20% on the next 37,700; higher rate 40%.
 */
const Y = "2026/27";
const SAVED = 58000;

let n = 0;
const record = (over: Partial<TaxRecordFields>): TaxRecordFields => ({
  id: `r${++n}`,
  type: "income",
  source: "paye",
  category: "paye_salary",
  name: "record",
  amount: 0,
  frequency: "one-off",
  date: "2026-06-25",
  endDate: null,
  notes: null,
  ...over,
});
const payslip = (amount: number, date: string) => record({ amount, date });
const profit = (amount: number) =>
  record({
    source: "self-employed",
    category: "self_employed_income",
    amount,
    frequency: "annual",
    date: "2026-04-06",
    endDate: "2027-04-05",
  });

describe("logged payslips and the saved salary", () => {
  it("with no payslip the saved salary is used as it is", () => {
    expect(calculateUKTax(Y, [], SAVED, 100).effectivePayeSalary).toBe(58000);
  });

  it("one payslip covers its own month and the saved salary covers the other eleven", () => {
    const r = calculateUKTax(Y, [payslip(5000, "2026-06-25")], SAVED, 100);
    // 58,000 x 11/12 = 53,166.67, plus the 5,000 logged for June.
    expect(r.effectivePayeSalary).toBeCloseTo(58166.67, 2);
  });

  it("58,000 saved salary, one payslip and 7,200 of self-employed income is not a bill of 0", () => {
    const r = calculateUKTax(Y, [payslip(5000, "2026-06-25"), profit(7200)], SAVED, 100);
    // Profit 7,200 - 1,000 trading allowance = 6,200. The salary already fills the basic rate
    // band (58,166.67 - 12,570 = 45,596.67 taxable), so all of it is taxed at 40%: 2,480.
    // Profit is under the 12,570 Class 4 lower limit, so no Class 4.
    expect(r.seProfit).toBe(6200);
    expect(r.seClass4NIDue).toBe(0);
    expect(r.netAdditionalTaxToPay).toBeCloseTo(2480, 2);
  });

  it("two payslips in the same month both count for that month", () => {
    const r = calculateUKTax(
      Y,
      [payslip(2500, "2026-06-10"), payslip(2500, "2026-06-25")],
      SAVED,
      100,
    );
    expect(r.effectivePayeSalary).toBeCloseTo(58166.67, 2);
  });

  it("a monthly salary record covers the months from its start; the saved salary covers the rest", () => {
    const monthly = record({ amount: 5000, frequency: "monthly", date: "2026-10-01" });
    // April to September: 58,000 x 6/12 = 29,000. October to March: 6 x 5,000 = 30,000.
    expect(calculateUKTax(Y, [monthly], SAVED, 100).effectivePayeSalary).toBe(59000);
  });

  it("a monthly salary record for the whole year replaces the saved salary", () => {
    const monthly = record({ amount: 4800, frequency: "monthly", date: "2026-04-06" });
    expect(calculateUKTax(Y, [monthly], SAVED, 100).effectivePayeSalary).toBe(57600);
  });

  it("a salary record for the whole year replaces the saved salary", () => {
    const annual = record({
      amount: 60000,
      frequency: "annual",
      date: "2026-04-06",
      endDate: "2027-04-05",
    });
    expect(calculateUKTax(Y, [annual], SAVED, 100).effectivePayeSalary).toBe(60000);
  });

  it("a payslip logged for a month before a monthly salary record starts covers only its month", () => {
    const monthly = record({ amount: 3000, frequency: "monthly", date: "2026-09-01" });
    // No saved salary. May payslip 2,000; September to March 7 x 3,000 = 21,000.
    const r = calculateUKTax(Y, [payslip(2000, "2026-05-28"), monthly], 0, 100);
    expect(r.effectivePayeSalary).toBe(23000);
  });

  it("with no saved salary the logged payslips are the whole salary", () => {
    expect(calculateUKTax(Y, [payslip(5000, "2026-06-25")], 0, 100).effectivePayeSalary).toBe(5000);
  });

  describe("tax year boundary", () => {
    it("a payslip dated 6 April counts in April of the year that starts that day", () => {
      const r = calculateUKTax(Y, [payslip(5000, "2026-04-06")], SAVED, 100);
      expect(r.effectivePayeSalary).toBeCloseTo(58166.67, 2);
    });

    it("a payslip dated 1 to 5 April belongs to the year that is ending, in its last month", () => {
      const early = [payslip(5000, "2026-04-02")];
      // Not in 2026/27, where every month uses the saved salary.
      expect(calculateUKTax(Y, early, SAVED, 100).effectivePayeSalary).toBe(58000);
      // In 2025/26 it covers March.
      expect(calculateUKTax("2025/26", early, SAVED, 100).effectivePayeSalary).toBeCloseTo(
        58166.67,
        2,
      );
    });

    it("a payslip dated 3 April 2027 covers March of 2026/27", () => {
      const r = calculateUKTax(Y, [payslip(5000, "2027-04-03")], SAVED, 100);
      expect(r.effectivePayeSalary).toBeCloseTo(58166.67, 2);
    });
  });

  describe("someone paid in the first five days of the month", () => {
    const payDates = [
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
      "2026-12-01",
      "2027-01-01",
      "2027-02-01",
      "2027-03-01",
      "2027-04-01",
    ];

    it("twelve payslips from 1 May to 1 April are the whole year, not thirteen months", () => {
      const slips = payDates.map((date) => payslip(5000, date));
      // The 1 April 2026 payslip belongs to 2025/26, so these twelve are every pay date in the year.
      expect(calculateUKTax(Y, slips, 60000, 100).effectivePayeSalary).toBe(60000);
    });

    it("eleven of the twelve leave one month to the saved salary", () => {
      const slips = payDates.slice(0, 11).map((date) => payslip(5000, date));
      // 11 x 5,000 + 58,000 / 12 = 59,833.33.
      expect(calculateUKTax(Y, slips, SAVED, 100).effectivePayeSalary).toBeCloseTo(59833.33, 2);
    });
  });

  describe("bonus records still add to the salary (C-10)", () => {
    const bonus = record({ category: "paye_bonus", amount: 3000, date: "2026-12-20" });

    it("a lone bonus adds to the saved salary", () => {
      expect(calculateUKTax(Y, [bonus], SAVED, 100).effectivePayeSalary).toBe(61000);
    });

    it("a bonus in a month with no payslip does not stop that month using the saved salary", () => {
      const r = calculateUKTax(Y, [bonus, payslip(5000, "2026-06-25")], SAVED, 100);
      expect(r.effectivePayeSalary).toBeCloseTo(61166.67, 2);
    });
  });
});
