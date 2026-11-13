import { beforeEach, describe, expect, it } from "vitest";
import {
  calculateRunwayStats,
  clearRunwaySettings,
  isLiquidAccountType,
  loadRunwaySettings,
  RUNWAY_STORAGE_KEY,
  saveRunwaySettings,
} from "./runwayStorage";

describe("runwayStorage utilities", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads, saves, and clears runway settings in localStorage", () => {
    expect(loadRunwaySettings()).toBeNull();

    const settings = {
      includedAccounts: { acc1: true, acc2: false },
      keptIncome: { inc1: true },
      keptExpenses: { exp1: true },
      severanceLump: 5000,
      extraMonthlyCut: 200,
    };

    saveRunwaySettings(settings);
    expect(loadRunwaySettings()).toEqual(settings);

    window.localStorage.setItem(RUNWAY_STORAGE_KEY, "null");
    expect(loadRunwaySettings()).toBeNull();

    window.localStorage.setItem(RUNWAY_STORAGE_KEY, "{bad_json");
    expect(loadRunwaySettings()).toBeNull();

    saveRunwaySettings(settings);
    clearRunwaySettings();
    expect(loadRunwaySettings()).toBeNull();
  });

  it("identifies liquid account types accurately", () => {
    expect(isLiquidAccountType(undefined)).toBe(false);
    expect(isLiquidAccountType("Current")).toBe(true);
    expect(isLiquidAccountType("Saving")).toBe(true);
    expect(isLiquidAccountType("Savings")).toBe(true);
    expect(isLiquidAccountType("Investment")).toBe(true);
    expect(isLiquidAccountType("Investments")).toBe(true);
    expect(isLiquidAccountType("Mortgage")).toBe(false);
  });

  it("calculates runway stats across multiple burn and horizon scenarios", () => {
    const accounts = [
      { id: "a1", type: "Current", balance: 6000 },
      { id: "a2", type: "Savings", balance: 12000 },
      { id: "a3", type: "Mortgage", balance: 200000 },
    ];
    const accountDetails = [
      { accountId: "a1", value: 6000, date: "2026-01-01" },
      { accountId: "a2", value: 12000, date: "2026-01-01" },
      { accountId: "a3", value: 200000, date: "2026-01-01" },
    ];

    // Standard burn (< 1 year)
    const resShort = calculateRunwayStats({
      accounts: [{ id: "a1", type: "Current", balance: 4000 }],
      accountDetails: [{ accountId: "a1", value: 4000, date: "2026-01-01" }],
      entries: [
        { id: "i1", isIncome: true, isPrimaryIncome: true, amount: 3000, frequency: "monthly" },
        {
          id: "e1",
          isIncome: false,
          isEssential: true,
          category: "housing",
          amount: 1000,
          frequency: "monthly",
        },
      ],
    });
    expect(resShort.pool).toBe(4000);
    expect(resShort.monthlyBurn).toBe(1000);
    expect(resShort.runwayMonths).toBe(4);
    expect(resShort.runwayLabel).toBe("4 months");
    expect(resShort.shortLabel).toBe("4 mos");

    // 1 year + months burn with savedSettings
    const resMid = calculateRunwayStats({
      accounts,
      accountDetails,
      entries: [
        { id: "i1", isIncome: true, isPrimaryIncome: false, amount: 3000, frequency: "monthly" },
        { id: "i2", isIncome: true, isPrimaryIncome: false, amount: 500, frequency: "monthly" },
        {
          id: "e1",
          isIncome: false,
          isEssential: true,
          category: "housing",
          amount: 1500,
          frequency: "monthly",
        },
        {
          id: "e2",
          isIncome: false,
          isEssential: false,
          category: "expenses",
          amount: 300,
          frequency: "monthly",
        },
      ],
      savedSettings: {
        includedAccounts: { a1: true, a2: true },
        keptIncome: { i2: true },
        keptExpenses: { e1: true, e2: true },
        severanceLump: 2000,
        extraMonthlyCut: 200,
      },
    });
    // pool = 18000 + 2000 = 20000; expenses = 1800, nonPrimary = 500, cut = 200 => burn = 1100 => 18.18 months (1 yr 6 mos)
    expect(resMid.pool).toBe(20000);
    expect(resMid.monthlyBurn).toBe(1100);
    expect(resMid.runwayLabel).toBe("1 year 6 months");
    expect(resMid.shortLabel).toBe("1 yr 6 mos");

    // Exact years (e.g. 24 months = 2 years)
    const resExactYears = calculateRunwayStats({
      accounts: [{ id: "a1", type: "Savings", balance: 24000 }],
      accountDetails: [{ accountId: "a1", value: 24000, date: "2026-01-01" }],
      entries: [
        {
          id: "e1",
          isIncome: false,
          isEssential: true,
          category: "housing",
          amount: 1000,
          frequency: "monthly",
        },
      ],
    });
    expect(resExactYears.runwayLabel).toBe("2 years");
    expect(resExactYears.shortLabel).toBe("2 yrs");

    // > 120 months (10+ years)
    const resLong = calculateRunwayStats({
      accounts: [{ id: "a1", type: "Savings", balance: 150000 }],
      accountDetails: [{ accountId: "a1", value: 150000, date: "2026-01-01" }],
      entries: [
        {
          id: "e1",
          isIncome: false,
          isEssential: true,
          category: "housing",
          amount: 1000,
          frequency: "monthly",
        },
      ],
    });
    expect(resLong.runwayLabel).toBe("12+ years");
    expect(resLong.shortLabel).toBe("12+ yrs");

    // Zero burn (infinite)
    const resZero = calculateRunwayStats({
      accounts,
      accountDetails,
      entries: [],
    });
    expect(resZero.monthlyBurn).toBe(0);
    expect(resZero.runwayMonths).toBeNull();
    expect(resZero.runwayLabel).toBe("Infinite (No burn)");
    expect(resZero.shortLabel).toBe("No burn");
  });

  it("clamps the pool at 0 so an overdrawn account never gives a negative runway", () => {
    const res = calculateRunwayStats({
      accounts: [{ id: "a1", type: "Current", balance: -800 }],
      entries: [
        { id: "i1", isIncome: true, isPrimaryIncome: true, amount: 3000, frequency: "monthly" },
        {
          id: "e1",
          isIncome: false,
          isEssential: true,
          category: "housing",
          amount: 1000,
          frequency: "monthly",
        },
      ],
    });
    expect(res.pool).toBe(0);
    expect(res.runwayMonths).toBe(0);
  });

  it("resolves an account without balance to 0: history is no longer a fallback", () => {
    const res = calculateRunwayStats({
      accounts: [{ id: "a1", type: "Current" }],
      accountDetails: [{ accountId: "a1", year: 2026, month: 1, value: 4000 }] as never,
      entries: [],
    });
    expect(res.pool).toBe(0);
  });
});
