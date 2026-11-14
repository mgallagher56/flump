import { describe, expect, it } from "vitest";
import {
  DEFAULT_NET_WORTH_BASIS,
  joinNetWorthLeftOut,
  type NetWorthBasis,
  netWorthBasisFromProfile,
  resolveNetWorthScope,
} from "./net-worth-basis.js";
import { PERSONAS, type PersonaName } from "./picture/__fixtures__/index.js";
import { buildFinancialPicture, financialPictureInputFromRows } from "./picture/build.js";
import { selectNetWorth } from "./picture/selectors/portfolio-totals.js";
import { PortfolioSnapshot, type RawAccount, type RawAccountDetail } from "./portfolio.js";
import { selectNetWorthSeries } from "./snapshots.js";

const basis = (countProperty: boolean, countStudentLoan: boolean): NetWorthBasis => ({
  countProperty,
  countStudentLoan,
});

// The spec's worked example: home 300k, mortgage 186k, student loan 25k, savings 20k.
const example: RawAccount[] = [
  { id: "home", name: "Home", type: "Property", balance: 300000 },
  { id: "mort", name: "Residential Mortgage", type: "Mortgage", balance: 186000 },
  { id: "sl", name: "Student loan", type: "Student Loan", balance: 25000 },
  { id: "sav", name: "Savings", type: "Saving", balance: 20000 },
];

const totals = (accounts: RawAccount[], b: NetWorthBasis, details: RawAccountDetail[] = []) =>
  selectNetWorth(new PortfolioSnapshot(accounts, details), b);

describe("netWorthBasisFromProfile", () => {
  it("is today's behaviour when the profile or a field is missing", () => {
    expect(netWorthBasisFromProfile(null)).toEqual(DEFAULT_NET_WORTH_BASIS);
    expect(netWorthBasisFromProfile(undefined)).toEqual(DEFAULT_NET_WORTH_BASIS);
    expect(netWorthBasisFromProfile({})).toEqual({ countProperty: true, countStudentLoan: false });
    expect(netWorthBasisFromProfile({ netWorthCountsStudentLoan: true })).toEqual({
      countProperty: true,
      countStudentLoan: true,
    });
    expect(netWorthBasisFromProfile({ netWorthCountsProperty: false })).toEqual({
      countProperty: false,
      countStudentLoan: false,
    });
  });

  it("feeds the picture input from saved rows", () => {
    const input = financialPictureInputFromRows({
      profile: { netWorthCountsProperty: false, netWorthCountsStudentLoan: true },
      accounts: example,
    });
    expect(input.netWorthBasis).toEqual({ countProperty: false, countStudentLoan: true });
    expect(buildFinancialPicture(input).netWorth.netWorth).toBe(-5000);
  });
});

describe("the four combinations (worked example)", () => {
  it.each([
    [true, false, 134000, 320000, 186000, ["studentLoan"]],
    [true, true, 109000, 320000, 211000, []],
    [false, false, 20000, 20000, 0, ["property", "mortgage", "studentLoan"]],
    [false, true, -5000, 20000, 25000, ["property", "mortgage"]],
  ] as const)(
    "property %s, student loan %s: net worth %d",
    (p, s, netWorth, assets, liabilities, leftOut) => {
      const nw = totals(example, basis(p, s));
      expect(nw.netWorth).toBe(netWorth);
      expect(nw.totalAssets).toBe(assets);
      expect(nw.totalLiabilities).toBe(liabilities);
      expect(nw.totalAssets - nw.totalLiabilities).toBe(nw.netWorth);
      expect(nw.leftOut).toEqual(leftOut);
      expect(nw.basis).toEqual(basis(p, s));
      // The category parts are the saved amounts whatever the basis.
      expect(nw.property).toBe(300000);
      expect(nw.studentLoans).toBe(25000);
    },
  );

  it("never puts a student loan in consumer debt or the payoff set", () => {
    const snap = new PortfolioSnapshot(example);
    expect(snap.getTotalConsumerDebt()).toBe(0);
    expect(snap.toDebtItems()).toEqual([]);
  });

  it("joins the leave-out items in fixed order with commas and 'or'", () => {
    expect(joinNetWorthLeftOut(["property", "mortgage", "studentLoan"])).toBe(
      "property, mortgage or student loan",
    );
    expect(joinNetWorthLeftOut(["property", "mortgage"])).toBe("property or mortgage");
    expect(joinNetWorthLeftOut(["studentLoan"])).toBe("student loan");
    expect(joinNetWorthLeftOut(["homeValueMissing"])).toBe("");
    expect(joinNetWorthLeftOut([])).toBe("");
  });
});

describe("edge cases", () => {
  it("a mortgage with no home value still counts, and reports homeValueMissing", () => {
    const accounts: RawAccount[] = [
      { id: "mort", name: "Mortgage", type: "Mortgage", balance: 186000 },
      { id: "sav", name: "Savings", type: "Saving", balance: 20000 },
    ];
    const on = totals(accounts, DEFAULT_NET_WORTH_BASIS);
    expect(on.netWorth).toBe(-166000);
    expect(on.leftOut).toEqual(["homeValueMissing"]);
    // Property off: neither side counts, and there is no home value to ask for.
    const off = totals(accounts, basis(false, false));
    expect(off.netWorth).toBe(20000);
    expect(off.leftOut).toEqual(["mortgage"]);
  });

  it("a Property account at £0 counts as a missing home value", () => {
    const accounts: RawAccount[] = [
      { id: "home", name: "Home", type: "Property", balance: 0 },
      { id: "mort", name: "Mortgage", type: "Mortgage", balance: 100000 },
    ];
    expect(totals(accounts, DEFAULT_NET_WORTH_BASIS).leftOut).toEqual(["homeValueMissing"]);
  });

  it("a paid-off mortgage with no home value does not ask for one", () => {
    const accounts: RawAccount[] = [{ id: "mort", name: "Mortgage", type: "Mortgage", balance: 0 }];
    expect(totals(accounts, DEFAULT_NET_WORTH_BASIS).leftOut).toEqual([]);
  });

  it("two properties follow one choice together", () => {
    const accounts: RawAccount[] = [
      { id: "h1", name: "Home", type: "Property", balance: 300000 },
      { id: "h2", name: "Cottage", type: "Property", balance: 150000 },
      { id: "m1", name: "Mortgage", type: "Mortgage", balance: 100000 },
    ];
    expect(totals(accounts, DEFAULT_NET_WORTH_BASIS).netWorth).toBe(350000);
    expect(totals(accounts, basis(false, false)).netWorth).toBe(0);
    expect(totals(accounts, DEFAULT_NET_WORTH_BASIS).leftOut).toEqual([]);
  });

  it("buy-to-let follows the same choice and is its own group for the missing value", () => {
    const accounts: RawAccount[] = [
      { id: "home", name: "Home", type: "Property", balance: 300000 },
      { id: "m1", name: "Residential Mortgage", type: "Mortgage", balance: 100000 },
      { id: "btlm", name: "Buy-to-let mortgage", type: "Mortgage", balance: 120000 },
    ];
    const on = totals(accounts, DEFAULT_NET_WORTH_BASIS);
    expect(on.netWorth).toBe(80000);
    // The home's value does not cover the buy-to-let mortgage's missing property value.
    expect(on.leftOut).toEqual(["homeValueMissing"]);
    const withBtl = [
      ...accounts,
      { id: "btl", name: "BTL flat", type: "Property", balance: 200000 },
    ] satisfies RawAccount[];
    expect(totals(withBtl, DEFAULT_NET_WORTH_BASIS).leftOut).toEqual([]);
    expect(totals(withBtl, basis(false, false)).netWorth).toBe(0);
  });

  it("records current behaviour: buy-to-let is known by name only, so a plainly named property does not cover a buy-to-let mortgage", () => {
    // The mortgage is named buy-to-let, its property is not, so they land in different groups:
    // the property covers the (empty) home group and the buy-to-let group has no value.
    const accounts: RawAccount[] = [
      { id: "flat", name: "Flat in Leeds", type: "Property", balance: 200000 },
      { id: "btlm", name: "Buy-to-let mortgage", type: "Mortgage", balance: 120000 },
    ];
    const on = totals(accounts, DEFAULT_NET_WORTH_BASIS);
    expect(on.netWorth).toBe(80000);
    expect(on.leftOut).toEqual(["homeValueMissing"]);
  });

  it("other loans, including secured ones, always count", () => {
    const accounts: RawAccount[] = [
      { id: "sec", name: "Secured loan on the house", type: "Loan", balance: 15000 },
      { id: "sav", name: "Savings", type: "Saving", balance: 20000 },
    ];
    for (const b of [
      basis(true, true),
      basis(true, false),
      basis(false, true),
      basis(false, false),
    ]) {
      expect(totals(accounts, b).netWorth).toBe(5000);
      expect(totals(accounts, b).totalLiabilities).toBe(15000);
    }
  });

  it("an overdrawn current account counts as a liability under every basis", () => {
    const accounts: RawAccount[] = [{ id: "cur", name: "Current", type: "Current", balance: -300 }];
    for (const b of [basis(true, true), basis(false, false)]) {
      expect(totals(accounts, b)).toMatchObject({ netWorth: -300, totalLiabilities: 300 });
    }
  });

  it("only lists kinds the user has accounts for", () => {
    const accounts: RawAccount[] = [{ id: "sav", name: "Savings", type: "Saving", balance: 1 }];
    expect(totals(accounts, basis(false, false)).leftOut).toEqual([]);
    expect(resolveNetWorthScope([], basis(false, false)).leftOut).toEqual([]);
  });

  it("scope ids default to acc_<index>, as PortfolioSnapshot does", () => {
    const scope = resolveNetWorthScope(
      [{ type: "Saving" }, { type: "Student Loan" }],
      DEFAULT_NET_WORTH_BASIS,
    );
    expect(scope.counts("acc_0")).toBe(true);
    expect(scope.counts("acc_1")).toBe(false);
    expect(scope.counts("missing")).toBe(false);
  });
});

describe("history under the basis", () => {
  const details: RawAccountDetail[] = [
    { accountId: "home", year: 2026, month: 1, value: 290000 },
    { accountId: "mort", year: 2026, month: 1, value: 188000 },
    { accountId: "sl", year: 2026, month: 1, value: 26000 },
    { accountId: "sav", year: 2026, month: 1, value: 18000 },
    { accountId: "sav", year: 2026, month: 2, value: 20000 },
  ];
  const rows = details.map((d) => ({
    accountId: String(d.accountId),
    year: d.year,
    month: d.month,
    value: d.value,
  }));

  it.each([
    [true, false, [120000, 122000]],
    [true, true, [94000, 96000]],
    [false, false, [18000, 20000]],
    [false, true, [-8000, -6000]],
  ] as const)("property %s, student loan %s: every month", (p, s, expected) => {
    const b = basis(p, s);
    const history = new PortfolioSnapshot(example, details).getMonthlyHistory(b);
    expect(history.map((h) => h.netWorth)).toEqual(expected);
    const series = selectNetWorthSeries(example, rows, b);
    expect(series.map((h) => h.netWorth)).toEqual(expected);
    for (const h of history) expect(h.totalAssets - h.totalLiabilities).toBe(h.netWorth);
  });

  it("a counted student loan is an amount owed in the series", () => {
    const point = selectNetWorthSeries(example, rows, basis(true, true))[0];
    expect(point?.accounts.find((a) => a.accountId === "sl")).toEqual({
      accountId: "sl",
      value: 26000,
      isLiability: true,
      carried: false,
    });
  });
});

describe("personas under the default basis", () => {
  const names = Object.keys(PERSONAS) as PersonaName[];

  it.each(names)("%s: the default basis is the figure from saved rows with no choices", (name) => {
    const { fixture } = PERSONAS[name];
    expect(fixture.netWorthBasis).toEqual(DEFAULT_NET_WORTH_BASIS);
    const fromRows = financialPictureInputFromRows({
      profile: null,
      accounts: fixture.accounts,
      accountDetails: fixture.details,
    });
    const snap = new PortfolioSnapshot(fixture.accounts, fixture.details);
    expect(selectNetWorth(snap, fromRows.netWorthBasis).netWorth).toBe(
      selectNetWorth(snap, fixture.netWorthBasis).netWorth,
    );
  });

  it("the homeowner's net worth is unchanged and nothing is left out", () => {
    const { fixture, expected } = PERSONAS.homeowner;
    const nw = selectNetWorth(
      new PortfolioSnapshot(fixture.accounts, fixture.details),
      DEFAULT_NET_WORTH_BASIS,
    );
    expect(nw.netWorth).toBe(expected.portfolio.netWorth);
    expect(nw.leftOut).not.toContain("homeValueMissing");
  });
});
