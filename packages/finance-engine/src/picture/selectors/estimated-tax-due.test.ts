import { describe, expect, it } from "vitest";
import { DEFAULT_NET_WORTH_BASIS } from "../../net-worth-basis.js";
import type { TaxRecord } from "../../tax-calculator.js";
import { taxRecord } from "../__fixtures__/builders.js";
import { buildFinancialPicture } from "../build.js";
import type { ProfileFacts } from "../input.js";
import { ESTIMATED_TAX_EWNI_BANDS_NOTE, selectEstimatedTaxDue } from "./estimated-tax-due.js";

/**
 * Golden figures, 2026/27 England, Wales and NI: personal allowance 12,570, basic band 37,700
 * at 20%, higher rate 40%, Class 4 NI 6% from 12,570. Hand-derived.
 */
const Y = "2026/27" as const;

const employee = (annualSalary: number | null): ProfileFacts => ({
  annualSalary,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 0,
  isSalarySacrifice: false,
});

const selfEmployed: ProfileFacts = { ...employee(40000), employmentType: "self-employed" };

let n = 0;
const annual = (
  source: TaxRecord["source"],
  type: TaxRecord["type"],
  category: string,
  amount: number,
): TaxRecord =>
  taxRecord({
    id: `r${n++}`,
    type,
    source,
    category,
    name: category,
    amount,
    date: "2026-05-01",
    frequency: "annual",
  });

const rent = (amount: number) => annual("rental", "income", "rental_income", amount);
const repairs = (amount: number) => annual("rental", "expense", "repairs_maintenance", amount);

function amount(facts: ProfileFacts, records: TaxRecord[]): number {
  const fig = selectEstimatedTaxDue(facts, records, { taxYear: Y });
  if (fig.status !== "known") throw new Error(`expected known: ${JSON.stringify(fig)}`);
  return fig.value.amount;
}

describe("selectEstimatedTaxDue (C-11)", () => {
  it("typical rental: 30,000 salary, 10,000 rental profit all in the basic band = 2,000", () => {
    expect(amount(employee(30000), [rent(12000), repairs(2000)])).toBe(2000);
  });

  it("rental pushing into the higher rate: 60,000 salary, 10,000 profit at 40% = 4,000", () => {
    expect(amount(employee(60000), [rent(12000), repairs(2000)])).toBe(4000);
  });

  it("self-employed: 25,000 profit; 12,430 x 20% + 12,430 x 6% Class 4 = 3,232", () => {
    const records = [
      annual("self-employed", "income", "self_employed_income", 30000),
      annual("self-employed", "expense", "office_costs", 5000),
    ];
    // The self-employed profile salary is trading income, not PAYE pay, so it is not added.
    expect(amount(selfEmployed, records)).toBe(3232);
  });

  it("is unknown for a self-employed user whose trading income is not logged (never a known 0)", () => {
    // A 40,000 profile figure with only a 10,000 rental record: the trading income decides the
    // band the rent falls in, and the profile figure may be turnover, not profit.
    expect(selectEstimatedTaxDue(selfEmployed, [rent(10000)], { taxYear: Y })).toEqual({
      status: "unknown",
      missing: ["selfEmploymentRecords"],
      reason: "not-set",
    });
    const noSaved = { ...selfEmployed, annualSalary: null };
    expect(selectEstimatedTaxDue(noSaved, [rent(10000)], { taxYear: Y }).status).toBe("unknown");
  });

  it("a self-employed user with a saved income of 0 and only rent is estimated on the rent", () => {
    const none = { ...selfEmployed, annualSalary: 0 };
    // 20,000 rent less the 1,000 property allowance: 6,430 above the personal allowance at 20% = 1,286.
    expect(amount(none, [rent(20000)])).toBe(1286);
  });

  it("is a known 0 below the allowance: 10,000 self-employed profit", () => {
    expect(
      amount(selfEmployed, [annual("self-employed", "income", "self_employed_income", 10000)]),
    ).toBe(0);
  });

  it("is a known 0 for a rental loss (expenses above rent)", () => {
    expect(amount(employee(30000), [rent(5000), repairs(8000)])).toBe(0);
  });

  it("is a known 0 for savings interest inside the 1,000 personal savings allowance", () => {
    expect(amount(employee(30000), [annual("savings", "income", "savings_interest", 800)])).toBe(0);
  });

  it("is unknown with no records, and with PAYE-only or ISA-only records", () => {
    const unknown = { status: "unknown", missing: ["untaxedIncomeRecords"], reason: "not-set" };
    expect(selectEstimatedTaxDue(employee(30000), [], { taxYear: Y })).toEqual(unknown);
    expect(selectEstimatedTaxDue(employee(30000), null, { taxYear: Y })).toEqual(unknown);
    const payeOnly = [annual("paye", "income", "paye_bonus", 5000)];
    expect(selectEstimatedTaxDue(employee(30000), payeOnly, { taxYear: Y })).toEqual(unknown);
    const isaOnly = [annual("savings", "income", "isa_interest", 900)];
    expect(selectEstimatedTaxDue(employee(30000), isaOnly, { taxYear: Y })).toEqual(unknown);
  });

  it("ignores records from other tax years", () => {
    const old = { ...rent(12000), date: "2024-05-01", endDate: "2025-04-05" };
    expect(selectEstimatedTaxDue(employee(30000), [old], { taxYear: Y }).status).toBe("unknown");
  });

  it("is unknown for an employee with no saved or logged salary (the band depends on it)", () => {
    expect(selectEstimatedTaxDue(employee(null), [rent(12000)], { taxYear: Y })).toEqual({
      status: "unknown",
      missing: ["annualSalary"],
      reason: "not-set",
    });
    const logged = annual("paye", "income", "paye_salary", 30000);
    expect(amount(employee(null), [logged, rent(12000), repairs(2000)])).toBe(2000);
  });

  it("applies the rental ownership share", () => {
    const half = { ...employee(30000), propertyOwnershipShare: 50 };
    expect(amount(half, [rent(12000), repairs(2000)])).toBe(1000);
  });

  it("names the England bands as an assumption for a Scottish taxpayer", () => {
    const fig = selectEstimatedTaxDue({ ...employee(30000), taxRegion: "SCOTLAND" }, [rent(5000)], {
      taxYear: Y,
    });
    expect(fig.status === "known" && fig.assumptions).toEqual([ESTIMATED_TAX_EWNI_BANDS_NOTE]);
  });

  it("is unknown for an unsupported tax year", () => {
    expect(
      selectEstimatedTaxDue(employee(30000), [rent(1)], { taxYear: "1999/00" as never }),
    ).toEqual({ status: "unknown", missing: [], reason: "unsupported-year" });
  });

  it("is on the picture, built from the input's tax records", () => {
    const picture = buildFinancialPicture(
      {
        profile: employee(30000),
        netWorthBasis: DEFAULT_NET_WORTH_BASIS,
        accounts: [],
        details: [],
        budget: [],
        taxRecords: [rent(12000), repairs(2000)],
      },
      { taxYear: Y },
    );
    expect(picture.estimatedTaxDue.status === "known" && picture.estimatedTaxDue.value.amount).toBe(
      2000,
    );
  });
});
