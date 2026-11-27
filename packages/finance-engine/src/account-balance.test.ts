import { describe, expect, it } from "vitest";
import {
  ACCOUNT_TYPE_ORDER,
  isLeftOutOfNetWorth,
  isOwedAccountType,
  selectAccountBalance,
  selectAccountBalanceSeries,
  selectAccountChangeEffect,
  selectAccountGroups,
  selectSeriesChange,
  toShownBalance,
} from "./account-balance.js";

// The current month in every case is November 2026 unless a case says otherwise.
const NOV = "2026-11";
const row = (month: number, year: number, value: number | string | null, extra = {}) => ({
  account_id: "a1",
  month,
  year,
  value,
  ...extra,
});

describe("isOwedAccountType and toShownBalance", () => {
  it("names the five stored types shown as amounts owed, by their exact stored names", () => {
    for (const type of ["Mortgage", "Loan", "Credit Card", "Overdraft", "Student Loan"]) {
      expect(isOwedAccountType(type)).toBe(true);
    }
    for (const type of ["Property", "Current", "Owed", "mortgage", "", null, undefined]) {
      expect(isOwedAccountType(type)).toBe(false);
    }
  });

  it("shows an amount owed as positive and leaves anything else as it is", () => {
    // Stored -40,000 and -300 are owed 40,000 and 300.
    expect(toShownBalance("Student Loan", -40000)).toBe(40000);
    expect(toShownBalance("Overdraft", -300)).toBe(300);
    expect(toShownBalance("Property", 250000)).toBe(250000);
    // An overdrawn current account is not a debt type: it stays negative here.
    expect(toShownBalance("Current", -400)).toBe(-400);
    expect(toShownBalance("Student Loan", undefined)).toBeUndefined();
  });
});

describe("selectAccountBalance: the shown balance", () => {
  it("shows the saved balance, not the latest recorded month", () => {
    // Saved 1,500; October's 1,200 is history. Against October: (1,500 - 1,200) / 1,200 = 25%.
    const result = selectAccountBalance(
      { id: "a1", type: "Current", balance: 1500 },
      [row(9, 2026, 1000), row(10, 2026, 1200)],
      NOV,
    );
    expect(result).toMatchObject({
      balance: 1500,
      changePercent: 25,
      favourable: true,
      latestMonth: "2026-10",
      previousMonth: "2026-10",
    });
  });

  it("reads a saved balance given as a string", () => {
    const result = selectAccountBalance({ id: "a1", type: "Current", balance: "1500.5" }, [], NOV);
    expect(result.balance).toBe(1500.5);
  });

  it.each([
    ["missing", undefined],
    ["null", null],
    ["empty", ""],
  ])("with the saved balance %s, shows the latest month up to now", (_label, balance) => {
    // November's 900, the latest month not in the future (December's 5,000 is).
    const result = selectAccountBalance(
      { id: "a1", type: "Saving", balance },
      [row(10, 2026, 800), row(11, 2026, 900), row(12, 2026, 5000)],
      NOV,
    );
    // (900 - 800) / 800 = 12.5%, rounded half up to 13.
    expect(result).toMatchObject({
      balance: 900,
      changePercent: 13,
      latestMonth: "2026-11",
      previousMonth: "2026-10",
    });
  });

  it("takes the latest month across years, whatever order the rows come in", () => {
    // October 2026 is latest; March 2026 and the 2025 months are earlier.
    const result = selectAccountBalance(
      { id: "a1", type: "Saving" },
      [row(3, 2026, 1), row(10, 2026, 2), row(12, 2025, 3), row(9, 2026, 4), row(5, 2025, 5)],
      NOV,
    );
    expect(result.balance).toBe(2);
    expect(result.latestMonth).toBe("2026-10");
    // The previous month is the latest before November: October too.
    expect(result.previousMonth).toBe("2026-10");
  });

  it("reads months and years given as strings", () => {
    const result = selectAccountBalance(
      { id: "a1", type: "Saving" },
      [row(11, 2026, 5), { account_id: "a1", month: "10", year: "2026", value: "4" }],
      NOV,
    );
    // November's 5 against October's 4: (5 - 4) / 4 = 25%.
    expect(result).toMatchObject({ balance: 5, changePercent: 25, previousMonth: "2026-10" });
  });

  it("a month in the current month counts, the month after does not", () => {
    // November (the current month) is the latest; December 2026 and January 2027 are future.
    const result = selectAccountBalance(
      { id: "a1", type: "Saving" },
      [row(11, 2026, 700), row(12, 2026, 800), row(1, 2027, 900)],
      NOV,
    );
    expect(result.balance).toBe(700);
    expect(result.latestMonth).toBe("2026-11");
  });

  it("a December last year counts in a January", () => {
    // Current month January 2027: December 2026 is the latest and the previous month.
    const result = selectAccountBalance(
      { id: "a1", type: "Saving" },
      [row(12, 2026, 600), row(2, 2027, 650)],
      "2027-01",
    );
    expect(result.balance).toBe(600);
    expect(result.previousMonth).toBe("2026-12");
  });

  it("a latest month with no value gives no balance", () => {
    const result = selectAccountBalance(
      { id: "a1", type: "Saving" },
      [{ account_id: "a1", month: 10, year: 2026 }],
      NOV,
    );
    expect(result.balance).toBeUndefined();
    expect(result.latestMonth).toBe("2026-10");
  });

  it("a latest month whose value is null reads as 0, as web always has", () => {
    // Number(null) is 0.
    const result = selectAccountBalance({ id: "a1", type: "Saving" }, [row(10, 2026, null)], NOV);
    expect(result.balance).toBe(0);
  });

  it("orders rows by year first, even when they arrive oldest first", () => {
    // January 2026 is after December 2025, so it is the latest.
    const result = selectAccountBalance(
      { id: "a1", type: "Saving" },
      [row(12, 2025, 1), row(1, 2026, 2)],
      NOV,
    );
    expect(result.balance).toBe(2);
    expect(result.latestMonth).toBe("2026-01");
  });

  it("with no type a negative balance is shown as it is", () => {
    const result = selectAccountBalance({ id: "a1", balance: -50 }, [], NOV);
    expect(result.balance).toBe(-50);
  });

  it("a row with a null month in the current year counts as an earlier month, as web always has", () => {
    // JavaScript compares null as 0, so the row sorts first and is before November. It has no
    // month key. (1,000 - 500) / 500 = 100%.
    const result = selectAccountBalance(
      { id: "a1", type: "Saving", balance: 1000 },
      [{ account_id: "a1", month: null, year: 2026, value: 500 }],
      NOV,
    );
    expect(result).toMatchObject({ changePercent: 100, previousMonth: null });
  });

  it("rows with no year are compared by month, as web always has", () => {
    // Both rows have no year, so neither is in the future; by month, May (50) is after March (30).
    const result = selectAccountBalance(
      { id: "a1", type: "Saving" },
      [
        { account_id: "a1", month: 5, value: 50 },
        { account_id: "a1", month: 3, value: 30 },
      ],
      NOV,
    );
    expect(result).toMatchObject({ balance: 50, latestMonth: null });
  });

  it("with no history and no saved balance there is nothing to show", () => {
    const result = selectAccountBalance({ id: "a1", type: "Saving" }, [], NOV);
    expect(result).toMatchObject({
      balance: undefined,
      changePercent: null,
      favourable: true,
      latestMonth: null,
      previousMonth: null,
    });
  });
});

describe("selectAccountBalance: whose rows count", () => {
  const stray = { month: 10, year: 2026, value: 900 };

  it("a row with no account id matches no account in a mixed list", () => {
    const result = selectAccountBalance({ id: "a1", type: "Current" }, [stray], NOV);
    expect(result.balance).toBeUndefined();
    expect(result.previousMonth).toBeNull();
  });

  it("a row with no account id belongs to the account when the caller says so", () => {
    const result = selectAccountBalance({ id: "a1", type: "Current" }, [stray], NOV, {
      detailsAreThisAccounts: true,
    });
    expect(result.balance).toBe(900);
    expect(result.previousMonth).toBe("2026-10");
  });

  it("a row for another account never matches, even when the rows are this account's", () => {
    const other = { account_id: "a2", month: 10, year: 2026, value: 500 };
    const result = selectAccountBalance({ id: "a1", type: "Current" }, [other], NOV, {
      detailsAreThisAccounts: true,
    });
    expect(result.balance).toBeUndefined();
  });

  it("reads the account id as accountId too", () => {
    const result = selectAccountBalance(
      { id: "a1", type: "Current" },
      [{ accountId: "a1", month: 10, year: 2026, value: 300 }],
      NOV,
    );
    expect(result.balance).toBe(300);
  });

  it("an account with no id takes any account's rows", () => {
    const result = selectAccountBalance(
      { type: "Current" },
      [{ account_id: "zz", month: 10, year: 2026, value: 250 }],
      NOV,
    );
    expect(result.balance).toBe(250);
  });
});

describe("selectAccountBalance: the change and whether it is good news", () => {
  const change = (type: string, balance: number, previous: number) =>
    selectAccountBalance({ id: "a1", type, balance }, [row(10, 2026, previous)], NOV);

  it("a debt shows the amount owed, and owing less is good news", () => {
    // Owed 1,200, was 1,500: (1,200 - 1,500) / 1,500 = -20%.
    expect(change("Credit Card", -1200, -1500)).toMatchObject({
      balance: 1200,
      changePercent: -20,
      favourable: true,
    });
  });

  it("owing more is not good news", () => {
    // Owed 3,300, was 3,000: +10%.
    expect(change("Loan", -3300, -3000)).toMatchObject({ changePercent: 10, favourable: false });
  });

  it("what you own going down is not good news, going up is", () => {
    // 900 against 1,000: -10%. 1,100 against 1,000: +10%.
    expect(change("Saving", 900, 1000)).toMatchObject({ changePercent: -10, favourable: false });
    expect(change("Saving", 1100, 1000)).toMatchObject({ changePercent: 10, favourable: true });
  });

  it("a change that rounds to 0% is no change, never bad news", () => {
    // 996 against 1,000: -0.4%, rounded 0 (-0 compares equal to 0).
    expect(change("Saving", 996, 1000)).toMatchObject({ changePercent: -0, favourable: true });
    // Owed 1,004 against 1,000: +0.4%, rounded 0, so not bad news either.
    expect(change("Loan", -1004, -1000)).toMatchObject({ changePercent: 0, favourable: true });
  });

  it("a change of half a percent rounds away from 0% and counts", () => {
    // Owed 1,005 against 1,000: +0.5%, rounded 1. Owing more is not good news.
    expect(change("Loan", -1005, -1000)).toMatchObject({ changePercent: 1, favourable: false });
  });

  it("no balance gives no percentage, even with an earlier month", () => {
    // November is recorded with no value, so there is no balance; October's 800 is still earlier.
    const result = selectAccountBalance(
      { id: "a1", type: "Saving" },
      [row(10, 2026, 800), { account_id: "a1", month: 11, year: 2026 }],
      NOV,
    );
    expect(result).toMatchObject({ balance: undefined, changePercent: null, favourable: true });
  });

  it("an earlier month of 0 gives no percentage", () => {
    expect(change("Saving", 100, 0)).toMatchObject({ changePercent: null, favourable: true });
  });

  it("compares with the latest month before the current one, not the current month", () => {
    // November is recorded (1,000) and is the current month; October's 800 is the comparison.
    // (1,000 - 800) / 800 = 25%.
    const result = selectAccountBalance(
      { id: "a1", type: "Current", balance: 1000 },
      [row(10, 2026, 800), row(11, 2026, 1000)],
      NOV,
    );
    expect(result).toMatchObject({ changePercent: 25, previousMonth: "2026-10" });
  });

  it("an earlier month in the current year counts as previous", () => {
    // Only February 2026 is before November 2026: (1,200 - 1,000) / 1,000 = 20%.
    const result = selectAccountBalance(
      { id: "a1", type: "Current", balance: 1200 },
      [row(2, 2026, 1000)],
      NOV,
    );
    expect(result).toMatchObject({ changePercent: 20, previousMonth: "2026-02" });
  });

  it("with only the current month recorded there is no previous month", () => {
    const result = selectAccountBalance(
      { id: "a1", type: "Current", balance: 1200 },
      [row(11, 2026, 1000)],
      NOV,
    );
    expect(result).toMatchObject({ changePercent: null, previousMonth: null });
  });
});

describe("selectAccountBalance: joint accounts", () => {
  it("shows a 50% share and compares it with the earlier month's share", () => {
    // 2,000 x 50% = 1,000; October 1,500 x 50% = 750. (1,000 - 750) / 750 = 33.3%, rounded 33.
    const result = selectAccountBalance(
      {
        id: "a1",
        name: "Joint current",
        type: "Current",
        balance: 2000,
        ownership: "joint",
        sharePercent: 50,
      },
      [row(10, 2026, 1500)],
      NOV,
    );
    expect(result).toMatchObject({ balance: 1000, changePercent: 33 });
  });

  it("shows a 40% share of a joint debt", () => {
    // 200,000 owed x 40% = 80,000; October 205,000 x 40% = 82,000. -2.44%, rounded -2.
    const result = selectAccountBalance(
      {
        id: "a1",
        name: "Joint mortgage",
        type: "Mortgage",
        balance: -200000,
        ownership: "joint",
        sharePercent: "40",
      },
      [row(10, 2026, -205000)],
      NOV,
    );
    expect(result).toMatchObject({ balance: 80000, changePercent: -2, favourable: true });
  });

  it("keeps an ISA whole, whatever its ownership says", () => {
    const result = selectAccountBalance(
      {
        id: "a1",
        name: "Saver",
        type: "Saving",
        accountSubtype: "cash_isa",
        balance: 20000,
        ownership: "joint",
        sharePercent: 50,
      },
      [],
      NOV,
    );
    expect(result.balance).toBe(20000);
  });
});

describe("selectAccountBalance: the account page's hero", () => {
  const hero = (account: Record<string, unknown>, details: unknown[], month = NOV) =>
    selectAccountBalance({ id: "a1", ...account }, details as never[], month, {
      detailsAreThisAccounts: true,
    }).hero;

  it("shows the shown balance, dated by the latest month up to now with its source", () => {
    expect(
      hero({ type: "Saving", balance: 1500 }, [
        { month: 10, year: 2026, value: 1000, source: "calculated" },
      ]),
    ).toEqual({
      balance: 1500,
      month: { month: 10, year: 2026, source: "calculated" },
      earliest: null,
    });
  });

  it("with no history and no saved balance shows 0, with no month", () => {
    expect(hero({ type: "Saving" }, [])).toEqual({ balance: 0, month: null, earliest: null });
  });

  it("after a future-month row shows the latest month up to now, a debt as owed", () => {
    // December 2026 is after November: October's -2,400 is shown as 2,400 owed, not the saved
    // -2,600 the import left.
    expect(
      hero({ type: "Credit Card", balance: -2600 }, [
        { month: 10, year: 2026, value: -2400 },
        { month: 12, year: 2026, value: -2600 },
      ]).balance,
    ).toBe(2400);
  });

  it("a January row next year is a future row; a row this month is not", () => {
    expect(
      hero({ type: "Saving", balance: 2000 }, [
        { month: 10, year: 2026, value: 1000 },
        { month: 1, year: 2027, value: 2000 },
      ]).balance,
    ).toBe(1000);
    expect(
      hero({ type: "Saving", balance: 1500 }, [
        { month: 10, year: 2026, value: 1000 },
        { month: 11, year: 2026, value: 1100 },
      ]).balance,
    ).toBe(1500);
  });

  it("a row with no month or no year is never a future row and never dates the hero", () => {
    const result = hero({ type: "Saving", balance: 1500 }, [
      { month: 10, year: 2026, value: 1000 },
      { month: 0, year: 2027, value: 5 },
      { month: 12, year: 0, value: 6 },
    ]);
    expect(result.balance).toBe(1500);
    expect(result.month).toEqual({ month: 10, year: 2026, source: undefined });
    expect(result.earliest).toBeNull();
  });

  it("a later month number in an earlier year is not a future row", () => {
    // December 2025 is before November 2026: the hero keeps the saved 1,500.
    expect(
      hero({ type: "Saving", balance: 1500 }, [{ month: 12, year: 2025, value: 900 }]).balance,
    ).toBe(1500);
  });

  it("after a future-month row a row for the current month is the latest up to now", () => {
    // November 2026 (the current month) 1,100 is the latest up to now; December is future.
    const result = hero({ type: "Saving", balance: 1200 }, [
      { month: 10, year: 2026, value: 1000 },
      { month: 11, year: 2026, value: 1100 },
      { month: 12, year: 2026, value: 1200 },
    ]);
    expect(result.balance).toBe(1100);
    expect(result.month).toEqual({ month: 11, year: 2026, source: undefined });
  });

  it("after a future-month row, a latest month with no value keeps the shown balance", () => {
    expect(
      hero({ type: "Saving", balance: 2000 }, [
        { month: 10, year: 2026, value: null },
        { month: 12, year: 2026, value: 2000 },
      ]).balance,
    ).toBe(2000);
  });

  it("with only a future row keeps the shown balance and has no month", () => {
    expect(
      hero({ type: "Saving", balance: 2000 }, [{ month: 12, year: 2026, value: 2000 }]),
    ).toEqual({
      balance: 2000,
      month: null,
      earliest: null,
    });
  });

  it("after a future-month row a joint account shows its share of the latest month", () => {
    // October's whole 1,000 x 50% = 500, the same share the hero shows without a future row.
    expect(
      hero(
        {
          type: "Saving",
          name: "Joint saver",
          balance: 1200,
          ownership: "joint",
          sharePercent: 50,
        },
        [
          { month: 10, year: 2026, value: 1000 },
          { month: 12, year: 2026, value: 1200 },
        ],
      ).balance,
    ).toBe(500);
  });

  it("gives the earliest month up to now as shown, when it is not the latest", () => {
    // January 2026 -10,000 is shown as 10,000 owed; the latest is October 2026.
    expect(
      hero({ type: "Loan", balance: -9000 }, [
        { month: 10, year: 2026, value: -9500 },
        { month: 1, year: 2026, value: "-10000" },
        { month: 12, year: 2026, value: -1 },
      ]).earliest,
    ).toEqual({ value: 10000, month: 1, year: 2026 });
  });

  it("orders the earliest month by year before month", () => {
    // December 2025 is before January 2026.
    expect(
      hero({ type: "Saving", balance: 1 }, [
        { month: 1, year: 2026, value: 20 },
        { month: 12, year: 2025, value: 10 },
      ]).earliest,
    ).toEqual({ value: 10, month: 12, year: 2025 });
  });

  it("has no earliest month when it is the same month as the latest, or has no value", () => {
    expect(
      hero({ type: "Saving", balance: 1 }, [
        { month: 10, year: 2026, value: 5 },
        { month: 10, year: 2026, value: 6 },
      ]).earliest,
    ).toBeNull();
    // Same month number in another year is a different month.
    expect(
      hero({ type: "Saving", balance: 1 }, [
        { month: 10, year: 2025, value: 5 },
        { month: 10, year: 2026, value: 6 },
      ]).earliest,
    ).toEqual({ value: 5, month: 10, year: 2025 });
    expect(
      hero({ type: "Saving", balance: 1 }, [
        { month: 9, year: 2026 },
        { month: 10, year: 2026, value: 6 },
      ]).earliest,
    ).toBeNull();
  });
});

describe("selectAccountBalanceSeries", () => {
  it("ends on this month's saved balance, carried, when this month is not recorded", () => {
    // September 181,000 and October 180,500 owed, then November's saved 180,000. December is
    // future and left out.
    expect(
      selectAccountBalanceSeries(
        { type: "Mortgage", balance: -180000 },
        [
          { month: 10, year: 2026, value: -180500, source: "calculated" },
          { month: 9, year: 2026, value: -181000 },
          { month: 12, year: 2026, value: -179000 },
        ],
        NOV,
      ),
    ).toEqual([
      { month: 9, year: 2026, value: 181000, source: undefined },
      { month: 10, year: 2026, value: 180500, source: "calculated" },
      { month: 11, year: 2026, value: 180000, carried: true },
    ]);
  });

  it("adds no saved point when this month is recorded", () => {
    expect(
      selectAccountBalanceSeries(
        { type: "Saving", balance: "150" },
        [
          { month: 11, year: 2026, value: "120" },
          { month: 10, year: 2026, value: 100 },
        ],
        NOV,
      ),
    ).toEqual([
      { month: 10, year: 2026, value: 100, source: undefined },
      { month: 11, year: 2026, value: 120, source: undefined },
    ]);
  });

  it("orders by year before month and leaves out next year's January", () => {
    const points = selectAccountBalanceSeries(
      { type: "Saving", balance: null },
      [
        { month: 1, year: 2026, value: 2 },
        { month: 12, year: 2025, value: 1 },
        { month: 1, year: 2027, value: 3 },
      ],
      NOV,
    );
    expect(points.map((p) => p.value)).toEqual([1, 2]);
  });

  it("adds no saved point with no saved balance, or with no recorded months", () => {
    const one = [{ month: 10, year: 2026, value: 100 }];
    expect(selectAccountBalanceSeries({ type: "Saving" }, one, NOV)).toHaveLength(1);
    expect(selectAccountBalanceSeries({ type: "Saving", balance: null }, one, NOV)).toHaveLength(1);
    expect(selectAccountBalanceSeries({ type: "Saving", balance: 500 }, [], NOV)).toEqual([]);
  });

  it("the same month in an earlier year is not this month", () => {
    // November 2025 is recorded, November 2026 is not: the saved 150 ends the line.
    expect(
      selectAccountBalanceSeries(
        { type: "Saving", balance: 150 },
        [{ month: 11, year: 2025, value: 100 }],
        NOV,
      ).map((p) => [p.month, p.year, p.value, p.carried ?? false]),
    ).toEqual([
      [11, 2025, 100, false],
      [11, 2026, 150, true],
    ]);
  });

  it("draws a joint account's whole balances, not the share", () => {
    expect(
      selectAccountBalanceSeries(
        { type: "Current", balance: 1000 },
        [{ month: 10, year: 2026, value: 900 }],
        NOV,
      ).map((p) => p.value),
    ).toEqual([900, 1000]);
  });
});

describe("selectSeriesChange", () => {
  const points = (...values: number[]) => values.map((value) => ({ value }));

  it.each([
    // 1,250.60 - 1,000.40 = 250.20, whole pounds 250.
    [[1000.4, 7, 1250.6], 250],
    [[1250.6, 1000.4], -250],
    // 0.40 rounds to 0; 0.50 rounds up to 1; -1.60 rounds to -2.
    [[1000, 1000.4], 0],
    [[1000, 1000.5], 1],
    [[1000, 998.4], -2],
  ])("first to last of %j is %d", (values, expected) => {
    expect(selectSeriesChange(points(...values))).toBe(expected);
  });

  it("is 0, not -0, when the change rounds to nothing from below", () => {
    // 999.50 - 1,000 = -0.50, which Math.round makes -0.
    expect(Object.is(selectSeriesChange(points(1000, 999.5)), 0)).toBe(true);
  });

  it("is null without two points", () => {
    expect(selectSeriesChange([])).toBeNull();
    expect(selectSeriesChange(points(1000))).toBeNull();
  });
});

describe("selectAccountChangeEffect", () => {
  it("is the change for what you own and the change reversed for a debt", () => {
    expect(selectAccountChangeEffect(550, false)).toBe(550);
    // A debt that fell by 500 (change -500) raised net worth by 500.
    expect(selectAccountChangeEffect(-500, true)).toBe(500);
    expect(selectAccountChangeEffect(150, true)).toBe(-150);
  });

  it("an unchanged debt is 0, not -0", () => {
    expect(Object.is(selectAccountChangeEffect(0, true), 0)).toBe(true);
  });
});

describe("isLeftOutOfNetWorth", () => {
  it("leaves each type out only under its own choice", () => {
    expect(isLeftOutOfNetWorth("Property", ["property"])).toBe(true);
    expect(isLeftOutOfNetWorth("Property", ["mortgage", "studentLoan"])).toBe(false);
    expect(isLeftOutOfNetWorth("Mortgage", ["mortgage"])).toBe(true);
    expect(isLeftOutOfNetWorth("Mortgage", ["property", "studentLoan"])).toBe(false);
    expect(isLeftOutOfNetWorth("Student Loan", ["studentLoan"])).toBe(true);
    expect(isLeftOutOfNetWorth("Student Loan", ["property", "mortgage"])).toBe(false);
    expect(isLeftOutOfNetWorth("Saving", ["property", "mortgage", "studentLoan"])).toBe(false);
  });
});

describe("selectAccountGroups", () => {
  const r = (id: string, type: string | null, balance?: number | null) => ({ id, type, balance });

  it("splits rows into own, owe and not counted, each in type order", () => {
    const groups = selectAccountGroups(
      [
        r("h1", "Property", 250000),
        r("k1", "Credit Card", 1200),
        r("c1", "Current", 5000),
        r("m1", "Mortgage", 180000),
        r("s1", "Student Loan", 20000),
        r("x1", "Crypto", 10),
        r("v1", "Saving", 300),
      ],
      ["studentLoan"],
    );
    expect(groups.own.map((g) => g.id)).toEqual(["c1", "v1", "h1", "x1"]);
    expect(groups.owe.map((g) => g.id)).toEqual(["m1", "k1"]);
    expect(groups.notCounted.map((g) => g.id)).toEqual(["s1"]);
  });

  it("moves an overdrawn account under what you owe as the positive amount owed", () => {
    // Starling is a current account at -400: 400 owed, first by type.
    const groups = selectAccountGroups(
      [r("m1", "Mortgage", 180000), r("c2", "Current", -400), r("c1", "Current", 0)],
      [],
    );
    expect(groups.owe).toEqual([r("c2", "Current", 400), r("m1", "Mortgage", 180000)]);
    // At 0 an account is not overdrawn.
    expect(groups.own).toEqual([r("c1", "Current", 0)]);
  });

  it("keeps an account with no balance under what you own", () => {
    const groups = selectAccountGroups([r("c1", "Current"), r("c2", "Current", null)], []);
    expect(groups.own.map((g) => g.id)).toEqual(["c1", "c2"]);
    expect(groups.owe).toEqual([]);
  });

  it("leaves left-out rows out of own and owe, overdrawn or not", () => {
    const groups = selectAccountGroups(
      [r("h1", "Property", -5), r("m1", "Mortgage", 1)],
      ["property", "mortgage"],
    );
    expect(groups.own).toEqual([]);
    expect(groups.owe).toEqual([]);
    expect(groups.notCounted.map((g) => g.id)).toEqual(["h1", "m1"]);
  });

  it("keeps rows of one type in the order given, and sorts unknown or missing types last", () => {
    const groups = selectAccountGroups(
      [r("u1", null, 1), r("b", "Saving", 1), r("a", "Saving", 2), r("p", "Pension", 3)],
      [],
    );
    expect(groups.own.map((g) => g.id)).toEqual(["b", "a", "p", "u1"]);
  });

  it("never moves a debt row, whatever its balance's sign", () => {
    // Rows carry shown balances, so a debt is not overdrawn even if its figure is negative.
    const groups = selectAccountGroups([r("l1", "Loan", -5)], []);
    expect(groups.owe).toEqual([r("l1", "Loan", -5)]);
  });

  it("orders the not counted group by type too", () => {
    const groups = selectAccountGroups(
      [r("s1", "Student Loan", 1), r("m1", "Mortgage", 2), r("h1", "Property", 3)],
      ["property", "mortgage", "studentLoan"],
    );
    expect(groups.notCounted.map((g) => g.id)).toEqual(["h1", "m1", "s1"]);
  });

  it("orders the stored types as the accounts list does", () => {
    expect(ACCOUNT_TYPE_ORDER).toEqual([
      "Current",
      "Saving",
      "Investment",
      "Pension",
      "Property",
      "Owed",
      "Mortgage",
      "Credit Card",
      "Loan",
      "Overdraft",
      "Student Loan",
    ]);
  });
});
