import { describe, expect, it } from "vitest";
import {
  ACCOUNT_SUBTYPES,
  ACCOUNT_SUBTYPES_BY_TYPE,
  CREDIT_FIELD_ACCOUNT_TYPES,
  PortfolioHistoryPointDto,
} from "./domains/accounts.js";

const typesTaking = (subtype: string): string[] =>
  Object.entries(ACCOUNT_SUBTYPES_BY_TYPE)
    .filter(([, subtypes]) => (subtypes as readonly string[]).includes(subtype))
    .map(([type]) => type);

describe("account subtypes by type", () => {
  // A subtype on any other type is refused (account-intake.service.ts), so a subtype no type
  // takes could never be saved, and one taken by two types would be ambiguous.
  it.each(ACCOUNT_SUBTYPES)("%s is taken by exactly one account type", (subtype) => {
    expect(typesTaking(subtype)).toHaveLength(1);
  });

  it("files each subtype under the account it describes", () => {
    // ISAs and notice accounts are savings; a stocks and shares ISA is an investment; a
    // buy-to-let mortgage is a Mortgage and a let property a Property (value map: "accounts row
    // of type Mortgage with subtype btl_mortgage", "account_subtype on Property rows").
    expect(typesTaking("cash_isa")).toEqual(["Saving"]);
    expect(typesTaking("lifetime_isa")).toEqual(["Saving"]);
    expect(typesTaking("notice")).toEqual(["Saving"]);
    expect(typesTaking("stocks_and_shares_isa")).toEqual(["Investment"]);
    expect(typesTaking("btl_mortgage")).toEqual(["Mortgage"]);
    expect(typesTaking("home")).toEqual(["Property"]);
    expect(typesTaking("rental")).toEqual(["Property"]);
    expect(typesTaking("car_finance")).toEqual(["Loan"]);
  });
});

describe("credit field account types", () => {
  it("are the revolving credit lines, which have a credit limit", () => {
    // A credit card and an overdraft each have a limit; loans, mortgages and savings do not.
    expect(CREDIT_FIELD_ACCOUNT_TYPES).toContain("Credit Card");
    expect(CREDIT_FIELD_ACCOUNT_TYPES).toContain("Overdraft");
    for (const type of ["Loan", "Mortgage", "Saving", "Current"]) {
      expect(CREDIT_FIELD_ACCOUNT_TYPES).not.toContain(type);
    }
  });
});

describe("PortfolioHistoryPointDto", () => {
  const point = {
    year: 2026,
    month: 1,
    label: "Jan 2026",
    netWorth: 12000,
    totalAssets: 20000,
    totalLiabilities: -8000,
  };

  it("accepts a point for any calendar month, January to December", () => {
    expect(PortfolioHistoryPointDto.safeParse(point).success).toBe(true);
    expect(
      PortfolioHistoryPointDto.safeParse({ ...point, month: 12, label: "Dec 2026" }).success,
    ).toBe(true);
  });

  it("refuses a month outside the calendar", () => {
    expect(PortfolioHistoryPointDto.safeParse({ ...point, month: 0 }).success).toBe(false);
    expect(PortfolioHistoryPointDto.safeParse({ ...point, month: 13 }).success).toBe(false);
  });
});
