import { getCurrentUKTaxYear } from "@flump/finance-engine";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { default as Index, loader } from "./_index";

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    redirect: actual.redirect,
    useNavigate: () => vi.fn(),
    useLoaderData: vi.fn(),
    Link: ({
      children,
      to,
      style,
      className,
    }: {
      children: ReactNode;
      to: string;
      style?: any;
      className?: string;
    }) => (
      <a className={className} href={to} style={style}>
        {children}
      </a>
    ),
  };
});

vi.mock("~/utils/auth.server", () => ({
  getAuthSession: vi.fn().mockResolvedValue({ user: null, accessToken: null }),
}));

vi.mock("~/services/backend-client.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/services/backend-client.server")>();
  return { ...actual, loadWorkspaceSnapshot: vi.fn(actual.loadWorkspaceSnapshot) };
});

vi.mock("~/features/dashboard/components/HomeDashboard", () => ({
  HomeDashboard: () => <div id="mock-home-dashboard">Mock Dashboard</div>,
}));

import { useLoaderData } from "react-router";

describe("_index route", () => {
  it("redirects signed-out ?demo=true to /sandbox", async () => {
    const request = new Request("http://localhost/?demo=true");
    const result = (await loader({ request, params: {}, context: {} } as any)) as Response;
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe("/sandbox");
  });

  it("signed-in ?demo=true returns the real workspace, never demo data", async () => {
    vi.mocked(loadWorkspaceSnapshot).mockResolvedValueOnce({
      user: { id: "u1", email: "real@example.com" },
      accounts: [],
      accountDetails: [],
      budgetEntries: [],
      taxRecords: [],
      userProfile: { onboardingCompleted: true },
      portfolioSnapshot: undefined,
    } as any);
    const request = new Request("http://localhost/?demo=true");
    const data = (await loader({ request, params: {}, context: {} } as any)) as any;
    expect(data.user.email).toBe("real@example.com");
    expect(JSON.stringify(data)).not.toContain("demo@flump.app");
    expect(data).not.toHaveProperty("isDemo");
  });

  it("flags a budget that holds income but no spending yet (straight after onboarding)", async () => {
    vi.mocked(loadWorkspaceSnapshot).mockResolvedValueOnce({
      user: { id: "u1", email: "real@example.com" },
      accounts: [],
      accountDetails: [],
      budgetEntries: [
        { id: "b1", name: "Take-home pay", category: "income", amount: 2085, isIncome: true },
      ],
      taxRecords: [],
      userProfile: { onboardingCompleted: true },
      portfolioSnapshot: undefined,
    } as any);
    const request = new Request("http://localhost/");
    const data = (await loader({ request, params: {}, context: {} } as any)) as any;
    expect(data.budgetData.budgetKnown).toBe(true);
    expect(data.budgetData.hasIncome).toBe(true);
    expect(data.budgetData.hasSpending).toBe(false);
    expect(data.budgetData.monthlyIncome).toBe(2085);
  });

  it("never invents an estimated tax due figure from tax records", async () => {
    vi.mocked(loadWorkspaceSnapshot).mockResolvedValueOnce({
      user: { id: "u1", email: "real@example.com" },
      accounts: [],
      accountDetails: [],
      budgetEntries: [],
      taxRecords: [{ type: "income", amount: 100000, date: "2019-05-01", frequency: "annual" }],
      userProfile: { onboardingCompleted: true },
      portfolioSnapshot: undefined,
    } as any);
    const request = new Request("http://localhost/");
    const data = (await loader({ request, params: {}, context: {} } as any)) as any;
    expect(data.taxData.estimatedTaxDue).toBeNull();
  });

  it("estimates tax due from the engine for current-year rental income (C-11)", async () => {
    const year = getCurrentUKTaxYear();
    const date = `${year.slice(0, 4)}-05-01`;
    const record = (id: string, type: string, category: string, amount: number) => ({
      id,
      userId: "u1",
      type,
      source: "rental",
      category,
      name: category,
      amount,
      frequency: "annual",
      date,
      endDate: `${Number(year.slice(0, 4)) + 1}-04-05`,
    });
    vi.mocked(loadWorkspaceSnapshot).mockResolvedValueOnce({
      user: { id: "u1", email: "real@example.com" },
      accounts: [],
      accountDetails: [],
      budgetEntries: [],
      taxRecords: [
        record("r1", "income", "rental_income", 12000),
        record("r2", "expense", "repairs_maintenance", 2000),
      ],
      userProfile: {
        onboardingCompleted: true,
        annualSalary: 30000,
        employmentType: "employed",
        taxRegion: "SCOTLAND",
      },
      portfolioSnapshot: undefined,
    } as any);
    const data = (await loader({
      request: new Request("http://localhost/"),
      params: {},
      context: {},
    } as any)) as any;
    // 10,000 rental profit, all in the basic band on a 30,000 salary: 20%.
    expect(data.taxData.estimatedTaxDue).toBe(2000);
    // The engine's bands note travels with the figure, so the tax widget can show it.
    expect(data.taxData.estimatedTaxDueNotes).toEqual([
      "Uses England, Wales and Northern Ireland Income Tax bands.",
    ]);
  });

  it("counts the seeded home Property account once in net worth, labelled (D3)", async () => {
    vi.mocked(loadWorkspaceSnapshot).mockResolvedValueOnce({
      user: { id: "u1", email: "real@example.com" },
      accounts: [
        { id: "c", name: "Cash", type: "Saving", balance: 21000 },
        { id: "p", name: "Pension", type: "Pension", balance: 96000 },
        { id: "m", name: "Mortgage", type: "Mortgage", balance: 186000 },
        { id: "h", name: "Home (your estimate)", type: "Property", balance: 310000 },
      ],
      accountDetails: [],
      budgetEntries: [],
      taxRecords: [],
      // A profile homeValue (never stored by the backend) is not added on top.
      userProfile: { onboardingCompleted: true, housingStatus: "mortgage", homeValue: 500000 },
      portfolioSnapshot: undefined,
    } as any);
    const data = (await loader({
      request: new Request("http://localhost/"),
      params: {},
      context: {},
    } as any)) as any;
    expect(data.accountsData.netWorth).toBe(241000);
    expect(data.accountsData.totalAssets).toBe(427000);
    expect(data.accountsData.homeEstimate).toBe(310000);
  });

  it("passes the latest earlier recorded month for the hero delta, and nothing else", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
    try {
      vi.mocked(loadWorkspaceSnapshot).mockResolvedValueOnce({
        user: { id: "u1", email: "real@example.com" },
        accounts: [{ id: "c", name: "Cash", type: "Saving", balance: 5320 }],
        accountDetails: [
          { accountId: "c", year: 2026, month: 9, value: 4800 },
          { accountId: "c", year: 2026, month: 10, value: 5000 },
        ],
        budgetEntries: [],
        taxRecords: [],
        userProfile: { onboardingCompleted: true },
        portfolioSnapshot: undefined,
      } as any);
      const data = (await loader({
        request: new Request("http://localhost/"),
        params: {},
        context: {},
      } as any)) as any;
      expect(data.netWorthPrior).toEqual({ month: "2026-10", netWorth: 5000 });
    } finally {
      vi.useRealTimers();
    }
  });

  it("has no earlier month for the hero delta without a history", async () => {
    vi.mocked(loadWorkspaceSnapshot).mockResolvedValueOnce({
      user: { id: "u1", email: "real@example.com" },
      accounts: [{ id: "c", name: "Cash", type: "Saving", balance: 5320 }],
      accountDetails: [],
      budgetEntries: [],
      taxRecords: [],
      userProfile: { onboardingCompleted: true },
      portfolioSnapshot: undefined,
    } as any);
    const data = (await loader({
      request: new Request("http://localhost/"),
      params: {},
      context: {},
    } as any)) as any;
    expect(data.netWorthPrior).toBeNull();
  });

  it("rejects when the workspace snapshot fails instead of returning zeroed data", async () => {
    const failure = new Error("snapshot failed");
    vi.mocked(loadWorkspaceSnapshot).mockRejectedValueOnce(failure);
    const request = new Request("http://localhost/");
    await expect(loader({ request, params: {}, context: {} } as any)).rejects.toBe(failure);
  });

  const signedInSnapshot = (overrides: Record<string, unknown> = {}) => ({
    user: { id: "u1", email: "real@example.com" },
    accounts: [],
    accountDetails: [],
    budgetEntries: [],
    taxRecords: [],
    userProfile: { onboardingCompleted: true },
    portfolioSnapshot: undefined,
    ...overrides,
  });

  it("signed-in loader returns debtData null when the only liability is a mortgage", async () => {
    vi.mocked(loadWorkspaceSnapshot).mockResolvedValueOnce(
      signedInSnapshot({
        accounts: [{ id: "m", name: "Home", type: "Mortgage", balance: -200000 }],
      }) as any,
    );
    const request = new Request("http://localhost/");
    const data = (await loader({ request, params: {}, context: {} } as any)) as any;
    expect(data.debtData).toBeNull();
  });

  it("signed-in loader computes debtData from consumer debts with no invented figures", async () => {
    vi.mocked(loadWorkspaceSnapshot).mockResolvedValueOnce(
      signedInSnapshot({
        accounts: [
          {
            id: "c",
            name: "Card",
            type: "Credit Card",
            balance: -2000,
            interestRate: 20,
            monthlyContribution: 80,
          },
        ],
      }) as any,
    );
    const request = new Request("http://localhost/");
    const data = (await loader({ request, params: {}, context: {} } as any)) as any;
    expect(data.debtData.totalDebt).toBe(2000);
    expect(data.debtData.highInterestCount).toBe(1);
    expect(data.debtData.monthlyMinimumTotal).toBe(80);
    expect(data.debtData.monthlyMinimumEstimated).toBe(false);
    expect(JSON.stringify(data.debtData)).not.toContain("October 2026");
    expect(data.debtData).not.toHaveProperty("interestSaved");
  });

  const loadSignedIn = async (overrides: Record<string, unknown>) => {
    vi.mocked(loadWorkspaceSnapshot).mockResolvedValueOnce(signedInSnapshot(overrides) as any);
    const request = new Request("http://localhost/");
    return (await loader({ request, params: {}, context: {} } as any)) as any;
  };

  it("a user with 0% pension contribution gets employeePercent 0", async () => {
    const data = await loadSignedIn({
      userProfile: { onboardingCompleted: true, pensionPercent: 0, pensionEmployerPercent: 0 },
    });
    expect(data.pensionData.employeePercent).toBe(0);
    expect(data.pensionData.employerPercent).toBe(0);
  });

  it("keeps stored pension percentages and shows nothing invented when absent", async () => {
    const stored = await loadSignedIn({
      userProfile: { onboardingCompleted: true, pensionPercent: "8", pensionEmployerPercent: "4" },
    });
    expect(stored.pensionData.employeePercent).toBe(8);
    expect(stored.pensionData.employerPercent).toBe(4);

    const absent = await loadSignedIn({ userProfile: { onboardingCompleted: true } });
    expect(absent.pensionData.employeePercent).toBeNull();
    expect(absent.pensionData.employerPercent).toBeNull();
  });

  it("never shows gross as take-home when the employment type is unknown", async () => {
    for (const employmentType of [null, undefined, "other", "retired"]) {
      const data = await loadSignedIn({
        userProfile: {
          onboardingCompleted: true,
          annualSalary: 60000,
          employmentType,
          pensionPercent: 5,
          isSalarySacrifice: true,
        },
      });
      expect(data.forecastData.estimatedTakeHome).toBeNull();
      expect(data.forecastData.takeHomeMissing).toBe("Add employment type");
    }
  });

  it("names the missing pension details when salary and employment type are known", async () => {
    const data = await loadSignedIn({
      userProfile: { onboardingCompleted: true, annualSalary: 60000, employmentType: "employed" },
    });
    expect(data.forecastData.estimatedTakeHome).toBeNull();
    expect(data.forecastData.takeHomeMissing).toBe(
      "Add pension percentage and salary sacrifice status",
    );
  });

  it("lists every missing take-home input at once", async () => {
    const data = await loadSignedIn({
      userProfile: { onboardingCompleted: true, annualSalary: 60000 },
    });
    expect(data.forecastData.takeHomeMissing).toBe(
      "Add employment type, pension percentage and salary sacrifice status",
    );
  });

  it("treats empty strings as missing", async () => {
    const data = await loadSignedIn({
      userProfile: {
        onboardingCompleted: true,
        annualSalary: 60000,
        employmentType: "",
        pensionPercent: "",
      },
    });
    expect(data.forecastData.estimatedTakeHome).toBeNull();
    expect(data.forecastData.takeHomeMissing).toBe(
      "Add employment type, pension percentage and salary sacrifice status",
    );
  });

  it("only counts tax records dated in the current tax year", async () => {
    const currentYear = getCurrentUKTaxYear();
    const startYear = Number(currentYear.slice(0, 4));
    const data = await loadSignedIn({
      taxRecords: [
        { type: "income", amount: 20000, date: `${startYear}-06-01`, frequency: "one-off" },
        { type: "expense", amount: 5000, date: `${startYear}-07-01`, frequency: "one-off" },
        { type: "income", amount: 90000, date: "2019-05-01", frequency: "annual" },
        { type: "income", amount: 11000, date: `${startYear - 1}-06-01`, frequency: "one-off" },
      ],
    });
    expect(data.taxData.totalIncome).toBe(20000);
    expect(data.taxData.totalExpenses).toBe(5000);
    expect(data.taxData.netProfit).toBe(15000);
    expect(data.taxData.recordsCount).toBe(2);
  });

  it("computes take-home below gross for a known employment type", async () => {
    const data = await loadSignedIn({
      userProfile: {
        onboardingCompleted: true,
        annualSalary: 60000,
        employmentType: "employed",
        pensionPercent: 5,
        isSalarySacrifice: true,
      },
    });
    expect(data.forecastData.estimatedTakeHome).toBeGreaterThan(0);
    expect(data.forecastData.estimatedTakeHome).toBeLessThan(5000);
  });

  it("a missing salary yields no salary and no take-home, never 45,000", async () => {
    const data = await loadSignedIn({ userProfile: { onboardingCompleted: true } });
    expect(data.forecastData.annualSalary).toBeNull();
    expect(data.forecastData.estimatedTakeHome).toBeNull();
    expect(data.forecastData.takeHomeMissing).toBeUndefined();
  });

  it("mortgage rate comes from the account, term is null", async () => {
    const data = await loadSignedIn({
      accounts: [{ id: "m", name: "Home", type: "Mortgage", balance: -200000, interestRate: 3.9 }],
    });
    expect(data.mortgageData.interestRate).toBe(3.9);
    expect(data.mortgageData.remainingTermYears).toBeNull();
  });

  it("mortgage rate comes only from the account; the term is never stored", async () => {
    const data = await loadSignedIn({
      userProfile: { onboardingCompleted: true },
      accounts: [{ id: "m", name: "Home", type: "Mortgage", balance: -200000 }],
    });
    expect(data.mortgageData.interestRate).toBeNull();
    expect(data.mortgageData.remainingTermYears).toBeNull();
  });

  it("mortgage rate is null when the account has none", async () => {
    const data = await loadSignedIn({
      accounts: [{ id: "m", name: "Home", type: "Mortgage", balance: -200000 }],
    });
    expect(data.mortgageData.interestRate).toBeNull();
  });

  it("savings rate is null with no savings balance rather than a default", async () => {
    const data = await loadSignedIn({ userProfile: { onboardingCompleted: true } });
    expect(data.savingsData.weightedInterestRate).toBeNull();
  });

  it("take-home is null when salary is known but pension percent is unknown", async () => {
    const data = await loadSignedIn({
      userProfile: { onboardingCompleted: true, annualSalary: 50000, isSalarySacrifice: true },
    });
    expect(data.forecastData.estimatedTakeHome).toBeNull();
    expect(data.pensionData.monthlyContributionEst).toBeNull();
  });

  it("take-home is null when salary-sacrifice status is unknown", async () => {
    const data = await loadSignedIn({
      userProfile: { onboardingCompleted: true, annualSalary: 50000, pensionPercent: 5 },
    });
    expect(data.forecastData.estimatedTakeHome).toBeNull();
    expect(data.pensionData.isSalarySacrifice).toBeNull();
  });

  it("computes take-home and contribution estimate when salary, percent and status are known", async () => {
    const data = await loadSignedIn({
      userProfile: {
        onboardingCompleted: true,
        annualSalary: 60000,
        employmentType: "employed",
        pensionPercent: 5,
        isSalarySacrifice: true,
      },
    });
    expect(data.forecastData.estimatedTakeHome).toBeGreaterThan(0);
    expect(data.pensionData.isSalarySacrifice).toBe(true);
    expect(data.pensionData.monthlyContributionEst).toBe(250);
  });

  it("0% pension is known: contribution estimate is 0 and take-home is computed", async () => {
    const data = await loadSignedIn({
      userProfile: {
        onboardingCompleted: true,
        annualSalary: 60000,
        employmentType: "employed",
        pensionPercent: 0,
        isSalarySacrifice: false,
      },
    });
    expect(data.pensionData.monthlyContributionEst).toBe(0);
    expect(data.forecastData.estimatedTakeHome).toBeGreaterThan(0);
  });

  it("redirects signed-out visitors to the marketing site", async () => {
    const request = new Request("http://localhost/");
    const result = (await loader({ request, params: {}, context: {} } as any)) as Response;
    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe("http://localhost:3001");
  });
});
