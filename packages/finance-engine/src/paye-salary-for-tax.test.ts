import { describe, expect, it } from "vitest";
import { payeSalaryForTax } from "./paye-salary-for-tax.js";
import { calculateUKTax, type TaxRecord } from "./tax-calculator.js";

const tradingIncome: TaxRecord = {
  id: "se1",
  type: "income",
  source: "self-employed",
  category: "self_employed_income",
  name: "Trading income",
  amount: 40000,
  date: "2026-05-01",
  frequency: "annual",
};

describe("payeSalaryForTax (SA-1)", () => {
  it("passes an employee's saved salary as PAYE pay", () => {
    expect(payeSalaryForTax({ employmentType: "employed", annualSalary: 40000 })).toBe(40000);
    expect(payeSalaryForTax({ employmentType: "PAYE", annualSalary: 40000 })).toBe(40000);
  });

  it("passes no PAYE pay for a self-employed person, in either spelling", () => {
    expect(payeSalaryForTax({ employmentType: "self-employed", annualSalary: 40000 })).toBe(0);
    expect(payeSalaryForTax({ employmentType: "SELF_EMPLOYED", annualSalary: 40000 })).toBe(0);
  });

  it("counts an unknown or invalid salary as none", () => {
    expect(payeSalaryForTax({ employmentType: "employed", annualSalary: null })).toBe(0);
    expect(payeSalaryForTax({ employmentType: null, annualSalary: undefined })).toBe(0);
    expect(payeSalaryForTax({ employmentType: "employed", annualSalary: -5 })).toBe(0);
    expect(payeSalaryForTax({ employmentType: "employed", annualSalary: Number.NaN })).toBe(0);
  });

  it("self-employed, salary 40,000, trading income 40,000 in 2026/27: estimate £6,872 (was £15,132)", () => {
    // Worked by hand, 2026/27 England, Wales and Northern Ireland rates (tax-rules.ts):
    // trading income 40,000, no expenses, so the 1,000 trading allowance applies: profit 39,000.
    // Taxable: 39,000 - 12,570 Personal Allowance = 26,430, all in the basic band at 20% = 5,286.
    // Class 4 NI: (39,000 - 12,570 lower profits limit) = 26,430 at 6% = 1,585.80.
    // No PAYE pay, so nothing was taxed at source: 5,286 + 1,585.80 = 6,871.80, about £6,872.
    // Passing the salary as PAYE pay instead gave £15,132 (the audit's SA-1 figure).
    const salary = payeSalaryForTax({ employmentType: "self-employed", annualSalary: 40000 });
    const result = calculateUKTax("2026/27", [tradingIncome], salary, 100);
    expect(result.effectivePayeSalary).toBe(0);
    expect(result.seProfit).toBe(39000);
    expect(Math.round(result.netAdditionalTaxToPay)).toBe(6872);
  });
});
