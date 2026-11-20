import { describe, expect, it, vi } from "vitest";
import { FinancialPictureService, wireProfile } from "./financial-picture.service";

function build() {
  const budgetFind = vi.fn(async () => [
    {
      id: "b1",
      userId: "u1",
      category: "income",
      name: "Pay",
      amount: "2500",
      frequency: "monthly",
      isIncome: true,
      isEssential: false,
      notes: "kept for the pack",
    },
    {
      id: "b2",
      userId: "u1",
      category: "housing",
      name: "Rent",
      amount: "900",
      frequency: "monthly",
      isIncome: false,
      isEssential: true,
    },
  ]);
  const taxFind = vi.fn(async () => []);
  const getAccounts = vi.fn(async () => [
    { id: "a1", name: "Current", type: "Current", balance: 6000 },
  ]);
  const getAccountDetails = vi.fn(async () => []);
  const getProfile = vi.fn(async () => ({ annualSalary: 30000, pensionPercent: 5 }));
  const service = new FinancialPictureService(
    { find: budgetFind } as never,
    { find: taxFind } as never,
    { getAccounts, getAccountDetails } as never,
    { getProfile } as never,
  );
  return { service, budgetFind, taxFind, getAccounts, getAccountDetails, getProfile };
}

describe("FinancialPictureService.load", () => {
  it("reads every kind of row for the given user only", async () => {
    const m = build();
    await m.service.load("u1");
    expect(m.getProfile).toHaveBeenCalledWith("u1");
    expect(m.getAccounts).toHaveBeenCalledWith("u1");
    expect(m.getAccountDetails).toHaveBeenCalledWith("u1");
    expect(m.budgetFind).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
    expect(m.taxFind).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
    for (const fn of [m.getProfile, m.getAccounts, m.getAccountDetails, m.budgetFind, m.taxFind]) {
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });

  it("selects tax-record columns explicitly, never a receipt column", async () => {
    const m = build();
    await m.service.load("u1");
    const opts = (m.taxFind.mock.calls[0] as unknown as [{ select: Record<string, boolean> }])[0];
    expect(opts.select.id).toBe(true);
    expect(opts.select.amount).toBe(true);
    expect(Object.keys(opts.select).filter((c) => c.toLowerCase().includes("receipt"))).toEqual([]);
  });

  it("builds the picture from those rows, as of the given date", async () => {
    const m = build();
    const asOf = new Date("2026-11-15T12:00:00Z");
    const loaded = await m.service.load("u1", { asOf });
    // Left over 2,500 - 900 = 1,600. Breathing room 6,000 / 900 = 6.666..., shown as 6.7.
    // Pension 30,000 x 5 / 100 / 12 = 125.
    expect(loaded.picture.budget).toMatchObject({ status: "known", value: { surplus: 1600 } });
    expect(loaded.picture.monthsOfCover).toMatchObject({ status: "known", value: { months: 6.7 } });
    expect(loaded.picture.pensionContributionMonthly).toBe(125);
    expect(loaded.asOf).toBe(asOf);
    expect(loaded.taxYear).toBe("2026/27");
    // The budget rows come back whole, so the context pack can keep notes.
    expect(loaded.rows.budgetEntries[0]?.notes).toBe("kept for the pack");
  });
});

describe("wireProfile", () => {
  it("gives the profile's dates as ISO strings, keeps a string as it is, and drops anything else", () => {
    const wired = wireProfile({
      createdAt: new Date("2026-01-02T03:04:05.000Z"),
      updatedAt: "2026-02-03T04:05:06.000Z",
    } as never);
    expect(wired.createdAt).toBe("2026-01-02T03:04:05.000Z");
    expect(wired.updatedAt).toBe("2026-02-03T04:05:06.000Z");

    // Neither null nor a bare number is a date the engine reads, so both become undefined.
    const blank = wireProfile({ createdAt: null, updatedAt: 1_767_225_600_000 } as never);
    expect(blank.createdAt).toBeUndefined();
    expect(blank.updatedAt).toBeUndefined();
  });
});
