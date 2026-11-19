import {
  applyAccountShare,
  calculateEstimatedTax,
  estimateInputsFor,
  grossRentalYieldPct,
  rentalSharesFromAccounts,
  type TaxRecord,
} from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { rentForPropertyInYear } from "~/features/mortgage/btlYield";

/**
 * Code-level link tests for buy to let (value map links L22 and L23, audit slice 7). Each one
 * follows a single saved value to the surfaces that read it.
 */

const TAX_YEAR = "2026/27";

const flat = {
  id: "p1",
  name: "Flat 2",
  type: "Property",
  accountSubtype: "rental",
  ownership: "joint",
  sharePercent: 50,
  balance: 230000,
};

const rent: TaxRecord = {
  id: "t1",
  userId: "u",
  type: "income",
  source: "rental",
  category: "rental_income",
  name: "Flat rent",
  amount: 1150,
  frequency: "monthly",
  date: "2026-04-06",
  endDate: null,
  notes: null,
  receiptFilename: null,
  receiptMimeType: null,
  receiptData: null,
  accountId: "p1",
  createdAt: "2026-04-06T00:00:00.000Z",
  updatedAt: "2026-04-06T00:00:00.000Z",
};

const estimate = (records: TaxRecord[], accounts: Record<string, unknown>[]) => {
  const inputs = estimateInputsFor(
    { employmentType: "employed", annualSalary: 30000, accounts },
    records,
    TAX_YEAR,
  );
  if (inputs.status !== "known") throw new Error("expected a known estimate");
  return calculateEstimatedTax(inputs);
};

describe("L22 rent entered once is the same in Self Assessment and the Mortgage page yield", () => {
  it("one rent record linked to the property gives both surfaces the same rent", () => {
    // 1,150 a month for the tax year: 12 x 1,150 = 13,800, the whole property's rent.
    const result = estimate([rent], [flat]);
    const mortgagePageRent = rentForPropertyInYear([rent], "p1", TAX_YEAR);
    expect(result.rentalIncomeGross).toBe(13800);
    expect(mortgagePageRent).toBe(13800);
    expect(mortgagePageRent).toBe(result.rentalIncomeGross);
    // Self Assessment taxes the person's 50%: 6,900. The yield is on the whole property:
    // 13,800 / 230,000 = 6.0%.
    expect(result.rentalIncomeGrossShare).toBe(6900);
    expect(grossRentalYieldPct({ rentForYear: mortgagePageRent, propertyValue: 230000 })).toBe(6);
  });

  it("a change to that one record moves both figures together", () => {
    const raised = { ...rent, amount: 1250 };
    // 12 x 1,250 = 15,000 on both surfaces.
    expect(estimate([raised], [flat]).rentalIncomeGross).toBe(15000);
    expect(rentForPropertyInYear([raised], "p1", TAX_YEAR)).toBe(15000);
  });
});

describe("L23 one rental property share drives net worth and Self Assessment", () => {
  it("the property account's share is the share in net worth and the tax share", () => {
    // Net worth: 230,000 x 50% = 115,000. Tax: the same 50% from the same account.
    expect(applyAccountShare(230000, flat)).toBe(115000);
    expect(rentalSharesFromAccounts([flat]).byAccountId.p1).toBe(50);
    expect(estimate([rent], [flat]).rentalIncomeGrossShare).toBe(13800 * 0.5);
  });

  it("changing the share on the account changes both, with no second store", () => {
    // A 25% share: net worth 230,000 x 25% = 57,500; rent taxed 13,800 x 25% = 3,450.
    const quarter = { ...flat, sharePercent: 25 };
    expect(applyAccountShare(230000, quarter)).toBe(57500);
    expect(rentalSharesFromAccounts([quarter]).byAccountId.p1).toBe(25);
    expect(estimate([rent], [quarter]).rentalIncomeGrossShare).toBe(3450);
  });

  it("the profile's old single share is not read for tax", () => {
    // Facts carry no profile share: an unlinked record uses the one rental property's 50%.
    const unlinked = { ...rent, accountId: null };
    expect(estimate([unlinked], [flat]).rentalIncomeGrossShare).toBe(6900);
  });
});
