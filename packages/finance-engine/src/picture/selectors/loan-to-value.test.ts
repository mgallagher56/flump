import { describe, expect, it } from "vitest";
import { PortfolioSnapshot, type RawAccount } from "../../portfolio.js";
import { isBuyToLetAccountName, selectLoanToValue } from "./loan-to-value.js";

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
