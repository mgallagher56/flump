import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router", () => ({
  useLoaderData: () => ({
    accounts: [
      {
        id: "acc-1",
        name: "High Yield Saver",
        type: "Saving",
        balance: 5000,
        interestRate: 4.5,
        monthlyContribution: 250,
      },
      {
        id: "acc-2",
        name: "Vanguard ISA",
        type: "Investment",
        balance: 15000,
        interestRate: 7.0,
        monthlyContribution: 300,
      },
    ],
    accountDetails: [],
    budgetEntries: [],
    userProfile: {
      savingsAllocationMode: "per_account",
      monthlySavingsTarget: 550,
      savingsDefaultInterestRate: 5.0,
      setupChecklistCompletedSteps: [],
    },
  }),
  useNavigate: () => vi.fn(),
  useFetcher: () => ({
    submit: vi.fn(),
    state: "idle",
    data: null,
  }),
}));

vi.mock("~/hooks/useUserProfile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/hooks/useUserProfile")>();
  return {
    ...actual,
    useUserProfile: () => ({
      profile: {
        savingsAllocationMode: "per_account",
        monthlySavingsTarget: 550,
        savingsDefaultInterestRate: 5.0,
        setupChecklistCompletedSteps: [],
      },
      setProfile: vi.fn(),
      markChecklistStep: vi.fn().mockResolvedValue({}),
    }),
  };
});

vi.mock("~/utils/utils", () => ({
  currentMonth: 6,
  currentYear: 2026,
}));

vi.mock("recharts", async () => {
  const actual: any = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

import SavingsContainer from "./SavingsContainer";

describe("SavingsContainer", () => {
  it("renders page header and main savings sections", () => {
    render(<SavingsContainer />);

    expect(screen.getByText("Savings & Compound Growth")).toBeDefined();
    expect(screen.getByText("Total Savings Balance")).toBeDefined();
    expect(screen.getByText("Savings & Investment Accounts")).toBeDefined();
    expect(screen.getByText("Compound Interest Growth Forecaster")).toBeDefined();
  });

  it("displays savings accounts in the list", () => {
    render(<SavingsContainer />);

    expect(screen.getAllByText("High Yield Saver").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vanguard ISA").length).toBeGreaterThan(0);
  });
});
