import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockSubmit = vi.hoisted(() => vi.fn());
const mockLocation = vi.hoisted(() => ({
  current: { pathname: "/app/savings", hash: "", state: null as unknown },
}));

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
  useLocation: () => mockLocation.current,
  useFetcher: () => ({
    submit: mockSubmit,
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

  it("parses a pay rise handed over from Take-home pay in router state", () => {
    expect(parsePayRise({ payRise: 150.4 })).toBe(150);
    expect(parsePayRise(null)).toBe(0);
    expect(parsePayRise({ payRise: -5 })).toBe(0);
    expect(parsePayRise({ payRise: "abc" })).toBe(0);
  });

  describe("pay rise from take-home", () => {
    afterEach(() => {
      mockLocation.current = { pathname: "/app/savings", hash: "", state: null };
    });

    it("shows nothing when no pay rise was handed over", () => {
      render(<SavingsContainer />);
      expect(screen.queryByText(/Pay rise from take-home:/)).toBeNull();
    });

    it("shows it as a removable scenario input and leaves the saved figures alone", () => {
      const { container, rerender } = render(<SavingsContainer />);
      const savedFigures = screen.getByRole("heading", { name: "Where you stand" }).parentElement
        ?.textContent;

      mockLocation.current = {
        pathname: "/app/savings",
        hash: "#forecast",
        state: { payRise: 230 },
      };
      mockSubmit.mockClear();
      rerender(<SavingsContainer />);
      expect(screen.getByText(/Pay rise from take-home:/)).toBeDefined();
      expect(screen.getByText("£2,760")).toBeDefined();
      // The pay rise row sits in the one savings scenario zone, with its single badge.
      const zone = screen.getByRole("region", { name: "Model a change to your savings" });
      expect(zone.textContent).toContain("Pay rise from take-home:");
      expect(screen.getAllByText("Illustration, not saved")).toHaveLength(1);
      expect(screen.getAllByRole("note", { name: "Guidance, not advice" })).toHaveLength(1);
      expect(
        screen.getByRole("heading", { name: "Where you stand" }).parentElement?.textContent,
      ).toBe(savedFigures);
      expect(mockSubmit).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: /Remove/ }));
      expect(screen.queryByText(/Pay rise from take-home:/)).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith("/app/savings#forecast", {
        replace: true,
        state: null,
      });
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(container.textContent).not.toContain("?payRise");
    });
  });
  describe("deposit timeline (E32)", () => {
    it("lives in the forecaster panel only, not under every tab", () => {
      render(<SavingsContainer />);
      expect(screen.getByRole("region", { name: "Model a change to your savings" })).toBeDefined();
      fireEvent.mouseDown(screen.getByRole("tab", { name: /Accounts/ }));
      expect(screen.queryByRole("region", { name: "Model a change to your savings" })).toBeNull();
    });

    it("models a target in a scenario zone, seeded from saved figures, and never saves it", () => {
      const setItem = vi.spyOn(Storage.prototype, "setItem");
      render(<SavingsContainer />);
      const zone = screen.getByRole("region", { name: "Model a change to your savings" });
      expect(zone.textContent).toContain("Illustration, not saved");
      const target = screen.getByLabelText("Target amount") as HTMLInputElement;
      expect(target.value).toBe("");
      // Saved figures: £20,000 across both accounts, £550 a month of stored contributions.
      expect((screen.getByLabelText("Monthly saving") as HTMLInputElement).value).toMatch(/550/);
      expect(screen.getByTestId("deposit-timeline-outcome").textContent).toBe(
        "Enter a target amount to see an estimate.",
      );

      fireEvent.change(target, { target: { value: "31000" } });
      expect(screen.getByTestId("deposit-timeline-outcome").textContent).toBe(
        "Estimated time to reach target: 20 months (1 year 8 months)",
      );
      expect(setItem).not.toHaveBeenCalled();
      expect(mockSubmit).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
      expect((screen.getByLabelText("Target amount") as HTMLInputElement).value).toBe("");
      setItem.mockRestore();
    });
  });
});
