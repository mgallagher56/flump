import { describe, expect, it } from "vitest";
import { DEFAULT_NET_WORTH_BASIS } from "../../net-worth-basis.js";
import type { TaxRecord } from "../../tax-calculator.js";
import { taxRecord } from "../__fixtures__/builders.js";
import { buildFinancialPicture } from "../build.js";
import type { ProfileFacts } from "../input.js";
import { selectEstimatedTaxDue } from "./estimated-tax-due.js";

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

  it("SA-1 audit case: salary 40,000, trading income 40,000, no expenses = 6,872 (as the page)", () => {
    // 40,000 less the 1,000 trading allowance = 39,000 profit. (39,000 - 12,570) = 26,430 at 20%
    // = 5,286, plus Class 4 26,430 at 6% = 1,585.80. 6,871.80 rounds to 6,872.
    expect(
      amount(selfEmployed, [annual("self-employed", "income", "self_employed_income", 40000)]),
    ).toBe(6872);
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

  it("is unknown for an employee with no saved salary (the band depends on it)", () => {
    expect(selectEstimatedTaxDue(employee(null), [rent(12000)], { taxYear: Y })).toEqual({
      status: "unknown",
      missing: ["annualSalary"],
      reason: "not-set",
    });
  });

  // Slice 6: a legacy PAYE salary record never stands in for the saved salary. The migration
  // copies the latest yearly record into an empty profile salary and removes the records.
  it("an employee with only a legacy salary record: unknown before the migration", () => {
    // Profile salary empty, one yearly paye_salary record of 30,000. The record is left out, so
    // the salary is not set and the estimate names it (it used to be worked from the record).
    const logged = annual("paye", "income", "paye_salary", 30000);
    expect(
      selectEstimatedTaxDue(employee(null), [logged, rent(12000), repairs(2000)], { taxYear: Y }),
    ).toEqual({ status: "unknown", missing: ["annualSalary"], reason: "not-set" });
  });

  it("the same employee after the migration: 30,000 copied to the salary, the same £2,000", () => {
    // Rental profit 12,000 - 2,000 = 10,000. Salary 30,000 uses the 12,570 allowance, so the
    // basic band runs to 50,270 and 30,000 + 10,000 = 40,000 sits inside it: 10,000 x 20% = £2,000.
    // That is the figure the record gave before, so this employee sees no change.
    expect(amount(employee(30000), [rent(12000), repairs(2000)])).toBe(2000);
  });

  it("a legacy record no longer replaces a saved salary (SA-6)", () => {
    // Saved 58,000 and a yearly record of 40,000; rent 12,000 less repairs 2,000 is a profit of
    // 10,000 (the costs beat the 1,000 property allowance). Before: 40,000 + 10,000 = 50,000 <
    // 50,270, so 10,000 x 20% = £2,000. Now the saved 58,000 counts: all 10,000 is above 50,270,
    // so 10,000 x 40% = £4,000.
    const logged = annual("paye", "income", "paye_salary", 40000);
    expect(amount(employee(58000), [logged, rent(12000), repairs(2000)])).toBe(4000);
    expect(amount(employee(40000), [rent(12000), repairs(2000)])).toBe(2000);
  });

  it("applies the rental property account's share (decision 6)", () => {
    // Rent 12,000 less 2,000 of costs, the one rental property joint at 50%: 5,000 at 20% = 1,000.
    const flat = {
      id: "flat",
      type: "Property" as const,
      accountSubtype: "rental",
      ownership: "joint",
      sharePercent: 50,
    };
    const fig = selectEstimatedTaxDue(employee(30000), [rent(12000), repairs(2000)], {
      taxYear: Y,
      accounts: [flat],
    });
    expect(fig.status === "known" && fig.value.amount).toBe(1000);
  });

  it("uses Scottish bands for a Scottish taxpayer, with no assumption note (decision 7)", () => {
    // Salary 30,000, rent 5,000, 2026/27. Taxable income before the rent 17,430, so the rent sits
    // in the Scottish intermediate band (16,956 to 31,092) at 21%. With the 1,000 property
    // allowance (no costs recorded): 4,000 x 21% = 840. England bands gave 4,000 x 20% = 800.
    const fig = selectEstimatedTaxDue({ ...employee(30000), taxRegion: "SCOTLAND" }, [rent(5000)], {
      taxYear: Y,
    });
    expect(fig.status === "known" && fig.value.amount).toBe(840);
    expect(fig.status === "known" ? (fig.assumptions ?? []) : null).toEqual([]);
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

describe("selectEstimatedTaxDue: untaxed income and provenance", () => {
  it("adds every kind of income outside PAYE: rent, trading, savings interest and dividends", () => {
    // Gross amounts, not profit: 12,000 rent + 8,000 trading income + 1,500 interest + 600
    // dividends = 22,100.
    const fig = selectEstimatedTaxDue(
      employee(30000),
      [
        rent(12000),
        annual("self-employed", "income", "self_employed_income", 8000),
        annual("savings", "income", "savings_interest", 1500),
        annual("savings", "income", "dividend_income", 600),
      ],
      { taxYear: Y },
    );
    expect(fig.status === "known" && fig.value.untaxedIncome).toBe(22100);
  });

  it("is derived with no assumptions for an English taxpayer", () => {
    const fig = selectEstimatedTaxDue(employee(30000), [rent(5000)], { taxYear: Y });
    expect(fig.status).toBe("known");
    expect(fig.status === "known" && fig.provenance).toBe("derived");
    expect(fig.status === "known" && fig.assumptions).toBeUndefined();
  });

  it("is marked as an assumption for a Scottish taxpayer", () => {
    const fig = selectEstimatedTaxDue({ ...employee(30000), taxRegion: "SCOTLAND" }, [rent(5000)], {
      taxYear: Y,
    });
    expect(fig.status === "known" && fig.provenance).toBe("assumption");
  });
});
