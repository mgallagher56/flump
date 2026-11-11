import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { default as Index, loader } from "./_index";

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
  useLoaderData: vi.fn(),
  redirect: (url: string) => ({ status: 302, url }),
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
}));

vi.mock("~/utils/auth.server", () => ({
  getAuthSession: vi.fn().mockResolvedValue({ user: null, accessToken: null }),
}));

vi.mock("~/services/backend-client.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/services/backend-client.server")>();
  return { ...actual, loadWorkspaceSnapshot: vi.fn(actual.loadWorkspaceSnapshot) };
});

vi.mock("~/components/dashboard/HomeDashboard", () => ({
  HomeDashboard: () => <div id="mock-home-dashboard">Mock Dashboard</div>,
}));

vi.mock("~/components/home/LoggedOutHome", () => ({
  default: () => <div id="mock-logged-out-home">Mock Logged Out Home</div>,
}));

import { useLoaderData } from "react-router";

describe("_index route", () => {
  it("returns demo data when ?demo=true is present in the loader request", async () => {
    const request = new Request("http://localhost/?demo=true");
    const data = (await loader({ request, params: {}, context: {} } as any)) as any;

    expect(data.isDemo).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe("demo@flump.app");
    expect(data.accountsData).toBeDefined();
    expect(data.accountsData.totalAssets).toBeGreaterThan(0);
    expect(data.budgetData).toBeDefined();
    expect(data.savingsData).toBeDefined();
    expect(data.mortgageData).toBeDefined();
    expect(data.pensionData).toBeDefined();
    expect(data.taxData).toBeDefined();
  });

  it("returns logged-out data when no session and not demo mode", async () => {
    const request = new Request("http://localhost/");
    const data = (await loader({ request, params: {}, context: {} } as any)) as any;

    expect(data).toBeDefined();
    expect(data.user).toBeNull();
    expect(data.isDemo).toBe(false);
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

  it("mortgage rate comes from the account, term is null", async () => {
    const data = await loadSignedIn({
      accounts: [{ id: "m", name: "Home", type: "Mortgage", balance: -200000, interestRate: 3.9 }],
    });
    expect(data.mortgageData.interestRate).toBe(3.9);
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

  it("renders LoggedOutHome when user is null", () => {
    vi.mocked(useLoaderData).mockReturnValue({
      isDemo: false,
      user: null,
      accountsData: null,
    } as any);

    render(<Index />);
    expect(screen.getByTestId("mock-logged-out-home")).toBeDefined();
  });

  it("renders DemoModeBanner and HomeDashboard when isDemo is true", () => {
    vi.mocked(useLoaderData).mockReturnValue({
      isDemo: true,
      user: { id: "demo-user", email: "demo@flump.app" },
      accountsData: { netWorth: 100000 },
      checklistProps: {},
      forecastData: {},
      mortgageData: {},
      pensionData: {},
      savingsData: {},
      taxData: {},
    } as any);

    render(<Index />);

    expect(screen.getByTestId("demo-mode-banner")).toBeDefined();
    expect(screen.getByTestId("mock-home-dashboard")).toBeDefined();
  });
});
