import type { BuildContextPackInput } from "@flump/finance-engine";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { shortId, shortIdKey } from "../../short-ids.js";
import { connectTestClient, TEST_TOKEN, type TestHarness } from "../../testing/client.js";
import { emptyUser } from "../../testing/personas.js";

type Point = {
  period: string;
  value: number | null;
  carriedForward: boolean;
  source: string;
  balance?: number;
  partial?: true;
};
type Series = {
  key: string;
  label: string;
  category?: string;
  isLiability: boolean;
  points: Point[];
};
type Env = {
  result: {
    series: Series[];
    seriesCount: number;
    page: number;
    totalPages: number;
    notes: string[];
  };
  missing: Array<{ field: string; why: string; askUser: string }>;
  provenance: Record<string, string>;
};

const ID = {
  current: "33333333-aaaa-4aaa-8aaa-000000000001",
  saver: "33333333-aaaa-4aaa-8aaa-000000000002",
  card: "33333333-aaaa-4aaa-8aaa-000000000003",
};
const acc = (uuid: string) => shortId(shortIdKey(TEST_TOKEN), "acc", uuid);

const row = (accountId: string, year: number, month: number, value: number, source = "manual") => ({
  accountId,
  year,
  month,
  value,
  source,
});

/**
 * A current account with no history, a saver recorded in January, June (manual) and November
 * 2024 (connected), and a card first recorded in June 2024.
 */
const persona: BuildContextPackInput = {
  ...emptyUser,
  accounts: [
    { id: ID.current, name: "Current", type: "Current", balance: 100 },
    { id: ID.saver, name: "Saver", type: "Saving", balance: 5000 },
    { id: ID.card, name: "Card", type: "Credit Card", balance: 300 },
  ],
  accountDetails: [
    row(ID.saver, 2024, 1, 1000),
    row(ID.saver, 2024, 6, 1600),
    row(ID.saver, 2024, 11, 2100, "connected"),
    row(ID.card, 2024, 6, 500),
  ],
};

const PROPERTY_NOTE = /^Property values and mortgage balances are not counted/;
const STUDENT_NOTE = /^Student loans are not counted/;

describe("get_balance_history: periods and limits", () => {
  let h: TestHarness;
  beforeAll(async () => {
    h = await connectTestClient(emptyUser);
  });
  afterAll(async () => h.close());

  const accepted = async (args: Record<string, unknown>) => {
    const res = await h.client.callTool({ name: "get_balance_history", arguments: args });
    return !res.isError;
  };
  const rejectedField = async (args: Record<string, unknown>) => {
    const res = await h.client.callTool({ name: "get_balance_history", arguments: args });
    expect(res.isError).toBe(true);
    return JSON.parse((res.content as Array<{ text: string }>)[0]?.text ?? "{}").error?.field;
  };

  it("allows 120 months and refuses 121", async () => {
    // 2016-01 to 2025-12 is 10 x 12 = 120 months; one more month makes 121.
    expect(await accepted({ from: "2016-01", to: "2025-12" })).toBe(true);
    expect(await rejectedField({ from: "2016-01", to: "2026-01" })).toBe("interval");
  });

  it("allows 120 quarters and refuses 121", async () => {
    // 1996-01 to 2025-12 is 30 years x 4 = 120 quarters; starting at 1995-10 adds Q4 1995: 121.
    expect(await accepted({ from: "1996-01", to: "2025-12", interval: "quarter" })).toBe(true);
    expect(await rejectedField({ from: "1995-10", to: "2025-12", interval: "quarter" })).toBe(
      "interval",
    );
  });

  it("counts years by calendar year: 36 years are fine though they hold 144 quarters", async () => {
    // 1990 to 2025 is 36 years (144 quarters, 432 months): under the limit only when counted in years.
    expect(await accepted({ from: "1990-01", to: "2025-12", interval: "year" })).toBe(true);
    // 1900 to 2020 is 121 years.
    expect(await rejectedField({ from: "1900-01", to: "2020-12", interval: "year" })).toBe(
      "interval",
    );
  });
});

describe("get_balance_history: values, sources and groups", () => {
  let h: TestHarness;
  beforeAll(async () => {
    h = await connectTestClient(persona);
  });
  afterAll(async () => h.close());
  const call = async (args: Record<string, unknown>) =>
    (await h.callJson("get_balance_history", args)) as Env;

  it("a carried-forward month keeps the source of the last recorded month", async () => {
    const e = await call({ from: "2024-11", to: "2024-12", accountIds: [acc(ID.saver)] });
    expect(e.result.series[0]?.points).toEqual([
      { period: "2024-11", value: 2100, carriedForward: false, source: "connected" },
      { period: "2024-12", value: 2100, carriedForward: true, source: "connected" },
    ]);
  });

  it("shows no point for an account before its first recorded month", async () => {
    const e = await call({ from: "2024-04", to: "2024-06", groupBy: "account" });
    const card = e.result.series.find((s) => s.key === acc(ID.card));
    // The card is first recorded in June 2024, so April and May have no point.
    expect(card?.points.map((p) => [p.period, p.value])).toEqual([["2024-06", 500]]);
    expect(card).toMatchObject({ category: "debt", isLiability: true });
    const saver = e.result.series.find((s) => s.key === acc(ID.saver));
    expect(saver).toMatchObject({ category: "savings", isLiability: false });
  });

  it("names one source when every value shares it, and mixed when they differ", async () => {
    const june = await call({ from: "2024-06", to: "2024-06" });
    // Saver 1,600 owned minus card 500 owed = 1,100, both recorded by hand.
    expect(june.result.series[0]?.points[0]).toMatchObject({ value: 1100, source: "manual" });
    const nov = await call({ from: "2024-11", to: "2024-11" });
    // The saver is connected in November; the card carries its manual June value.
    expect(nov.result.series[0]?.points[0]).toMatchObject({ value: 1600, source: "mixed" });
  });

  it("the net worth total is keyed total, labelled Net worth and is not a liability", async () => {
    const e = await call({ from: "2024-06", to: "2024-06" });
    expect(e.result.series).toHaveLength(1);
    expect(e.result.series[0]).toMatchObject({
      key: "total",
      label: "Net worth",
      isLiability: false,
    });
    expect(e.provenance).toMatchObject({ series: "account_history" });
  });

  it("a whole calendar year is not partial; a clipped quarter is", async () => {
    const year = await call({
      from: "2024-01",
      to: "2024-12",
      interval: "year",
      accountIds: [acc(ID.saver)],
    });
    // December 2024 carries November's 2,100 forward.
    expect(year.result.series[0]?.points).toEqual([
      { period: "2024", value: 2100, carriedForward: true, source: "connected" },
    ]);
    const quarter = await call({
      from: "2024-02",
      to: "2024-03",
      interval: "quarter",
      accountIds: [acc(ID.saver)],
    });
    // Q1 2024 starts in January, so a range from February cuts it short; March carries 1,000.
    expect(quarter.result.series[0]?.points).toEqual([
      { period: "2024-Q1", value: 1000, carriedForward: true, source: "manual", partial: true },
    ]);
  });

  it("a concise delta has no balance; a detailed one has the balance at the period end", async () => {
    const args = { from: "2024-06", to: "2024-06", metric: "delta", accountIds: [acc(ID.saver)] };
    // May carries January's 1,000; June records 1,600: change 1,600 - 1,000 = 600.
    const concise = await call(args);
    expect(concise.result.series[0]?.points[0]).toEqual({
      period: "2024-06",
      value: 600,
      carriedForward: false,
      source: "manual",
    });
    const detailed = await call({ ...args, responseFormat: "detailed" });
    expect(detailed.result.series[0]?.points[0]).toMatchObject({ value: 600, balance: 1600 });
  });

  it("groups by category only for categories that have data", async () => {
    const e = await call({ from: "2024-06", to: "2024-06", groupBy: "category" });
    // The current account has no rows, so cash has no series.
    expect(e.result.series.map((s) => s.key)).toEqual(["savings", "debt"]);
    expect(e.result.seriesCount).toBe(2);
  });

  it("lists accounts with no history among the selected ones as left out", async () => {
    const e = await call({ from: "2024-06", to: "2024-06" });
    // Three accounts selected; the current account has no row on or before June: 1 of 3.
    expect(e.missing).toHaveLength(1);
    expect(e.missing[0]?.field).toBe("accountHistory.accounts");
    expect(e.missing[0]?.why).toContain("1 of 3");
    expect(e.missing[0]?.askUser.length).toBeGreaterThan(0);
  });

  it("asks for nothing when every selected account has history, or nothing is selected", async () => {
    const both = await call({
      from: "2024-06",
      to: "2024-06",
      accountIds: [acc(ID.saver), acc(ID.card)],
    });
    expect(both.missing).toEqual([]);
    const none = await call({ from: "2024-06", to: "2024-06", category: "pensions" });
    expect(none.result.series).toEqual([]);
    expect(none.missing).toEqual([]);
  });

  it("does not ask the provider for rows when no account is selected", async () => {
    const spy = vi.spyOn(h.provider, "getAccountSnapshots");
    try {
      await call({ from: "2024-06", to: "2024-06", category: "pensions" });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("adds the total note only for the total grouping", async () => {
    const total = await call({ from: "2024-06", to: "2024-06" });
    const perAccount = await call({ from: "2024-06", to: "2024-06", groupBy: "account" });
    // Four notes always; the total adds one about what the total is.
    expect(perAccount.result.notes).toHaveLength(4);
    expect(total.result.notes).toHaveLength(5);
    expect(total.result.notes.filter((n) => /^The total is/.test(n))).toHaveLength(1);
    for (const n of total.result.notes) expect(n.length).toBeGreaterThan(0);
    // No student loan and the default basis: neither basis note appears.
    expect(total.result.notes.some((n) => STUDENT_NOTE.test(n) || PROPERTY_NOTE.test(n))).toBe(
      false,
    );
  });
});

describe("get_balance_history: missing history and current month", () => {
  // The clock is pinned to 15 November 2026 (noon UTC, also 15 November in the UK).
  beforeEach(() =>
    vi.useFakeTimers({ now: new Date("2026-11-15T12:00:00.000Z"), toFake: ["Date"] }),
  );
  afterEach(() => vi.useRealTimers());

  it("asks for history when no selected account has any", async () => {
    const h = await connectTestClient({
      ...emptyUser,
      accounts: [{ id: ID.current, name: "Current", type: "Current", balance: 100 }],
    });
    try {
      const e = (await h.callJson("get_balance_history", {
        from: "2024-01",
        to: "2024-02",
      })) as Env;
      expect(e.missing.map((m) => m.field)).toEqual(["accountHistory"]);
      expect(e.missing[0]?.why.length).toBeGreaterThan(0);
      expect(e.missing[0]?.askUser.length).toBeGreaterThan(0);
    } finally {
      await h.close();
    }
  });

  it("asks for nothing when the user has no accounts", async () => {
    const h = await connectTestClient(emptyUser);
    try {
      const e = (await h.callJson("get_balance_history", {
        from: "2024-01",
        to: "2024-02",
      })) as Env;
      expect(e.missing).toEqual([]);
    } finally {
      await h.close();
    }
  });

  it("a saved balance standing in for the current month of an unrecorded account reads as manual", async () => {
    // Pinned clock: the current month is 2026-11, so last month is October 2026.
    const now = "2026-11";
    const prev = { y: 2026, m: 10 };
    const h = await connectTestClient({
      ...emptyUser,
      accounts: [
        { id: ID.saver, name: "Saver", type: "Saving", balance: 750 },
        { id: ID.current, name: "Current", type: "Current", balance: 90 },
      ],
      // Only the current account has a row (connected, last month); the saver has none.
      accountDetails: [row(ID.current, prev.y, prev.m, 80, "connected")],
    });
    try {
      const e = (await h.callJson("get_balance_history", {
        from: now,
        to: now,
        groupBy: "account",
      })) as Env;
      const saver = e.result.series.find((s) => s.key === acc(ID.saver));
      expect(saver?.points[0]).toMatchObject({ value: 750, source: "manual" });
    } finally {
      await h.close();
    }
  });
});

describe("get_balance_history: pages", () => {
  it("page 2 holds the next accounts after page 1", async () => {
    const ids = [1, 2, 3, 4, 5].map((i) => `44444444-aaaa-4aaa-8aaa-00000000000${i}`);
    const h = await connectTestClient({
      ...emptyUser,
      accounts: ids.map((id) => ({ id, name: "S", type: "Saving", balance: 1 })),
      accountDetails: ids.map((id) => row(id, 2015, 12, 10)),
    });
    try {
      // 2016-01 to 2024-04 is 8 x 12 + 4 = 100 months. Concise pages hold 200 points, so
      // 200 / 100 = 2 accounts a page and 5 accounts make 3 pages.
      const e = (await h.callJson("get_balance_history", {
        from: "2016-01",
        to: "2024-04",
        groupBy: "account",
        page: 2,
      })) as Env;
      expect(e.result).toMatchObject({ page: 2, totalPages: 3, seriesCount: 5 });
      expect(e.result.series.map((s) => s.key)).toEqual([
        acc(ids[2] as string),
        acc(ids[3] as string),
      ]);
    } finally {
      await h.close();
    }
  });
});

describe("get_balance_history: notes on the user's choices", () => {
  const ACC = {
    house: { id: "h", name: "Home", type: "Property", balance: 300000 },
    mortgage: { id: "m", name: "Mortgage", type: "Mortgage", balance: 200000 },
    loan: { id: "l", name: "SLC", type: "Student Loan", balance: 20000 },
    saver: { id: "s", name: "Saver", type: "Saving", balance: 1000 },
  };
  const notesFor = async (
    accounts: Array<(typeof ACC)[keyof typeof ACC]>,
    netWorthBasis: { countProperty: boolean; countStudentLoan: boolean },
    groupBy = "total",
  ) => {
    const h = await connectTestClient({ ...emptyUser, accounts, netWorthBasis });
    try {
      const e = (await h.callJson("get_balance_history", {
        from: "2024-01",
        to: "2024-01",
        groupBy,
      })) as Env;
      return e.result.notes;
    } finally {
      await h.close();
    }
  };
  const has = (notes: string[], re: RegExp) => notes.some((n) => re.test(n));

  it("says student loans are left out only when the user has one and does not count them", async () => {
    expect(
      has(
        await notesFor([ACC.saver, ACC.loan], { countProperty: true, countStudentLoan: false }),
        STUDENT_NOTE,
      ),
    ).toBe(true);
    expect(
      has(
        await notesFor([ACC.saver, ACC.loan], { countProperty: true, countStudentLoan: true }),
        STUDENT_NOTE,
      ),
    ).toBe(false);
    expect(
      has(
        await notesFor([ACC.saver], { countProperty: true, countStudentLoan: false }),
        STUDENT_NOTE,
      ),
    ).toBe(false);
  });

  it("says the total leaves property out only for the total, when property is not counted and the user has some", async () => {
    const off = { countProperty: false, countStudentLoan: false };
    expect(has(await notesFor([ACC.house], off), PROPERTY_NOTE)).toBe(true);
    expect(has(await notesFor([ACC.mortgage], off), PROPERTY_NOTE)).toBe(true);
    expect(has(await notesFor([ACC.house], off, "account"), PROPERTY_NOTE)).toBe(false);
    expect(has(await notesFor([ACC.saver], off), PROPERTY_NOTE)).toBe(false);
    expect(
      has(
        await notesFor([ACC.house], { countProperty: true, countStudentLoan: false }),
        PROPERTY_NOTE,
      ),
    ).toBe(false);
  });
});
