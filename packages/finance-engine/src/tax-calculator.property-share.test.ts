import { describe, expect, it } from "vitest";
import {
  calculateUKTax,
  incomeOutsidePaye,
  rentalSharesFromAccounts,
  type TaxRecordFields,
} from "./tax-calculator.js";

/**
 * The share of a rental property used for tax, per property, from the property's account (owner
 * decision 6, audit slice 7). A joint owner is taxed on their share of the rent and costs
 * (ITTOIA 2005 s.272, profits of a property business; GOV.UK "Renting out a property you own
 * jointly"). Finance costs count at the share of the loan the person bears.
 *
 * England bands, 2026/27 (2025/26 has the same non-savings figures). Salary 30,000, so taxable
 * income before the rent is 17,430 and every case stays inside the 37,700 basic rate band: rent
 * is taxed at 20%.
 */

const YEAR = "2026/27";

function rental(
  category: string,
  amount: number,
  accountId: string | null,
  id = `${category}-${amount}-${accountId}`,
): TaxRecordFields {
  return {
    id,
    type: category === "rental_income" ? "income" : "expense",
    source: "rental",
    category,
    name: category,
    amount,
    frequency: "annual",
    date: "2026-06-06",
    endDate: null,
    notes: null,
    accountId,
  };
}

const flatA = {
  id: "flat-a",
  type: "Property",
  accountSubtype: "rental",
  ownership: "joint",
  sharePercent: 50,
};
const flatB = {
  id: "flat-b",
  type: "Property",
  accountSubtype: "rental",
  ownership: "sole",
  sharePercent: null,
};
const btlMortgage = {
  id: "btl-a",
  type: "Mortgage",
  accountSubtype: "btl_mortgage",
  ownership: "joint",
  sharePercent: 50,
  linkedAccountId: "flat-a",
};
const home = { id: "home", type: "Property", accountSubtype: "home", ownership: "sole" };

describe("rentalSharesFromAccounts", () => {
  it("reads each rental property's and mortgage's share; sole is 100", () => {
    const shares = rentalSharesFromAccounts([flatA, flatB, btlMortgage, home]);
    expect(shares.byAccountId).toEqual({ "flat-a": 50, "flat-b": 100, "btl-a": 50 });
  });

  it("gives any mortgage its own share, since a rental record can be linked to it", () => {
    // A residential mortgage joint at 30%: a rental record linked to it counts at 30%, not at the
    // unlinked share. It does not change the unlinked share, which comes from rental properties.
    const resi = {
      id: "resi",
      type: "Mortgage",
      accountSubtype: "residential_mortgage",
      ownership: "joint",
      sharePercent: 30,
    };
    const shares = rentalSharesFromAccounts([flatA, resi]);
    expect(shares.byAccountId.resi).toBe(30);
    expect(shares.unlinked).toEqual({ share: 50, basis: "only-rental" });
  });

  it("uses one rental property's share for records not linked to any account", () => {
    expect(rentalSharesFromAccounts([flatA, home]).unlinked).toEqual({
      share: 50,
      basis: "only-rental",
    });
  });

  it("uses the share several rental properties have in common", () => {
    expect(
      rentalSharesFromAccounts([flatA, { ...flatB, ownership: "joint", sharePercent: 50 }])
        .unlinked,
    ).toEqual({ share: 50, basis: "only-rental" });
  });

  it("counts unlinked records in full when the properties differ, and says so", () => {
    expect(rentalSharesFromAccounts([flatA, flatB]).unlinked).toEqual({
      share: 100,
      basis: "shares-differ",
    });
  });

  it("counts unlinked records in full when there is no rental property, and says so", () => {
    expect(rentalSharesFromAccounts([home]).unlinked).toEqual({
      share: 100,
      basis: "no-rental-property",
    });
  });
});

describe("calculateUKTax with a share per property", () => {
  it("taxes each property's rent at its own share", () => {
    // Flat A joint at 50%: rent 12,000, so 6,000 is the person's. Flat B sole: rent 8,000 and
    // repairs 2,000. Profit share 6,000 + 8,000 - 2,000 = 12,000 at 20% = 2,400.
    // The property allowance route: 14,000 - 1,000 = 13,000 at 20% = 2,600, so costs are used.
    // One share of 50% for both (the profile share before slice 7) gave 9,000 x 20% = 1,800.
    const r = calculateUKTax(
      YEAR,
      [
        rental("rental_income", 12000, "flat-a"),
        rental("rental_income", 8000, "flat-b"),
        rental("repairs_maintenance", 2000, "flat-b"),
      ],
      30000,
      100,
      { rentalShares: rentalSharesFromAccounts([flatA, flatB]) },
    );
    expect(r.rentalIncomeGrossShare).toBe(14000);
    expect(r.rentalExpensesExclInterestShare).toBe(2000);
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(2400);
  });

  it("counts mortgage interest linked to the loan at the loan's share", () => {
    // Flat A rent 12,000 at 50% = 6,000; interest 6,750 on the buy-to-let mortgage, joint at 50%:
    // 3,375. Credit 20% x 3,375 = 675. Tax on the rent 6,000 x 20% = 1,200; after credit 525.
    // The property allowance route: 5,000 x 20% = 1,000 with no credit, so costs are used.
    const r = calculateUKTax(
      YEAR,
      [rental("rental_income", 12000, "flat-a"), rental("mortgage_interest", 6750, "btl-a")],
      30000,
      100,
      { rentalShares: rentalSharesFromAccounts([flatA, btlMortgage]) },
    );
    expect(r.rentalMortgageInterestShare).toBe(3375);
    expect(r.rentalPropertyTaxCredit).toBe(675);
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(525);
  });

  it("uses the unlinked share for records with no account", () => {
    // One rental property at 40%; unlinked rent 10,000 and costs 3,000: 4,000 - 1,200 = 2,800 at
    // 20% = 560. The property allowance route: 3,000 at 20% = 600, so costs are used.
    const r = calculateUKTax(
      YEAR,
      [rental("rental_income", 10000, null), rental("repairs_maintenance", 3000, null)],
      30000,
      100,
      { rentalShares: rentalSharesFromAccounts([{ ...flatA, sharePercent: 40 }]) },
    );
    expect(r.rentalIncomeGrossShare).toBe(4000);
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(560);
  });

  it("uses the share passed as before when no shares are given", () => {
    // The pre-slice-7 call: one share for all, here 50%. Rent 10,000 and costs 3,000 at 50%:
    // 3,500 at 20% = 700 (the allowance route, 4,000 at 20% = 800, costs more).
    const r = calculateUKTax(
      YEAR,
      [rental("rental_income", 10000, "flat-a"), rental("repairs_maintenance", 3000, "flat-a")],
      30000,
      50,
    );
    expect(r.rentalPropertyTaxDueAfterCredit).toBe(700);
  });
});

describe("incomeOutsidePaye: the headline strip's figures (SA-9)", () => {
  it("counts rent and costs at the share the engine taxes, and leaves ISA interest out", () => {
    // Flat A joint at 50%: rent 12,000, repairs 2,000, so 6,000 and 1,000 are the person's.
    // ISA interest 300 is tax-free, so it is not income outside PAYE.
    // Income 6,000; costs 1,000; income after costs 5,000. Before slice 7 the strip summed every
    // record whole: 12,300 and 10,300.
    const isa: TaxRecordFields = {
      id: "isa",
      type: "income",
      source: "savings",
      category: "isa_interest",
      name: "ISA",
      amount: 300,
      frequency: "annual",
      date: "2026-06-06",
      endDate: null,
      notes: null,
    };
    const r = calculateUKTax(
      YEAR,
      [
        rental("rental_income", 12000, "flat-a"),
        rental("repairs_maintenance", 2000, "flat-a"),
        isa,
      ],
      30000,
      100,
      { rentalShares: rentalSharesFromAccounts([flatA]) },
    );
    expect(incomeOutsidePaye(r)).toEqual({ income: 6000, costs: 1000 });
  });
});
