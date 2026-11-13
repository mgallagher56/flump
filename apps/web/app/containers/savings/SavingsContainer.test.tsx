import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("react-router", () => ({
  useInRouterContext: () => false,
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
  useNavigate: () => mockNavigate,
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

import SavingsContainer, { parsePayRise } from "./SavingsContainer";

describe("SavingsContainer", () => {
  it("renders page header and main savings sections", () => {
    render(<SavingsContainer />);

    expect(screen.getByRole("heading", { level: 1, name: "Your savings" })).toBeDefined();
    expect(screen.getByText("Total savings")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Where you stand" })).toBeDefined();
    expect(screen.getByText("Your accounts")).toBeDefined();
    expect(screen.getByText("Savings projection")).toBeDefined();
  });

  it("displays savings accounts in the list and switches tabs", () => {
    render(<SavingsContainer />);

    expect(screen.getAllByText("High Yield Saver").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vanguard ISA").length).toBeGreaterThan(0);

    fireEvent.mouseDown(screen.getByRole("tab", { name: /Accounts/ }));
    expect(screen.getByRole("tab", { name: /Accounts/ }).getAttribute("aria-selected")).toBe(
      "true",
    );
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Allowances" }));
    expect(screen.queryByRole("tab", { name: /Take-home/i })).toBeNull();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Forecast" }));

    fireEvent.click(screen.getAllByRole("button", { name: /Add account/i })[0]);
  });

  it("redirects the old #takehome link to the Take-home pay page", () => {
    window.location.hash = "#takehome";
    mockNavigate.mockClear();
    render(<SavingsContainer />);
    expect(mockNavigate).toHaveBeenCalledWith("/app/take-home", { replace: true });
    window.location.hash = "";
  });

  it("parses a pay rise handed over from Take-home pay", () => {
    expect(parsePayRise("?payRise=150.4")).toBe(150);
    expect(parsePayRise("")).toBe(0);
    expect(parsePayRise("?payRise=-5")).toBe(0);
    expect(parsePayRise("?payRise=abc")).toBe(0);
  });
});
