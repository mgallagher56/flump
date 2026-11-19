import { describe, expect, it } from "vitest";
import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "./portfolio.js";

/** Rows arrive from the database and from the web as loosely typed values. */
const loose = (v: unknown) => v as number;

const savings = (extra: Partial<RawAccount> = {}): RawAccount => ({
  id: "s1",
  name: "Savings",
  type: "Saving",
  balance: 100,
  ...extra,
});

const historyOf = (details: RawAccountDetail[]) =>
  new PortfolioSnapshot([savings()], details).getAccount("s1")?.history;

describe("account history rows", () => {
  it("sorts rows oldest first across a year end, whatever order they arrive in", () => {
    const snapshot = new PortfolioSnapshot(
      [savings()],
      [
        { accountId: "s1", year: 2026, month: 3, value: 300 },
        { accountId: "s1", year: 2025, month: 12, value: 1200 },
        // The database column name is accepted too.
        { account_id: "s1", year: 2026, month: 1, value: 100 },
      ],
    );
    const account = snapshot.getAccount("s1");
    expect(account?.history).toEqual([
      { year: 2025, month: 12, value: 1200 },
      { year: 2026, month: 1, value: 100 },
      { year: 2026, month: 3, value: 300 },
    ]);
    // The latest row is March 2026.
    expect(account?.latestYear).toBe(2026);
    expect(account?.latestMonth).toBe(3);
  });

  it("keeps years 1900 to 2200 and months 1 to 12, and skips anything outside them", () => {
    const history = historyOf([
      { accountId: "s1", year: 1900, month: 1, value: 1 },
      { accountId: "s1", year: 2200, month: 12, value: 2 },
      { accountId: "s1", year: 1899, month: 6, value: 3 },
      { accountId: "s1", year: 2201, month: 6, value: 4 },
      { accountId: "s1", year: 2026.5, month: 6, value: 5 },
      { accountId: "s1", year: 2026, month: 0, value: 6 },
      { accountId: "s1", year: 2026, month: 13, value: 7 },
      { accountId: "s1", year: 2026, month: 1.5, value: 8 },
    ]);
    expect(history).toEqual([
      { year: 1900, month: 1, value: 1 },
      { year: 2200, month: 12, value: 2 },
    ]);
  });

  it("skips a row with no value, an empty value or a value that is not a number, but keeps 0", () => {
    // Number(null) and Number("") are both 0, so they must be skipped before conversion.
    const history = historyOf([
      { accountId: "s1", year: 2026, month: 1, value: loose(null) },
      { accountId: "s1", year: 2026, month: 2, value: "" },
      { accountId: "s1", year: 2026, month: 3, value: "abc" },
      { accountId: "s1", year: 2026, month: 4, value: 0 },
      { accountId: "s1", year: 2026, month: 5, value: "250" },
    ]);
    expect(history).toEqual([
      { year: 2026, month: 4, value: 0 },
      { year: 2026, month: 5, value: 250 },
    ]);
  });

  it("gives an account with no rows an empty history and no latest month", () => {
    const account = new PortfolioSnapshot([savings()], []).getAccount("s1");
    expect(account?.history).toEqual([]);
    expect(account?.latestMonth).toBeUndefined();
    expect(account?.latestYear).toBeUndefined();
  });
});

describe("account defaults", () => {
  it("builds an empty snapshot when no accounts are given", () => {
    expect(new PortfolioSnapshot().getResolvedAccounts()).toEqual([]);
    expect(
      new PortfolioSnapshot(loose(null) as unknown as RawAccount[], []).getResolvedAccounts(),
    ).toEqual([]);
  });

  it("gives an account with no id the id acc_<index>, used by every lookup", () => {
    const snapshot = new PortfolioSnapshot(
      [{ name: "No id", type: "Saving", balance: 50, accountSubtype: "cash_isa" }],
      [{ accountId: "acc_0", year: 2026, month: 1, value: 40 }],
    );
    expect(snapshot.getAccount("acc_0")?.history).toEqual([{ year: 2026, month: 1, value: 40 }]);
    expect(snapshot.getAccountSubtype("acc_0")).toBe("cash_isa");
  });

  it("treats an account with no type as other and no currency as GBP", () => {
    const [account] = new PortfolioSnapshot([{ id: "x", balance: 10 }], []).getResolvedAccounts();
    expect(account?.rawType).toBe("other");
    expect(account?.category).toBe("other");
    expect(account?.currency).toBe("GBP");
  });

  it("keeps a stored currency", () => {
    const [account] = new PortfolioSnapshot(
      [savings({ currency: "EUR" })],
      [],
    ).getResolvedAccounts();
    expect(account?.currency).toBe("EUR");
  });

  it("treats an empty stored rate or contribution as not known", () => {
    // Number("") is 0, which would otherwise read as a known 0% rate.
    const account = new PortfolioSnapshot(
      [savings({ interestRate: "", monthlyContribution: "" })],
      [],
    ).getAccount("s1");
    expect(account?.interestRateKnown).toBe(false);
    expect(account?.monthlyContributionKnown).toBe(false);
  });
});

describe("account lookups", () => {
  const snapshot = new PortfolioSnapshot(
    [
      {
        id: "m1",
        type: "Mortgage",
        balance: -1000,
        accountSubtype: "btl_mortgage",
        linkedAccountId: "p1",
      },
      { id: "m2", type: "Mortgage", balance: -1000, accountSubtype: "", linkedAccountId: "" },
      { id: "m3", type: "Mortgage", balance: -1000 },
    ],
    [],
  );

  it("returns a stored subtype, and null when it is empty, missing or the account is unknown", () => {
    expect(snapshot.getAccountSubtype("m1")).toBe("btl_mortgage");
    expect(snapshot.getAccountSubtype("m2")).toBeNull();
    expect(snapshot.getAccountSubtype("m3")).toBeNull();
    expect(snapshot.getAccountSubtype("missing")).toBeNull();
  });

  it("returns a linked property, and null when it is empty, missing or the account is unknown", () => {
    expect(snapshot.getLinkedAccountId("m1")).toBe("p1");
    expect(snapshot.getLinkedAccountId("m2")).toBeNull();
    expect(snapshot.getLinkedAccountId("m3")).toBeNull();
    expect(snapshot.getLinkedAccountId("missing")).toBeNull();
  });

  it("gives 0 as the balance of an unknown account", () => {
    expect(snapshot.getLatestBalance("missing")).toBe(0);
  });
});

describe("debt items", () => {
  const item = (extra: Partial<RawAccount>) => {
    const [debt] = new PortfolioSnapshot(
      [{ id: "c1", name: "Card", type: "Credit Card", balance: -2000, ...extra }],
      [],
    ).toDebtItems();
    return debt;
  };

  it("estimates the minimum payment when the stored contribution is 0", () => {
    // A stored 0 is not a payment. Estimate: greater of 25 and 2.5% of 2,000 = 50.
    const debt = item({ monthlyContribution: 0 });
    expect(debt?.minimumPaymentEstimated).toBe(true);
    expect(debt?.minimumPayment).toBe(50);
  });

  it("passes a stored credit limit through, including 0", () => {
    expect(item({ creditLimit: 5000 })?.creditLimitGbp).toBe(5000);
    expect(item({ creditLimit: "0" })?.creditLimitGbp).toBe(0);
  });

  it("leaves the credit limit out when it is missing, empty or negative", () => {
    for (const creditLimit of [undefined, null, "", -1]) {
      const debt = item({ creditLimit });
      expect(debt && "creditLimitGbp" in debt).toBe(false);
    }
  });

  it("passes a 0% promotion end date through", () => {
    expect(item({ promoZeroPercentUntil: "2027-01-31" })?.promoAprExpiryDate).toBe("2027-01-31");
  });

  it("leaves the promotion end date out when it is missing or empty", () => {
    for (const promoZeroPercentUntil of [undefined, null, ""]) {
      const debt = item({ promoZeroPercentUntil });
      expect(debt && "promoAprExpiryDate" in debt).toBe(false);
    }
  });
});
