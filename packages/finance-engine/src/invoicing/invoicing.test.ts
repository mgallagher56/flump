import { describe, expect, it } from "vitest";
import {
  calculateInvoiceTotals,
  calculateWorkItemAmount,
  calculateWorkLogAmount,
  formatInvoiceNumber,
  getUkTaxYearForDate,
  roundHalfUpPence,
  summarizeInvoicingKpis,
} from "./index.js";

describe("invoicing pure engine (E37 S0)", () => {
  describe("IV1 & IV2: calculateWorkLogAmount / calculateWorkItemAmount", () => {
    it("IV1: multiplies fractional hours by hourly rate to 2 decimal places", () => {
      // Working: 7.5 hours x £65.00/hour = £487.50
      expect(calculateWorkLogAmount(7.5, 65)).toBe(487.5);
      // Working: 2.25 hours x £85.00/hour = £191.25
      expect(calculateWorkItemAmount(2.25, 85)).toBe(191.25);
      // Working: 0.1 hours x £0.20/hour = £0.02 (avoids IEEE-754 0.020000000000000004)
      expect(calculateWorkLogAmount(0.1, 0.2)).toBe(0.02);
    });

    it("IV2: rounds half-penny boundaries up to the nearest penny and handles zeros", () => {
      // Working: 0.25 x 40.02 = 10.005 -> half a penny rounds up to £10.01
      expect(calculateWorkLogAmount(0.25, 40.02)).toBe(10.01);
      // Working: 10 x 3.5855 = 35.855 (IEEE-754 * 100 = 3585.4999999999995) -> rounds up to £35.86
      expect(calculateWorkLogAmount(10, 3.5855)).toBe(35.86);
      // Working: 0.5 x 0.01 = 0.005 -> half a penny below 1.00 still rounds up to £0.01
      expect(roundHalfUpPence(0.005)).toBe(0.01);
      // Working: 0.5 x 20.008 = 10.004 (below half-penny) -> rounds down to £10.00
      expect(calculateWorkLogAmount(0.5, 20.008)).toBe(10);
      // Working: 0 hours x £85.00 = £0.00; 4 hours x £0.00 = £0.00
      expect(calculateWorkLogAmount(0, 85)).toBe(0);
      expect(calculateWorkLogAmount(4, 0)).toBe(0);
    });

    it("rejects negative or non-finite inputs", () => {
      expect(() => calculateWorkLogAmount(-0.01, 50)).toThrow(
        new RangeError("hoursWorked must be a non-negative finite number"),
      );
      expect(() => calculateWorkLogAmount(1, -0.01)).toThrow(
        new RangeError("hourlyRate must be a non-negative finite number"),
      );
      expect(() => calculateWorkLogAmount(Number.NaN, 50)).toThrow(
        new RangeError("hoursWorked must be a non-negative finite number"),
      );
      expect(() => calculateWorkLogAmount(1, Number.POSITIVE_INFINITY)).toThrow(
        new RangeError("hourlyRate must be a non-negative finite number"),
      );
    });
  });

  describe("IV3 & IV4: calculateInvoiceTotals (with section 10 VAT)", () => {
    it("IV3: totals empty, single, and multiple entries when no VAT rate is given", () => {
      // Working: 0 entries -> 0 hours, £0.00 subtotal, no VAT rate (null), £0.00 VAT, £0.00 total
      expect(calculateInvoiceTotals([])).toEqual({
        lineCount: 0,
        totalHours: 0,
        subtotal: 0,
        vatRatePct: null,
        vatAmount: 0,
        total: 0,
      });

      // Working: 1 entry -> 3.5 hours, £245.00 subtotal, null VAT rate, £0.00 VAT, £245.00 total
      expect(calculateInvoiceTotals([{ hoursWorked: 3.5, amount: 245 }])).toEqual({
        lineCount: 1,
        totalHours: 3.5,
        subtotal: 245,
        vatRatePct: null,
        vatAmount: 0,
        total: 245,
      });

      // Working: hours 0.1 + 0.2 + 4.5 = 4.8; amounts 10.10 + 20.20 + 337.50 = 367.80
      expect(
        calculateInvoiceTotals(
          [
            { hoursWorked: 0.1, amount: 10.1 },
            { hoursWorked: 0.2, amount: 20.2 },
            { hoursWorked: 4.5, amount: 337.5 },
          ],
          null,
        ),
      ).toEqual({
        lineCount: 3,
        totalHours: 4.8,
        subtotal: 367.8,
        vatRatePct: null,
        vatAmount: 0,
        total: 367.8,
      });
    });

    it("IV4: computes section 10 VAT examples with half-up penny rounding", () => {
      // Section 10 worked example 1:
      // Working: subtotal = 625.00 + 625.00 = £1,250.00; VAT at 20% = 1250 * 20 / 100 = £250.00;
      // total = 1250.00 + 250.00 = £1,500.00
      expect(
        calculateInvoiceTotals(
          [
            { hoursWorked: 10, amount: 625 },
            { hoursWorked: 10, amount: 625 },
          ],
          20,
        ),
      ).toEqual({
        lineCount: 2,
        totalHours: 20,
        subtotal: 1250,
        vatRatePct: 20,
        vatAmount: 250,
        total: 1500,
      });

      // Section 10 worked example 2:
      // Working: subtotal = £333.33; VAT at 20% = 333.33 * 20 / 100 = 66.666 -> £66.67;
      // total = 333.33 + 66.67 = £400.00
      expect(calculateInvoiceTotals([{ hoursWorked: 3.33, amount: 333.33 }], 20)).toEqual({
        lineCount: 1,
        totalHours: 3.33,
        subtotal: 333.33,
        vatRatePct: 20,
        vatAmount: 66.67,
        total: 400,
      });
    });

    it("IV4b: handles 0% VAT, 100% VAT, and half-penny VAT rounding boundaries", () => {
      // Working: 0% VAT keeps vatRatePct=0 (distinct from null) with £0.00 VAT
      expect(calculateInvoiceTotals([{ hoursWorked: 2, amount: 150 }], 0)).toEqual({
        lineCount: 1,
        totalHours: 2,
        subtotal: 150,
        vatRatePct: 0,
        vatAmount: 0,
        total: 150,
      });

      // Working: 100% VAT on £200.00 -> £200.00 VAT, £400.00 total
      expect(calculateInvoiceTotals([{ hoursWorked: 4, amount: 200 }], 100)).toEqual({
        lineCount: 1,
        totalHours: 4,
        subtotal: 200,
        vatRatePct: 100,
        vatAmount: 200,
        total: 400,
      });

      // Working: £358.55 at 10% = 35.855 -> rounds half-up to £35.86; total = 358.55 + 35.86 = £394.41
      expect(calculateInvoiceTotals([{ hoursWorked: 5, amount: 358.55 }], 10)).toEqual({
        lineCount: 1,
        totalHours: 5,
        subtotal: 358.55,
        vatRatePct: 10,
        vatAmount: 35.86,
        total: 394.41,
      });

      // Working: £358.54 at 10% = 35.854 (below half-penny) -> rounds down to £35.85; total = £394.39
      expect(calculateInvoiceTotals([{ hoursWorked: 5, amount: 358.54 }], 10)).toEqual({
        lineCount: 1,
        totalHours: 5,
        subtotal: 358.54,
        vatRatePct: 10,
        vatAmount: 35.85,
        total: 394.39,
      });
    });

    it("rejects out-of-range VAT rates and negative/non-finite entry fields", () => {
      expect(() => calculateInvoiceTotals([], -0.01)).toThrow(
        new RangeError("vatRatePct must be a non-negative finite number"),
      );
      expect(() => calculateInvoiceTotals([], 100.01)).toThrow(
        new RangeError("vatRatePct must be at most 100"),
      );
      expect(() => calculateInvoiceTotals([], Number.NaN)).toThrow(
        new RangeError("vatRatePct must be a non-negative finite number"),
      );
      expect(() => calculateInvoiceTotals([{ hoursWorked: -1, amount: 10 }])).toThrow(
        new RangeError("hoursWorked must be a non-negative finite number"),
      );
      expect(() => calculateInvoiceTotals([{ hoursWorked: 1, amount: -0.01 }])).toThrow(
        new RangeError("amount must be a non-negative finite number"),
      );
      expect(() =>
        calculateInvoiceTotals([{ hoursWorked: Number.POSITIVE_INFINITY, amount: 10 }]),
      ).toThrow(new RangeError("hoursWorked must be a non-negative finite number"));
      expect(() => calculateInvoiceTotals([{ hoursWorked: 1, amount: Number.NaN }])).toThrow(
        new RangeError("amount must be a non-negative finite number"),
      );
    });
  });

  describe("IV5: formatInvoiceNumber", () => {
    it("formats invoice numbers with default and custom padding", () => {
      expect(formatInvoiceNumber("INV-", 1)).toBe("INV-0001");
      expect(formatInvoiceNumber("INV-", 42, 4)).toBe("INV-0042");
      expect(formatInvoiceNumber("ACME-", 10000, 4)).toBe("ACME-10000");
      expect(formatInvoiceNumber("2026/", 7, 3)).toBe("2026/007");
      expect(formatInvoiceNumber("", 9, 0)).toBe("9");
    });

    it("rejects non-positive or non-integer sequences and negative or non-integer pad lengths", () => {
      expect(() => formatInvoiceNumber("INV-", 0)).toThrow(
        new RangeError("sequence must be a positive integer"),
      );
      expect(() => formatInvoiceNumber("INV-", -1)).toThrow(
        new RangeError("sequence must be a positive integer"),
      );
      expect(() => formatInvoiceNumber("INV-", 1.5)).toThrow(
        new RangeError("sequence must be a positive integer"),
      );
      expect(() => formatInvoiceNumber("INV-", 1, -1)).toThrow(
        new RangeError("padLength must be a non-negative integer"),
      );
      expect(() => formatInvoiceNumber("INV-", 1, 2.5)).toThrow(
        new RangeError("padLength must be a non-negative integer"),
      );
    });
  });

  describe("IV6: getUkTaxYearForDate & summarizeInvoicingKpis", () => {
    it("resolves 5 April / 6 April UK tax year boundaries", () => {
      // Working: 5 April 2026 is the final day of 2025/26; 6 April 2026 starts 2026/27
      expect(getUkTaxYearForDate("2026-04-05")).toBe("2025/26");
      expect(getUkTaxYearForDate("2026-04-06")).toBe("2026/27");
      expect(getUkTaxYearForDate("2026-01-01")).toBe("2025/26");
      expect(getUkTaxYearForDate("2027-04-05")).toBe("2026/27");
      expect(getUkTaxYearForDate("2027-04-06")).toBe("2027/28");
    });

    it("rejects malformed or impossible dates", () => {
      expect(() => getUkTaxYearForDate("2026-02-30")).toThrow(RangeError);
      expect(() => getUkTaxYearForDate("not-a-date")).toThrow(RangeError);
    });

    it("summarises unbilled work logs, outstanding issued invoices, and paid invoices in the target UK tax year", () => {
      // Working:
      // Unbilled entries (invoiceId === null):
      //   - 4.5h, £360.00
      //   - 3.25h, £260.00
      //   -> unbilledEntryCount = 2, unbilledHours = 7.75, unbilledAmount = 620.00
      // Billed entry (invoiceId === "inv-1"): 10h, £800.00 (excluded from unbilled)
      // Invoices:
      //   - draft: £500 (excluded from outstanding and paid)
      //   - issued #1: subtotal £1,000, total £1,200
      //   - issued #2: subtotal £400, total £400
      //   -> outstandingInvoiceCount = 2, outstandingAmount = £1,600.00
      //   - paid in 2026/27 (paidDate 2026-04-06): subtotal £1,250, total £1,500
      //   - paid in 2026/27 (paidDate null, falls back to issueDate 2027-04-05): subtotal £333.33, total £400
      //   - paid in 2025/26 (paidDate 2026-04-05): subtotal £900, total £1,080 (excluded from 2026/27)
      //   - void (paidDate 2026-05-01): subtotal £200, total £240 (excluded)
      //   -> paidInTaxYearCount = 2, paidInTaxYearAmount = 1500 + 400 = £1,900.00,
      //      paidInTaxYearSubtotal = 1250 + 333.33 = £1,583.33
      const summary = summarizeInvoicingKpis(
        [
          { hoursWorked: 4.5, amount: 360, invoiceId: null },
          { hoursWorked: 3.25, amount: 260, invoiceId: null },
          { hoursWorked: 10, amount: 800, invoiceId: "inv-1" },
        ],
        [
          { status: "draft", issueDate: "2026-06-01", paidDate: null, subtotal: 500, total: 500 },
          {
            status: "issued",
            issueDate: "2026-06-10",
            paidDate: null,
            subtotal: 1000,
            total: 1200,
          },
          { status: "issued", issueDate: "2026-07-01", paidDate: null, subtotal: 400, total: 400 },
          {
            status: "paid",
            issueDate: "2026-04-01",
            paidDate: "2026-04-06",
            subtotal: 1250,
            total: 1500,
          },
          {
            status: "paid",
            issueDate: "2027-04-05",
            paidDate: null,
            subtotal: 333.33,
            total: 400,
          },
          {
            status: "paid",
            issueDate: "2026-03-20",
            paidDate: "2026-04-05",
            subtotal: 900,
            total: 1080,
          },
          {
            status: "void",
            issueDate: "2026-05-01",
            paidDate: "2026-05-02",
            subtotal: 200,
            total: 240,
          },
        ],
        "2026/27",
      );

      expect(summary).toEqual({
        unbilledEntryCount: 2,
        unbilledHours: 7.75,
        unbilledAmount: 620,
        outstandingInvoiceCount: 2,
        outstandingAmount: 1600,
        paidInTaxYearCount: 2,
        paidInTaxYearAmount: 1900,
        paidInTaxYearSubtotal: 1583.33,
        taxYear: "2026/27",
      });
    });

    it("returns zeros when there are no work logs or invoices", () => {
      expect(summarizeInvoicingKpis([], [], "2026/27")).toEqual({
        unbilledEntryCount: 0,
        unbilledHours: 0,
        unbilledAmount: 0,
        outstandingInvoiceCount: 0,
        outstandingAmount: 0,
        paidInTaxYearCount: 0,
        paidInTaxYearAmount: 0,
        paidInTaxYearSubtotal: 0,
        taxYear: "2026/27",
      });
    });
  });
});
