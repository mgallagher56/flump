import type { TaxRecord } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import {
  calculatedInterestOffers,
  linkableAccountsFor,
  linkFits,
  rentalShareLines,
  rentalShareNotice,
  type TaxAccount,
} from "./linkedAccounts";

const flat: TaxAccount = {
  id: "p1",
  name: "Flat 2",
  type: "Property",
  accountSubtype: "rental",
  ownership: "joint",
  sharePercent: 50,
  balance: 230000,
};
const home: TaxAccount = { id: "h1", name: "Home", type: "Property", accountSubtype: "home" };
const btl: TaxAccount = {
  id: "m1",
  name: "Flat 2 mortgage",
  type: "Mortgage",
  accountSubtype: null,
  linkedAccountId: "p1",
  interestRate: 4.5,
  balance: -150000,
  details: Array.from({ length: 13 }, (_, i) => ({
    year: i < 9 ? 2026 : 2027,
    month: ((i + 3) % 12) + 1,
    value: -150000,
  })),
};
const homeLoan: TaxAccount = {
  id: "m2",
  name: "Home mortgage",
  type: "Mortgage",
  accountSubtype: "residential_mortgage",
  interestRate: 4,
  details: [{ year: 2026, month: 4, value: -100000 }],
};
const saver: TaxAccount = {
  id: "s1",
  name: "Easy access",
  type: "Saving",
  ownership: "joint",
  sharePercent: 50,
  interestRate: 4,
  details: [{ year: 2026, month: 4, value: 40000 }],
};
const isa: TaxAccount = {
  id: "s2",
  name: "Cash ISA",
  type: "Saving",
  interestRate: 4.2,
  details: [{ year: 2026, month: 4, value: 10000 }],
};
const shares: TaxAccount = { id: "i1", name: "Shares", type: "Investment" };

const record = (over: Partial<TaxRecord>): TaxRecord => ({
  id: "r",
  type: "expense",
  source: "rental",
  category: "mortgage_interest",
  name: "x",
  amount: 100,
  frequency: "annual",
  date: "2026-04-06",
  endDate: null,
  notes: null,
  receiptFilename: null,
  receiptMimeType: null,
  receiptData: null,
  userId: "u",
  createdAt: "2026-04-06T00:00:00.000Z",
  updatedAt: "2026-04-06T00:00:00.000Z",
  ...over,
});

const accounts = [flat, home, btl, homeLoan, saver, isa, shares];

describe("linkableAccountsFor", () => {
  it("offers rental properties and every mortgage for rental records", () => {
    expect(linkableAccountsFor("rental", accounts).map((a) => a.id)).toEqual(["p1", "m1", "m2"]);
  });
  it("offers savings and investment accounts for savings records", () => {
    expect(linkableAccountsFor("savings", accounts).map((a) => a.id)).toEqual(["s1", "s2", "i1"]);
  });
  it("offers nothing for self-employed and PAYE records", () => {
    expect(linkableAccountsFor("self-employed", accounts)).toEqual([]);
    expect(linkableAccountsFor("paye", accounts)).toEqual([]);
  });
  it("says whether a link still fits a source", () => {
    expect(linkFits("rental", "p1", accounts)).toBe(true);
    expect(linkFits("savings", "p1", accounts)).toBe(false);
    expect(linkFits("savings", null, accounts)).toBe(false);
  });
});

describe("calculatedInterestOffers", () => {
  it("offers interest for a buy-to-let mortgage with a rate and history", () => {
    // 150,000 held all year at 4.5%: 150,000 x 4.5% / 12 = 562.50 a month, x 12 = 6,750.00.
    const offers = calculatedInterestOffers({
      accounts: [flat, btl],
      records: [],
      taxYear: "2026/27",
    });
    expect(offers).toEqual([
      {
        kind: "mortgage_interest",
        accountId: "m1",
        accountName: "Flat 2 mortgage",
        ratePct: 4.5,
        amount: 6750,
        sharePercent: 100,
      },
    ]);
  });

  it("leaves out a mortgage already given an interest record linked to it in the year", () => {
    const records = [record({ accountId: "m1" })];
    expect(
      calculatedInterestOffers({ accounts: [flat, btl], records, taxYear: "2026/27" }),
    ).toEqual([]);
  });

  it("still offers it when the interest record is unlinked or in another year", () => {
    const records = [
      record({ accountId: null }),
      record({ accountId: "m1", date: "2025-04-06", endDate: "2026-04-05" }),
    ];
    expect(
      calculatedInterestOffers({ accounts: [flat, btl], records, taxYear: "2026/27" }),
    ).toHaveLength(1);
  });

  it("never offers a home mortgage, an ISA or an account with no rate or history", () => {
    const noRate = { ...btl, id: "m3", interestRate: null };
    const noHistory = { ...btl, id: "m4", details: [] };
    expect(
      calculatedInterestOffers({
        accounts: [flat, homeLoan, isa, noRate, noHistory, shares],
        records: [],
        taxYear: "2026/27",
      }),
    ).toEqual([]);
  });

  it("offers savings interest at the person's share for a taxable savings account", () => {
    // 40,000 at 4% AER, held all year from April 2026, half share. The monthly rate compounding
    // to 4% is 1.04^(1/12) - 1 = 0.00327374; 40,000 x 0.00327374 x 12 = 1,571.40; half = 785.70.
    const offers = calculatedInterestOffers({ accounts: [saver], records: [], taxYear: "2026/27" });
    expect(offers).toEqual([
      {
        kind: "savings_interest",
        accountId: "s1",
        accountName: "Easy access",
        ratePct: 4,
        amount: 785.7,
        sharePercent: 50,
      },
    ]);
  });

  it("leaves out savings already given an interest record linked to the account", () => {
    const records = [
      record({ accountId: "s1", source: "savings", type: "income", category: "savings_interest" }),
    ];
    expect(calculatedInterestOffers({ accounts: [saver], records, taxYear: "2026/27" })).toEqual(
      [],
    );
  });
});

describe("rentalShareNotice", () => {
  const rent = record({ type: "income", category: "rental_income", accountId: null });

  it("says rent counts in full when no rental property is saved", () => {
    expect(rentalShareNotice([], [rent], "2026/27")).toBe("no-rental-property");
  });
  it("asks for links when rental properties have different shares", () => {
    const other = { ...flat, id: "p2", sharePercent: 100, ownership: "sole" };
    expect(rentalShareNotice([flat, other], [rent], "2026/27")).toBe("shares-differ");
  });
  it("says nothing with one rental property, or when every rental record is linked", () => {
    expect(rentalShareNotice([flat], [rent], "2026/27")).toBeNull();
    const other = { ...flat, id: "p2", sharePercent: 100, ownership: "sole" };
    expect(rentalShareNotice([flat, other], [{ ...rent, accountId: "p1" }], "2026/27")).toBeNull();
  });
  it("says nothing without rental records in the year", () => {
    expect(rentalShareNotice([], [], "2026/27")).toBeNull();
  });
});

describe("rentalShareLines", () => {
  it("names each linked property and the share it uses", () => {
    const rent = record({ type: "income", category: "rental_income", accountId: "p1" });
    expect(rentalShareLines([flat, btl], [rent], "2026/27")).toEqual([
      { accountId: "p1", name: "Flat 2", sharePercent: 50 },
    ]);
  });
  it("names the one rental property when unlinked records use its share", () => {
    const rent = record({ type: "income", category: "rental_income", accountId: null });
    expect(rentalShareLines([flat], [rent], "2026/27")).toEqual([
      { accountId: "p1", name: "Flat 2", sharePercent: 50 },
    ]);
  });
  it("names none when the records are counted in full with no property", () => {
    const rent = record({ type: "income", category: "rental_income", accountId: null });
    expect(rentalShareLines([], [rent], "2026/27")).toEqual([]);
  });
});
