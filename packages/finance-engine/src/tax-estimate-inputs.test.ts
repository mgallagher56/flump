import { describe, expect, it } from "vitest";
import { taxRecord } from "./picture/__fixtures__/builders.js";
import type { TaxRecord } from "./tax-calculator.js";
import { estimateInputsFor } from "./tax-estimate-inputs.js";

const Y = "2026/27";
let n = 0;
const annual = (
  source: TaxRecord["source"],
  type: TaxRecord["type"],
  category: string,
  amount: number,
  date = "2026-05-01",
): TaxRecord =>
  taxRecord({
    id: `t${n++}`,
    type,
    source,
    category,
    name: category,
    amount,
    date,
    frequency: "annual",
  });
const rent = (amount: number) => annual("rental", "income", "rental_income", amount);
const trading = (amount: number) =>
  annual("self-employed", "income", "self_employed_income", amount);

describe("estimateInputsFor (one rule for every Self Assessment surface)", () => {
  it("employee with a saved salary and rent: known, the salary is the PAYE pay, share 100", () => {
    // Saved salary 30,000 is PAYE pay as saved; no share saved, so 100%.
    const out = estimateInputsFor(
      { employmentType: "employed", annualSalary: 30000 },
      [rent(12000)],
      Y,
    );
    expect(out).toMatchObject({ status: "known", payeSalary: 30000, ownershipShare: 100 });
  });

  it("employee with no saved salary and no salary record: unknown, names annualSalary", () => {
    const out = estimateInputsFor(
      { employmentType: "employed", annualSalary: null },
      [rent(12000)],
      Y,
    );
    expect(out).toEqual({ status: "unknown", missing: ["annualSalary"] });
  });

  it("employment type not answered and no salary: unknown annualSalary, not worked from £0", () => {
    // The person may be employed, so a missing salary is not read as no pay.
    const out = estimateInputsFor({ employmentType: null, annualSalary: null }, [rent(12000)], Y);
    expect(out).toEqual({ status: "unknown", missing: ["annualSalary"] });
  });

  it("employment type other (not working) and no salary: known, PAYE pay 0, share 100", () => {
    // "other" has no employer, so no salary is the answer, not a gap.
    const out = estimateInputsFor(
      { employmentType: "other", annualSalary: null },
      [rent(12000)],
      Y,
    );
    expect(out).toMatchObject({ status: "known", payeSalary: 0, ownershipShare: 100 });
  });

  it("the baseline spelling PAYE with salary 0 reads the same: unknown annualSalary", () => {
    const out = estimateInputsFor({ employmentType: "PAYE", annualSalary: 0 }, [rent(12000)], Y);
    expect(out).toEqual({ status: "unknown", missing: ["annualSalary"] });
  });

  it("employee with no saved salary but a logged PAYE salary record: known, PAYE pay 0", () => {
    // The logged record carries the salary, so the profile salary passes as 0.
    const out = estimateInputsFor(
      { employmentType: "employed", annualSalary: null },
      [rent(12000), annual("paye", "income", "paye_salary", 30000)],
      Y,
    );
    expect(out).toMatchObject({ status: "known", payeSalary: 0 });
  });

  it("self-employed, salary 40,000 kept, rent but no self-employed record: unknown", () => {
    const out = estimateInputsFor(
      { employmentType: "self-employed", annualSalary: 40000 },
      [rent(10000)],
      Y,
    );
    expect(out).toEqual({ status: "unknown", missing: ["selfEmploymentRecords"] });
  });

  it("baseline spelling SELF_EMPLOYED with no salary and only rent: unknown", () => {
    const out = estimateInputsFor(
      { employmentType: "SELF_EMPLOYED", annualSalary: null },
      [rent(10000)],
      Y,
    );
    expect(out).toEqual({ status: "unknown", missing: ["selfEmploymentRecords"] });
  });

  it("self-employed with a trading record: known, the salary is never PAYE pay (decision 15 A)", () => {
    const out = estimateInputsFor(
      { employmentType: "self-employed", annualSalary: 40000 },
      [trading(30000), rent(10000)],
      Y,
    );
    expect(out).toMatchObject({ status: "known", payeSalary: 0 });
  });

  it("self-employed with a saved salary of exactly 0 and only rent: known, PAYE pay 0", () => {
    const out = estimateInputsFor(
      { employmentType: "self-employed", annualSalary: 0 },
      [rent(10000)],
      Y,
    );
    expect(out).toMatchObject({ status: "known", payeSalary: 0 });
  });

  it("no income outside PAYE in the year: unknown untaxedIncomeRecords, even with no salary", () => {
    // Rent dated in 2025/26 does not count towards 2026/27; ISA interest is tax-free.
    const out = estimateInputsFor(
      { employmentType: "employed", annualSalary: null },
      [
        annual("rental", "income", "rental_income", 9000, "2025-05-01"),
        annual("savings", "income", "isa_interest", 500),
      ],
      Y,
    );
    expect(out).toEqual({ status: "unknown", missing: ["untaxedIncomeRecords"] });
  });

  it("keeps a saved 0% share and reads an out-of-range share as 100%", () => {
    const zero = estimateInputsFor(
      { employmentType: "employed", annualSalary: 30000, propertyOwnershipShare: 0 },
      [rent(12000)],
      Y,
    );
    const wild = estimateInputsFor(
      { employmentType: "employed", annualSalary: 30000, propertyOwnershipShare: 140 },
      [rent(12000)],
      Y,
    );
    expect(zero).toMatchObject({ status: "known", ownershipShare: 0 });
    expect(wild).toMatchObject({ status: "known", ownershipShare: 100 });
  });

  it("returns only the records active in the year", () => {
    const old = annual("rental", "income", "rental_income", 9000, "2025-05-01");
    const now = rent(12000);
    const out = estimateInputsFor(
      { employmentType: "employed", annualSalary: 30000 },
      [old, now],
      Y,
    );
    expect(out.status === "known" && out.records).toEqual([now]);
  });

  it("the 2026/27 year runs 6 April 2026 to 5 April 2027: records a day either side are left out", () => {
    const inYear = annual("rental", "income", "rental_income", 10000, "2026-04-06");
    const before = annual("rental", "income", "rental_income", 5000, "2026-04-05");
    const after = annual("rental", "income", "rental_income", 5000, "2027-04-06");
    const out = estimateInputsFor(
      { employmentType: "employed", annualSalary: 30000 },
      [before, inYear, after],
      Y,
    );
    expect(out.status === "known" && out.records).toEqual([inYear]);
  });
});
