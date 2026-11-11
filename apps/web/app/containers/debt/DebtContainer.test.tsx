import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DebtContainer from "./DebtContainer";

const fetcherState = vi.hoisted(() => ({
  submit: vi.fn(),
  data: undefined as unknown,
}));

const loaderState = vi.hoisted(() => ({
  empty: false,
  accountsOverride: null as unknown[] | null,
  debtInputs: { monthlySurplus: 420, liquidSavings: 2000, monthlyEssentialExpenses: 1500 } as {
    monthlySurplus: number | null;
    liquidSavings: number;
    monthlyEssentialExpenses: number | null;
  },
}));

vi.mock("react-router", () => ({
  useLoaderData: () => ({
    accounts: loaderState.accountsOverride
      ? loaderState.accountsOverride
      : loaderState.empty
        ? []
        : [
            {
              id: "acc-cc",
              name: "Barclaycard Platinum",
              type: "Credit Card",
              balance: 3000,
              interestRate: 22.9,
            },
            {
              id: "acc-loan",
              name: "Tesco Loan",
              type: "Loan",
              balance: 4500,
              interestRate: 7.9,
            },
          ],
    debtInputs: loaderState.debtInputs,
    userProfile: {},
  }),
  useFetcher: () => ({
    state: "idle",
    get data() {
      return fetcherState.data;
    },
    submit: fetcherState.submit,
  }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock("~/hooks/useUserProfile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/hooks/useUserProfile")>();
  return {
    ...actual,
    useUserProfile: () => ({
      profile: {
        enabledPages: ["accounts", "budget", "debt"],
      },
      updateProfile: vi.fn(),
    }),
  };
});

describe("DebtContainer", () => {
  beforeEach(() => {
    fetcherState.submit.mockReset();
    fetcherState.data = undefined;
    loaderState.accountsOverride = null;
  });

  it("passes the loader surplus, not a hard-coded fallback", () => {
    render(<DebtContainer />);
    expect(screen.getByText(/Wired to budget surplus: £420\/mo available/)).toBeDefined();
    expect(screen.queryByText(/Set up your budget to see your monthly surplus/)).toBeNull();
    expect(screen.queryByTestId("surplus-unknown-note")).toBeNull();
  });

  it("shows Not calculated for date and interest saved when a debt has no APR", () => {
    loaderState.accountsOverride = [
      { id: "acc-cc", name: "Barclaycard", type: "Credit Card", balance: 3000 },
    ];
    render(<DebtContainer />);
    expect(screen.getAllByText("Not calculated").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Add each debt's APR/).length).toBeGreaterThan(0);
  });

  it("marks estimated minimum payments as estimated", () => {
    loaderState.accountsOverride = [
      { id: "acc-cc", name: "Barclaycard", type: "Credit Card", balance: 3000, interestRate: 20 },
    ];
    render(<DebtContainer />);
    expect(screen.getByText(/minimums estimated/)).toBeDefined();
  });

  it("shows the budget prompt when surplus is null", () => {
    loaderState.debtInputs = {
      monthlySurplus: null,
      liquidSavings: 0,
      monthlyEssentialExpenses: null,
    };
    try {
      render(<DebtContainer />);
      const prompt = screen.getByText(/Set up your budget to see your monthly surplus/);
      expect(prompt.closest("a")?.getAttribute("href")).toBe("/app/budget");
      expect(screen.queryByText(/Wired to budget surplus/)).toBeNull();
      expect(screen.getByTestId("surplus-unknown-note").textContent).toMatch(/Illustrative only/);
    } finally {
      loaderState.debtInputs = {
        monthlySurplus: 420,
        liquidSavings: 2000,
        monthlyEssentialExpenses: 1500,
      };
    }
  });

  it("shows the empty state and no invented debts for a user without debt accounts", () => {
    loaderState.empty = true;
    try {
      render(<DebtContainer />);
      expect(screen.queryByText("Barclaycard Platinum")).toBeNull();
      expect(screen.queryByText("Klarna Pay in 3")).toBeNull();
      expect(screen.getByText("No debts yet")).toBeDefined();
      expect(screen.queryByText(/Total Unsecured Debt/i)).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Add debt" }));
      expect(screen.getByText(/Add Liability Account/i)).toBeDefined();
    } finally {
      loaderState.empty = false;
    }
  });

  it("keeps the UK debt rules tab reachable when there are no debts", () => {
    loaderState.empty = true;
    try {
      render(<DebtContainer />);
      fireEvent.click(screen.getByRole("button", { name: /UK Debt Rules & Helplines/i }));
      expect(screen.getByText(/UK Debt Rules & Specialised Instruments/i)).toBeDefined();
    } finally {
      loaderState.empty = false;
    }
  });

  it("renders debt payoff overview and active liabilities", () => {
    render(<DebtContainer />);

    expect(screen.getByText(/Debt payoff and recovery/i)).toBeDefined();
    expect(screen.getByText(/Total Unsecured Debt/i)).toBeDefined();
    expect(screen.getByText(/Payoff Strategy: Avalanche vs. Snowball/i)).toBeDefined();
    expect(screen.getByText(/The Debt-to-Wealth Crossover Bridge/i)).toBeDefined();
    expect(screen.getByText(/UK Debt Rules & Specialised Instruments/i)).toBeDefined();
  });

  it("allows switching UK instruments tabs and managing liability accounts", () => {
    render(<DebtContainer />);

    const overdraftTab = screen.getByRole("button", { name: /Arranged Overdraft EAR Cost/i });
    fireEvent.click(overdraftTab);

    expect(screen.getByText(/True Annual Overdraft Drain/i)).toBeDefined();
    expect(screen.getByText(/Average Arranged Overdraft Balance/i)).toBeDefined();

    // Switch top-level container tabs
    fireEvent.click(screen.getByRole("button", { name: /Liability Accounts & Cards/i }));
    fireEvent.click(screen.getByRole("button", { name: /UK Debt Rules & Helplines/i }));
    fireEvent.click(screen.getByRole("button", { name: /Strategy & Payoff Simulator/i }));

    // Open Add Debt Modal and submit a new debt: it persists through the route action
    fireEvent.click(screen.getByRole("button", { name: /Add Debt/i }));
    const nameInput = screen.getByPlaceholderText(/Barclaycard Platinum/i);
    fireEvent.change(nameInput, { target: { value: "New Store Card" } });
    fireEvent.change(screen.getByLabelText("Outstanding balance (£)"), {
      target: { value: "1000" },
    });
    const form = nameInput.closest("form");
    if (form) fireEvent.submit(form);
    expect(fetcherState.submit).toHaveBeenCalledTimes(1);
    const [fields, options] = fetcherState.submit.mock.calls[0] as [
      Record<string, string>,
      { method: string; action: string },
    ];
    expect(fields).toMatchObject({
      intent: "createDebt",
      name: "New Store Card",
      type: "Credit Card",
      balance: "-1000",
      interestRate: "",
      monthlyContribution: "",
    });
    expect(options).toEqual({ method: "POST", action: "/app/debt" });
  });

  it("asks for confirmation before deleting and only submits after confirming", () => {
    render(<DebtContainer />);
    fireEvent.click(screen.getByRole("button", { name: /Liability Accounts & Cards/i }));
    fireEvent.click(screen.getByRole("button", { name: /Delete Tesco Loan/i }));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/Delete Tesco Loan\?/)).toBeDefined();
    expect(fetcherState.submit).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Delete debt" }));
    expect(fetcherState.submit).toHaveBeenCalledWith(
      { intent: "deleteDebt", accountId: "acc-loan" },
      { method: "POST", action: "/app/debt" },
    );
  });

  it("edits a debt, sending only the changed APR and never the balance", () => {
    render(<DebtContainer />);
    fireEvent.click(screen.getByRole("button", { name: /Liability Accounts & Cards/i }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Barclaycard Platinum" }));
    fireEvent.change(screen.getByLabelText("APR (%)"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(fetcherState.submit).toHaveBeenCalledWith(
      { intent: "updateDebt", accountId: "acc-cc", interestRate: "" },
      { method: "POST", action: "/app/debt" },
    );
  });

  it("does not submit when the delete confirmation is cancelled", () => {
    render(<DebtContainer />);
    fireEvent.click(screen.getByRole("button", { name: /Delete Tesco Loan/i }));
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }),
    );
    expect(fetcherState.submit).not.toHaveBeenCalled();
  });

  it("shows a failed save as an alert when no confirmation is open", () => {
    fetcherState.data = {
      success: false,
      error: "We couldn't save that. Check the details and try again.",
    };
    render(<DebtContainer />);
    expect(screen.getByRole("alert").textContent).toContain("We couldn't save that");
  });

  it("surfaces a failed delete inline and keeps the dialog open", () => {
    const { rerender } = render(<DebtContainer />);
    fireEvent.click(screen.getByRole("button", { name: /Delete Tesco Loan/i }));
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete debt" }),
    );
    fetcherState.data = {
      success: false,
      error: "We couldn't reach the server. Please try again.",
    };
    rerender(<DebtContainer />);
    expect(screen.getByRole("alert").textContent).toContain("We couldn't reach the server");
    expect(screen.getByRole("alertdialog")).toBeDefined();
  });
});

describe("DebtContainer live region", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loaderState.accountsOverride = null;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces the debt-free headline 1000ms after the overpayment slider changes", () => {
    render(<DebtContainer />);
    const region = screen.getByRole("status");
    expect(region.textContent).toBe("");

    fireEvent.change(screen.getAllByRole("slider")[0], { target: { value: "300" } });
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(region.textContent).toBe("");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(region.textContent).toMatch(/^Debt-free by .+, total interest £[\d,]+$/);
  });
});
