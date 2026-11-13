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
              monthlyContribution: 90,
              monthlyContributionKnown: true,
            },
            {
              id: "acc-loan",
              name: "Tesco Loan",
              type: "Loan",
              balance: 4500,
              interestRate: 7.9,
              monthlyContribution: 150,
              monthlyContributionKnown: true,
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

const openTab = (name: RegExp) => fireEvent.click(screen.getByRole("tab", { name }));

describe("DebtContainer", () => {
  beforeEach(() => {
    fetcherState.submit.mockReset();
    fetcherState.data = undefined;
    loaderState.accountsOverride = null;
  });

  it("passes the loader surplus, not a hard-coded fallback", () => {
    render(<DebtContainer />);
    expect(screen.getByText(/Your budget surplus is £420 a month/)).toBeDefined();
    expect(screen.queryByText(/Set up your budget to see your monthly surplus/)).toBeNull();
    expect(screen.queryByTestId("surplus-unknown-note")).toBeNull();
  });

  it("shows Not set for date and interest saved when a debt has no APR", () => {
    loaderState.accountsOverride = [
      { id: "acc-cc", name: "Barclaycard", type: "Credit Card", balance: 3000 },
    ];
    render(<DebtContainer />);
    expect(screen.getAllByText("Not set").length).toBeGreaterThanOrEqual(2);
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
      expect(screen.queryByText("Total you owe")).toBeNull();
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
      openTab(/UK debt rules and help/i);
      expect(
        screen.getByRole("heading", { level: 2, name: "UK debt rules and help" }),
      ).toBeDefined();
    } finally {
      loaderState.empty = false;
    }
  });

  it("renders debt payoff overview and active liabilities", () => {
    render(<DebtContainer />);

    expect(screen.getByRole("heading", { level: 1, name: "Your debts" })).toBeDefined();
    expect(screen.getByText("Total you owe")).toBeDefined();
    expect(screen.getByRole("heading", { level: 3, name: "Payoff order" })).toBeDefined();
    expect(
      screen.getByText(/What if the money that clears your debts went into savings instead/),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { hidden: true, level: 2, name: "UK debt rules and help" }),
    ).toBeDefined();
  });

  it("allows switching UK instruments tabs and managing liability accounts", () => {
    render(<DebtContainer />);

    openTab(/UK debt rules and help/i);
    const overdraftTab = screen.getByRole("tab", { name: /Arranged overdraft cost/i });
    fireEvent.click(overdraftTab);

    expect(screen.getByText(/Annual overdraft interest cost/i)).toBeDefined();
    expect(screen.getByLabelText(/Average arranged overdraft balance/i)).toBeDefined();

    // Switch top-level container tabs
    openTab(/Your debts \(/i);
    openTab(/UK debt rules and help/i);

    // Open Add Debt Modal and submit a new debt: it persists through the route action
    openTab(/Your debts \(/i);
    fireEvent.click(screen.getByRole("button", { name: /Add Debt/i }));
    const nameInput = screen.getByLabelText(/^Name of the debt/);
    fireEvent.change(nameInput, { target: { value: "New Store Card" } });
    fireEvent.change(screen.getByLabelText(/^Balance you owe/), {
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
    openTab(/Your debts \(/i);
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
    openTab(/Your debts \(/i);
    fireEvent.click(screen.getByRole("button", { name: "Edit Barclaycard Platinum" }));
    fireEvent.change(screen.getByLabelText("APR (%)"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(fetcherState.submit).toHaveBeenCalledWith(
      { intent: "updateDebt", accountId: "acc-cc", interestRate: "" },
      { method: "POST", action: "/app/debt" },
    );
  });

  it("keeps the inactive UK rules panel out of the accessibility tree", () => {
    render(<DebtContainer />);
    expect(screen.getByRole("button", { name: /Delete Tesco Loan/i })).toBeDefined();
    expect(screen.queryByRole("tab", { name: /Arranged overdraft cost/i })).toBeNull();
    openTab(/UK debt rules and help/i);
    expect(screen.getByRole("tab", { name: /Arranged overdraft cost/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /Delete Tesco Loan/i })).toBeNull();
  });

  it("moves between tabs with the arrow keys", () => {
    render(<DebtContainer />);
    const first = screen.getByRole("tab", { name: /Your debts \(/i });
    expect(first.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(
      screen.getByRole("tab", { name: /UK debt rules and help/i }).getAttribute("aria-selected"),
    ).toBe("true");
    fireEvent.keyDown(first, { key: "Home" });
    expect(first.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(first, { key: "End" });
    expect(
      screen.getByRole("tab", { name: /UK debt rules and help/i }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("does not submit when the delete confirmation is cancelled", () => {
    render(<DebtContainer />);
    openTab(/Your debts \(/i);
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
    openTab(/Your debts \(/i);
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

  it("announces the debt-free headline shortly after the overpayment slider changes", () => {
    render(<DebtContainer />);
    const region = screen.getByRole("status");
    expect(region.textContent).toBe("");

    fireEvent.change(screen.getAllByRole("slider")[0], { target: { value: "300" } });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(region.textContent).toBe("");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(region.textContent).toMatch(/^Illustration: debt-free by .+, total interest £[\d,]+$/);
  });

  it("keeps the headline empty when minimum payments are estimated", () => {
    loaderState.accountsOverride = [
      { id: "acc-cc", name: "Barclaycard", type: "Credit Card", balance: 3000, interestRate: 20 },
    ];
    render(<DebtContainer />);
    const region = screen.getByRole("status");
    fireEvent.change(screen.getAllByRole("slider")[0], { target: { value: "300" } });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(region.textContent).toBe("");
  });
});

describe("DebtContainer scenario zone", () => {
  beforeEach(() => {
    fetcherState.submit.mockClear();
    loaderState.accountsOverride = null;
  });

  const kpiText = () => document.querySelector("[data-tone='hero']")?.parentElement?.textContent;

  it("starts the extra payment at £0 and shows the saved basis line", () => {
    render(<DebtContainer />);
    const zone = screen.getByRole("region", { name: "Model a change to your debts" });
    expect(zone.textContent).toContain("Illustration, not saved");
    expect(zone.textContent).toContain(
      "Starting from your figures: £7,500 owed across 2 debts, £240 a month in minimums",
    );
    const slider = within(zone).getByRole("slider", { name: /Extra payment each month/i });
    expect((slider as HTMLInputElement).value).toBe("0");
    expect(within(zone).queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
  });

  it("changing the extra payment or order leaves the KPI strip unchanged and makes no request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<DebtContainer />);
    const before = kpiText();
    expect(before).toContain("Paying the minimums only");

    fireEvent.change(screen.getByRole("slider", { name: /Extra payment each month/i }), {
      target: { value: "300" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /Smallest balance first/ }));
    fireEvent.click(screen.getByRole("button", { name: /Match surplus/ }));

    expect(kpiText()).toBe(before);
    expect(document.querySelectorAll("[data-tone='hero']")).toHaveLength(1);
    expect(fetcherState.submit).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("offers Reset to saved figures once modified and restores £0", () => {
    render(<DebtContainer />);
    const slider = () =>
      screen.getByRole("slider", { name: /Extra payment each month/i }) as HTMLInputElement;
    fireEvent.change(slider(), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(slider().value).toBe("0");
    expect(screen.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
  });

  it("keeps fact inputs out of the zone: balances and APRs are edited in Your debts only", () => {
    render(<DebtContainer />);
    const zone = screen.getByRole("region", { name: "Model a change to your debts" });
    expect(within(zone).queryByRole("textbox", { name: /APR|balance|minimum/i })).toBeNull();
    expect(zone.textContent).not.toMatch(/sandbox|apply to my/i);
  });
});
