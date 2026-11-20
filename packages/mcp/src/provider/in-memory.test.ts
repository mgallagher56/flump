import type { BuildContextPackInput } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { emptyUser } from "../testing/personas.js";
import {
  inMemoryPictureSource,
  inMemoryQueries,
  monthLabel,
  parseMonth,
  withFinancialPicture,
} from "./in-memory.js";

const data = (extra: Record<string, unknown>) =>
  ({ ...emptyUser, ...extra }) as unknown as BuildContextPackInput;
const queriesOver = (input: BuildContextPackInput) => inMemoryQueries(async () => input);

describe("parseMonth", () => {
  it("reads YYYY-MM back as the same month", () => {
    // monthLabel turns an index back into "YYYY-MM"; a parsed month must name the same month.
    for (const value of ["2026-03", "2026-01", "2026-12", "1999-07"]) {
      expect(monthLabel(parseMonth(value) as number)).toBe(value);
    }
  });

  it("orders months by calendar, one step per month, across a year end", () => {
    const at = (value: string) => parseMonth(value) as number;
    // Calendar order: June 2025 < January 2026 < March 2026.
    expect(at("2025-06")).toBeLessThan(at("2026-01"));
    expect(at("2026-01")).toBeLessThan(at("2026-03"));
    // Consecutive months are one step apart, December 2026 to January 2027 included.
    expect(at("2026-04") - at("2026-03")).toBe(1);
    expect(at("2027-01") - at("2026-12")).toBe(1);
    // A year is twelve steps: March 2025 to March 2026.
    expect(at("2026-03") - at("2025-03")).toBe(12);
  });

  it("selects saved rows by month in a snapshot range, carrying the latest earlier one", async () => {
    // Rows in Nov 2025, Dec 2025, Jan 2026 and Feb 2026; the range is Dec 2025 to Jan 2026.
    // Dec and Jan fall inside; Nov is the latest row before the range (the seed); Feb is after.
    const rows = [
      { accountId: "a", year: 2025, month: 11, value: 1 },
      { accountId: "a", year: 2025, month: 12, value: 2 },
      { accountId: "a", year: 2026, month: 1, value: 3 },
      { accountId: "a", year: 2026, month: 2, value: 4 },
    ];
    const q = queriesOver(
      data({
        accounts: [{ id: "a", name: "A", type: "Current", balance: 1 }],
        accountDetails: rows,
      }),
    );
    const got = await q.getAccountSnapshots("u", { from: "2025-12", to: "2026-01" });
    expect(got.map((r) => r.value)).toEqual([1, 2, 3]);
  });

  it("refuses anything around or after the month", () => {
    for (const value of ["x2026-03", "2026-03x", "2026-03-01", "2026-13", "2026-00"]) {
      expect(parseMonth(value)).toBeNull();
    }
  });
});

describe("inMemoryPictureSource", () => {
  it("returns the stored rows, and empty lists when a kind is missing", async () => {
    const accounts = [{ id: "a1", name: "A", type: "Current", balance: 1 }];
    const accountDetails = [{ accountId: "a1", year: 2026, month: 1, value: 1 }];
    const budgetEntries = [{ id: "b1", name: "Rent", amount: 900 }];
    const full = inMemoryPictureSource(data({ accounts, accountDetails, budgetEntries }));
    expect(await full.accounts()).toEqual(accounts);
    expect(await full.accountDetails()).toEqual(accountDetails);
    expect(await full.budgetEntries()).toEqual(budgetEntries);
    const empty = inMemoryPictureSource(emptyUser);
    expect(await empty.accounts()).toEqual([]);
    expect(await empty.accountDetails()).toEqual([]);
    expect(await empty.budgetEntries()).toEqual([]);
  });
});

describe("withFinancialPicture", () => {
  it("builds the picture as of the date given", async () => {
    const input = data({
      accounts: [
        {
          id: "m1",
          name: "Mortgage",
          type: "Mortgage",
          balance: -150_000,
          fixedRateEndDate: "2030-06-15",
        },
      ],
    });
    const { picture } = await withFinancialPicture(input, new Date("2026-06-15T12:00:00Z"));
    // From 15 June 2026 to 15 June 2030 is exactly 4 years: 48 months, not yet ended.
    expect(picture.fixedRateEnds).toEqual([
      { accountId: "m1", date: "2030-06-15", monthsRemaining: 48, ended: false },
    ]);
  });
});

describe("inMemoryQueries.getAccounts", () => {
  it("returns an empty list when there are no accounts", async () => {
    expect(await queriesOver(emptyUser).getAccounts("u")).toEqual([]);
  });
});

describe("inMemoryQueries.getAccountSnapshots", () => {
  const accounts = [
    { id: "a", name: "A", type: "Current", balance: 1 },
    { id: "b", name: "B", type: "Current", balance: 1 },
  ];

  it("refuses an unreadable range with no rows", async () => {
    // A row before the range too, which a half-read range must not carry forward either.
    const q = queriesOver(
      data({
        accounts,
        accountDetails: [
          { accountId: "a", year: 2025, month: 6, value: 1 },
          { accountId: "a", year: 2026, month: 1, value: 1 },
        ],
      }),
    );
    expect(await q.getAccountSnapshots("u", { from: "bad", to: "2026-12" })).toEqual([]);
    expect(await q.getAccountSnapshots("u", { from: "2026-01", to: "bad" })).toEqual([]);
  });

  it("drops rows for accounts the user does not own and rows with an impossible date or value", async () => {
    const q = queriesOver(
      data({
        accounts,
        accountDetails: [
          { accountId: "a", year: 2026, month: 2, value: 10 },
          { accountId: "zzz", year: 2026, month: 2, value: 99 },
          { accountId: "a", year: "abc", month: 2, value: 99 },
          { accountId: "a", year: 2026.5, month: 2, value: 99 },
          { accountId: "a", year: 2026, month: 2.5, value: 99 },
          { accountId: "a", year: 2026, month: 0, value: 99 },
          { accountId: "a", year: 2026, month: 13, value: 99 },
          { accountId: "a", year: 2026, month: 3, value: "abc" },
        ],
      }),
    );
    // The range runs into 2027 so a month-13 row, if it were kept, would land inside it.
    const rows = await q.getAccountSnapshots("u", { from: "2026-01", to: "2027-12" });
    expect(rows).toEqual([{ accountId: "a", year: 2026, month: 2, value: 10, source: "manual" }]);
  });

  it("keeps the stored source and reads the snake_case account id", async () => {
    const q = queriesOver(
      data({
        accounts,
        accountDetails: [{ account_id: "b", year: 2026, month: 4, value: 5, source: "connected" }],
      }),
    );
    expect(await q.getAccountSnapshots("u", { from: "2026-01", to: "2026-12" })).toEqual([
      { accountId: "b", year: 2026, month: 4, value: 5, source: "connected" },
    ]);
  });

  it("carries forward each account's latest row before the range, however the rows were stored", async () => {
    // Account a has rows in January and March (stored newest first), then June. For a range
    // of May to December the carried row is March, the latest before May, and June is in range.
    const q = queriesOver(
      data({
        accounts,
        accountDetails: [
          { accountId: "b", year: 2026, month: 7, value: 70 },
          { accountId: "a", year: 2026, month: 6, value: 60 },
          { accountId: "a", year: 2026, month: 3, value: 30 },
          { accountId: "a", year: 2026, month: 1, value: 10 },
        ],
      }),
    );
    const rows = await q.getAccountSnapshots("u", { from: "2026-05", to: "2026-12" });
    expect(rows.map((r) => [r.accountId, r.month])).toEqual([
      ["a", 3],
      ["a", 6],
      ["b", 7],
    ]);
  });
});

describe("inMemoryQueries.getDataCoverage", () => {
  it("is empty when there are no rows", async () => {
    expect(await queriesOver(emptyUser).getDataCoverage("u")).toEqual([]);
  });

  it("reports first and last month, the count, the gaps and the sources", async () => {
    const q = queriesOver(
      data({
        accounts: [{ id: "a", name: "A", type: "Current", balance: 1 }],
        accountDetails: [
          { accountId: "a", year: 2026, month: 5, value: 1, source: "manual" },
          { accountId: "a", year: 2026, month: 1, value: 1, source: "onboarding" },
          { accountId: "a", year: 2026, month: 2, value: 1, source: "manual" },
        ],
      }),
    );
    // Months 1, 2 and 5 are recorded: 3 months, with March and April missing.
    expect(await q.getDataCoverage("u")).toEqual([
      {
        accountId: "a",
        firstMonth: "2026-01",
        lastMonth: "2026-05",
        recordedMonths: 3,
        gaps: [{ from: "2026-03", to: "2026-04" }],
        sources: ["manual", "onboarding"],
      },
    ]);
  });
});

describe("inMemoryQueries.getTaxRecords", () => {
  const record = (id: string, extra: Record<string, unknown>) => ({
    id,
    type: "income",
    source: "rental",
    category: "rental_income",
    name: "",
    amount: 100,
    frequency: "one-off",
    endDate: null,
    ...extra,
  });
  const range = { fromDate: "2026-04-06", toDate: "2027-04-05" };
  const ids = async (taxRecords: unknown[]) =>
    (await queriesOver(data({ taxRecords })).getTaxRecords("u", range)).map((r) => r.id);

  it("keeps one-off records dated on either end of the range, inclusive", async () => {
    expect(
      await ids([
        record("first-day", { date: "2026-04-06" }),
        record("last-day", { date: "2027-04-05" }),
        record("before", { date: "2026-04-05" }),
        record("after", { date: "2027-04-06" }),
      ]),
    ).toEqual(["first-day", "last-day"]);
  });

  it("compares the date part only, so a timestamp on the last day still counts", async () => {
    expect(await ids([record("stamped", { date: "2027-04-05T00:00:00Z" })])).toEqual(["stamped"]);
  });

  it("keeps monthly records that have not ended before the range starts", async () => {
    expect(
      await ids([
        record("open", { frequency: "monthly", date: "2025-01-01", endDate: null }),
        record("ends-on-first-day", {
          frequency: "monthly",
          date: "2025-01-01",
          endDate: "2026-04-06",
        }),
        record("ended-before", {
          frequency: "monthly",
          date: "2025-01-01",
          endDate: "2026-04-05",
        }),
        record("starts-after", { frequency: "monthly", date: "2027-04-06", endDate: null }),
      ]),
    ).toEqual(["open", "ends-on-first-day"]);
  });
});
