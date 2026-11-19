import { describe, expect, it } from "vitest";
import { PortfolioSnapshot, type RawAccount } from "../../portfolio.js";
import { isBuyToLetAccount, isBuyToLetAccountName, selectLoanToValue } from "./loan-to-value.js";

const mortgage: RawAccount = { id: "m", name: "Mortgage", type: "Mortgage", balance: 186000 };
const home: RawAccount = {
  id: "h",
  name: "Home (your estimate)",
  type: "Property",
  balance: 310000,
};
const btlFlat: RawAccount = { id: "b", name: "Buy-to-let flat", type: "Property", balance: 235000 };
const btlLoan: RawAccount = {
  id: "bm",
  name: "BTL interest-only mortgage",
  type: "Mortgage",
  balance: 150000,
};
const snap = (...accounts: RawAccount[]) => new PortfolioSnapshot(accounts);

describe("selectLoanToValue (residential only)", () => {
  it("is 186,000 / 310,000 = 60% from the home Property account", () => {
    expect(selectLoanToValue(snap(mortgage, home))).toEqual({
      status: "known",
      value: { percent: 60, homeValue: 310000, mortgageBalance: 186000 },
      provenance: "derived",
    });
  });

  it("leaves buy-to-let property and mortgages out: still 60% with a BTL flat and loan", () => {
    const fig = selectLoanToValue(snap(mortgage, home, btlFlat, btlLoan));
    expect(fig.status === "known" && fig.value).toEqual({
      percent: 60,
      homeValue: 310000,
      mortgageBalance: 186000,
    });
  });

  it("is unknown when a second property makes the home ambiguous (HM-3)", () => {
    // Homeowner: 186,000 / 310,000 = 0.6, so 60%. Adding a "Rental flat" worth 200,000 whose name
    // does not say buy to let used to give 186,000 / 510,000 = 36.47%. Two non-buy-to-let
    // properties means the home cannot be told apart, so the figure is left out.
    const rental: RawAccount = { id: "r", name: "Rental flat", type: "Property", balance: 200000 };
    expect(selectLoanToValue(snap(mortgage, home))).toMatchObject({ value: { percent: 60 } });
    expect(selectLoanToValue(snap(mortgage, home, rental))).toEqual({
      status: "unknown",
      missing: ["homeValue"],
      reason: "ambiguous-home",
    });
  });

  it("uses the selected residential mortgage when one is named", () => {
    const second: RawAccount = {
      id: "m2",
      name: "Second charge",
      type: "Mortgage",
      balance: 31000,
    };
    const all = selectLoanToValue(snap(mortgage, second, home));
    expect(all.status === "known" && all.value.mortgageBalance).toBe(217000);
    const one = selectLoanToValue(snap(mortgage, second, home), { mortgageAccountId: "m2" });
    expect(one.status === "known" && one.value).toEqual({
      percent: 10,
      homeValue: 310000,
      mortgageBalance: 31000,
    });
  });

  it("is unknown when the named mortgage is a buy-to-let or not a mortgage", () => {
    const unknown = { status: "unknown", missing: ["mortgageBalance"], reason: "not-set" };
    expect(selectLoanToValue(snap(mortgage, home, btlLoan), { mortgageAccountId: "bm" })).toEqual(
      unknown,
    );
    expect(selectLoanToValue(snap(mortgage, home), { mortgageAccountId: "h" })).toEqual(unknown);
  });

  it("goes by the chosen mortgage subtype ahead of the name", () => {
    // "Oak Street" is a BTL by subtype only: left out, so 186,000 / 310,000 = 60%.
    const subtypeBtl: RawAccount = {
      id: "s",
      name: "Oak Street",
      type: "Mortgage",
      balance: 90000,
      accountSubtype: "btl_mortgage",
    };
    // "Btl Bank home loan" is residential by subtype: counted, so (186,000 + 31,000) / 310,000 = 70%.
    const subtypeHome: RawAccount = {
      id: "r",
      name: "Btl Bank home loan",
      type: "Mortgage",
      balance: 31000,
      accountSubtype: "residential_mortgage",
    };
    const fig = selectLoanToValue(snap(mortgage, home, subtypeBtl, subtypeHome));
    expect(fig.status === "known" && fig.value).toEqual({
      percent: 70,
      homeValue: 310000,
      mortgageBalance: 217000,
    });
  });

  it("rounds to one decimal place", () => {
    const fig = selectLoanToValue(
      snap({ ...mortgage, balance: 100000 }, { ...home, balance: 300000 }),
    );
    expect(fig.status === "known" && fig.value.percent).toBe(33.3);
  });

  it("is unknown, never 0%, when there is no residential property or it is 0", () => {
    const unknown = { status: "unknown", missing: ["homeValue"], reason: "not-set" };
    expect(selectLoanToValue(snap(mortgage))).toEqual(unknown);
    expect(selectLoanToValue(snap(mortgage, btlFlat))).toEqual(unknown);
    expect(selectLoanToValue(snap(mortgage, { ...home, balance: 0 }))).toEqual(unknown);
  });

  it("is unknown when there is no residential mortgage balance", () => {
    expect(selectLoanToValue(snap(home, btlLoan))).toEqual({
      status: "unknown",
      missing: ["mortgageBalance"],
      reason: "not-set",
    });
    expect(selectLoanToValue(snap())).toEqual({
      status: "unknown",
      missing: ["homeValue", "mortgageBalance"],
      reason: "not-set",
    });
  });
});

describe("isBuyToLetAccountName", () => {
  it("matches the buy-to-let names accounts are saved with", () => {
    for (const name of ["Buy-to-let flat", "buy to let", "BTL interest-only mortgage", "My BTL"]) {
      expect(isBuyToLetAccountName(name), name).toBe(true);
    }
    for (const name of ["Home (your estimate)", "Residential Mortgage", "Subtle", "Bottle fund"]) {
      expect(isBuyToLetAccountName(name), name).toBe(false);
    }
  });
});

describe("isBuyToLetAccount", () => {
  it("puts a chosen mortgage subtype first and falls back to the name", () => {
    expect(isBuyToLetAccount({ name: "Oak Street", accountSubtype: "btl_mortgage" })).toBe(true);
    expect(isBuyToLetAccount({ name: "BTL loan", accountSubtype: "residential_mortgage" })).toBe(
      false,
    );
    expect(isBuyToLetAccount({ name: "BTL loan", accountSubtype: null })).toBe(true);
    expect(isBuyToLetAccount({ name: "Buy-to-let flat" })).toBe(true);
    expect(isBuyToLetAccount({ name: "Home" })).toBe(false);
  });
});

describe("selectLoanToValue with saved property kinds (system audit slice 4, L71)", () => {
  // A home and a rental whose name does not say buy to let. The saved kind decides, not the name.
  const savedHome: RawAccount = { ...home, accountSubtype: "home" };
  const savedRental: RawAccount = {
    id: "r",
    name: "Flat 2",
    type: "Property",
    accountSubtype: "rental",
    balance: 200000,
  };

  it("counts only the home: 186,000 / 310,000 = 60.0%, the rental's 200,000 left out", () => {
    // Before slice 4 "Flat 2" read as a second home: unknown, or 186,000 / 510,000 = 36.5%.
    expect(selectLoanToValue(snap(mortgage, savedHome, savedRental))).toEqual({
      status: "known",
      value: { percent: 60, homeValue: 310000, mortgageBalance: 186000 },
      provenance: "derived",
    });
  });

  it("never takes a rental as the home, even when it is the only property", () => {
    // Mortgage 186,000 with only a rental saved: no home value, so unknown, not 186,000 / 200,000.
    expect(selectLoanToValue(snap(mortgage, savedRental))).toEqual({
      status: "unknown",
      missing: ["homeValue"],
      reason: "not-set",
    });
  });

  it("a property named 'Buy to let' but saved as the home is the home", () => {
    // 186,000 / 250,000 = 0.744, so 74.4%.
    const named: RawAccount = {
      id: "n",
      name: "Buy to let cottage",
      type: "Property",
      accountSubtype: "home",
      balance: 250000,
    };
    expect(selectLoanToValue(snap(mortgage, named))).toMatchObject({
      status: "known",
      value: { percent: 74.4, homeValue: 250000 },
    });
  });

  it("measures one mortgage against the property it is linked to", () => {
    // Two homes saved (ambiguous by kind), but the mortgage is linked to the second one, worth
    // 400,000: 186,000 / 400,000 = 0.465, so 46.5%.
    const second: RawAccount = {
      id: "h2",
      name: "Cottage",
      type: "Property",
      accountSubtype: "home",
      balance: 400000,
    };
    const linked: RawAccount = { ...mortgage, linkedAccountId: "h2" };
    expect(selectLoanToValue(snap(linked, savedHome, second))).toMatchObject({
      reason: "ambiguous-home",
    });
    expect(selectLoanToValue(snap(linked, savedHome, second), { mortgageAccountId: "m" })).toEqual({
      status: "known",
      value: { percent: 46.5, homeValue: 400000, mortgageBalance: 186000 },
      provenance: "derived",
    });
  });
});

describe("isBuyToLetAccount with property kinds", () => {
  it("reads the saved kind before the name", () => {
    expect(isBuyToLetAccount({ name: "Flat 2", accountSubtype: "rental" })).toBe(true);
    expect(isBuyToLetAccount({ name: "BTL flat", accountSubtype: "home" })).toBe(false);
    expect(isBuyToLetAccount({ name: "BTL flat", accountSubtype: null })).toBe(true);
  });
});
