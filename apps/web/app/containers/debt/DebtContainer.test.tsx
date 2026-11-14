import { expectPageRules } from "@repo/ui/testing";
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
  Link: ({ children, to, className }: any) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
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

const withAccounts = (accounts: unknown[], fn: () => void) => {
  loaderState.accountsOverride = accounts;
  try {
    fn();
  } finally {
    loaderState.accountsOverride = null;
  }
};

const withEmpty = (fn: () => void) => {
  loaderState.empty = true;
  try {
    fn();
  } finally {
    loaderState.empty = false;
  }
};

/** The first view: everything above "Your details" (the header, hero and strip). */
const firstView = (container: HTMLElement): HTMLElement => {
  const clone = container.cloneNode(true) as HTMLElement;
  const details = clone.querySelector("[aria-labelledby='debt-accounts-heading']");
  let node = details;
  while (node) {
    const next = node.nextElementSibling;
    node.remove();
    node = next;
  }
  return clone;
};

describe("DebtContainer", () => {
  beforeEach(() => {
    fetcherState.submit.mockReset();
    fetcherState.data = undefined;
    loaderState.accountsOverride = null;
  });

  it("shows the same MoneyHelper debt-help line to every user, whatever their figures (R3, R4)", () => {
    const helpText = () =>
      screen.getByRole("complementary", { name: "Debt advice" }).textContent ?? "";

    const { unmount } = render(<DebtContainer />);
    const withDebts = helpText();
    unmount();

    withEmpty(() => {
      render(<DebtContainer />);
      expect(helpText()).toBe(withDebts);
    });
    expect(withDebts).toContain("Free, impartial debt help is available from MoneyHelper");
  });

  it("meets the page rules with debts: one hero, one primary button, one notice, at most 10 first-view figures", () => {
    const { container } = render(<DebtContainer />);
    expectPageRules(container, { maxNotSet: 0, projectionNotices: 1 });
    expectPageRules(firstView(container), { maxFigures: 10, maxNotSet: 0 });
    expect(container.querySelectorAll("[data-list-row]")).toHaveLength(2);
  });

  it("meets the page rules without debts: h1, intro, one Add button, the MoneyHelper line", () => {
    withEmpty(() => {
      const { container } = render(<DebtContainer />);
      expectPageRules(container, { maxFigures: 0, maxNotSet: 0, projectionNotices: 0 });
      expect(screen.getByRole("heading", { level: 1, name: "Your debts" })).toBeDefined();
      expect(
        screen.getByText("Add a credit card, loan or overdraft to see when it would be paid off."),
      ).toBeDefined();
      expect(screen.queryAllByRole("tab")).toHaveLength(0);
      expect(screen.queryByText("Total you owe")).toBeNull();
      expect(screen.queryByRole("region", { name: "Model a change to your debts" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Add a debt" }));
      expect(screen.getByRole("dialog", { name: "Add a debt" })).toBeDefined();
    });
  });

  it("shows the saved total as the hero and the debt-free date as the first KPI, an estimate", () => {
    render(<DebtContainer />);
    const hero = document.querySelector("[data-tone='hero']");
    expect(hero?.textContent).toContain("Total you owe");
    expect(hero?.textContent).toContain("£7,500");
    expect(screen.getAllByText("Debt-free date").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Estimate").length).toBe(2);
    expect(screen.getByText("Interest this year")).toBeDefined();
  });

  it("missing APRs give one prompt with one button, and no 'Not set' cards", () => {
    withAccounts(
      [
        { id: "acc-cc", name: "Barclaycard", type: "Credit Card", balance: 3000 },
        { id: "acc-loan", name: "Tesco Loan", type: "Loan", balance: 4500 },
      ],
      () => {
        const { container } = render(<DebtContainer />);
        expectPageRules(container, { maxNotSet: 1 });
        expect(screen.queryByText("Not set")).toBeNull();
        expect(
          screen.getByText("Add the rate for 2 debts to see your debt-free date"),
        ).toBeDefined();
        // One prompt only: rows say "Rate not added" with no button of their own.
        expect(screen.getAllByRole("button", { name: /Add (a|the) rate/ })).toHaveLength(1);
        expect(screen.getAllByText("Rate not added")).toHaveLength(2);
        const notices = document.querySelectorAll("[data-notice='projection']");
        expect(notices).toHaveLength(1);
        expect(notices[0]?.textContent).toContain(
          "Some debts have no APR set, so the estimate uses 0% for them",
        );
        fireEvent.click(screen.getByRole("button", { name: "Add a rate" }));
        expect(screen.getByRole("dialog", { name: "Edit debt" })).toBeDefined();
      },
    );
  });

  it("shows a liability stored as a negative balance (#665) as a positive amount owed", () => {
    withAccounts(
      [
        {
          id: "acc-cc",
          name: "Barclaycard",
          type: "Credit Card",
          balance: -3000,
          interestRate: 20,
          monthlyContribution: 90,
          monthlyContributionKnown: true,
        },
        // Student loans are income-contingent (D-5-B): never a payoff debt or in the debt total.
        { id: "acc-sl", name: "Student Loan", type: "Student Loan", balance: -45000 },
      ],
      () => {
        const { container } = render(<DebtContainer />);
        expect(document.querySelector("[data-tone='hero']")?.textContent).toContain("£3,000");
        expect(container.textContent).not.toMatch(/[-−]£/);
        expect(container.textContent).not.toContain("£45,000");
        expect(
          within(screen.getByRole("list", { name: "Your debts" })).getAllByRole("listitem"),
        ).toHaveLength(1);
      },
    );
  });

  it("marks estimated minimum payments as estimates", () => {
    withAccounts(
      [{ id: "acc-cc", name: "Barclaycard", type: "Credit Card", balance: 3000, interestRate: 20 }],
      () => {
        render(<DebtContainer />);
        expect(screen.getByText(/Minimum payments, some are estimates/)).toBeDefined();
      },
    );
  });

  it("passes what the budget leaves over, not a hard-coded fallback", () => {
    render(<DebtContainer />);
    expect(screen.getByText("Your budget has £420 left over each month.")).toBeDefined();
    const notice = document.querySelector("[data-notice='projection']");
    expect(notice?.textContent).not.toContain("We do not know what you have left over");
  });

  it("shows the budget prompt when nothing is known about what is left over", () => {
    loaderState.debtInputs = {
      monthlySurplus: null,
      liquidSavings: 0,
      monthlyEssentialExpenses: null,
    };
    try {
      render(<DebtContainer />);
      const prompt = screen.getByText(
        "Set up your budget to see what you have left over each month",
      );
      expect(prompt.closest("a")?.getAttribute("href")).toBe("/app/budget");
      const notices = document.querySelectorAll("[data-notice='projection']");
      expect(notices).toHaveLength(1);
      expect(notices[0]?.textContent).toContain(
        "We do not know what you have left over each month, so these results assume you can afford the extra payment you choose.",
      );
    } finally {
      loaderState.debtInputs = {
        monthlySurplus: 420,
        liquidSavings: 2000,
        monthlyEssentialExpenses: 1500,
      };
    }
  });

  it("has no removed parts: the savings tool, the warning banner or judgement words", () => {
    const { container } = render(<DebtContainer />);
    expect(container.textContent).not.toMatch(
      /went into savings|high APR|liability|creditor|surplus|cleared|UK standard/i,
    );
    expect(
      screen
        .getByRole("link", { name: "Compare paying off early with saving" })
        .getAttribute("href"),
    ).toBe("/tools/mortgage-overpayment-vs-isa-calculator");
  });

  it("keeps the UK debt calculators in a quiet drawer", () => {
    render(<DebtContainer />);
    expect(screen.queryByRole("tab", { name: /Arranged overdraft cost/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /UK debt calculators/ }));
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Arranged overdraft cost/i }), {
      button: 0,
    });
    expect(screen.getByLabelText(/Average arranged overdraft balance/i)).toBeDefined();
  });

  it("adds a debt through the route action", () => {
    render(<DebtContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Add a debt" }));
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
    fireEvent.click(screen.getByRole("button", { name: /Delete Tesco Loan/i }));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/Delete Tesco Loan\?/)).toBeDefined();
    expect(
      within(dialog).getByText("Its history will be deleted too. This cannot be undone."),
    ).toBeDefined();
    expect(fetcherState.submit).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Delete debt" }));
    expect(fetcherState.submit).toHaveBeenCalledWith(
      { intent: "deleteDebt", accountId: "acc-loan" },
      { method: "POST", action: "/app/debt" },
    );
  });

  it("edits a debt, sending only the changed APR and never the balance", () => {
    render(<DebtContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Barclaycard Platinum" }));
    fireEvent.change(screen.getByLabelText(/^Interest rate/), { target: { value: "" } });
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

  it("falls back to a plain save error that says nothing has changed", () => {
    fetcherState.data = { success: false };
    render(<DebtContainer />);
    expect(screen.getByRole("alert").textContent).toBe(
      "We could not save that debt. Nothing has changed. Try again.",
    );
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

  it("announces the debt-free headline shortly after the extra payment changes", () => {
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

  const savedText = (container: HTMLElement) => firstView(container).textContent;

  it("has one tool: one slider, one payoff-order Tabs, starting at £0, with no repeated saved figures", () => {
    render(<DebtContainer />);
    const zone = screen.getByRole("region", { name: "Model a change to your debts" });
    expect(zone.textContent).toContain("Illustration, not saved");
    expect(zone.textContent).not.toContain("Starting from your figures");
    expect(within(zone).getAllByRole("slider")).toHaveLength(1);
    expect(within(zone).getAllByRole("tablist")).toHaveLength(1);
    const slider = within(zone).getByRole("slider", { name: /Extra payment each month/i });
    expect((slider as HTMLInputElement).value).toBe("0");
    expect(
      (within(zone).getByRole("button", { name: "Reset to saved figures" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("'Update your details' moves focus to the saved debts list", () => {
    render(<DebtContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Update your details" }));
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Your debts", level: 2 }),
    );
    expect(fetcherState.submit).not.toHaveBeenCalled();
  });

  it("changing the extra payment or order leaves the hero and KPI strip unchanged and makes no request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container } = render(<DebtContainer />);
    const before = savedText(container);
    expect(before).toContain("Total you owe");
    expect(before).toContain("Debt-free date");

    fireEvent.change(screen.getByRole("slider", { name: /Extra payment each month/i }), {
      target: { value: "300" },
    });
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Smallest balance first" }), { button: 0 });
    fireEvent.click(screen.getByRole("button", { name: /Use £420 left over/ }));

    expect(savedText(container)).toBe(before);
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
    expect(
      (screen.getByRole("button", { name: "Reset to saved figures" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("keeps fact inputs out of the zone: balances and APRs are edited in Your debts only", () => {
    render(<DebtContainer />);
    const zone = screen.getByRole("region", { name: "Model a change to your debts" });
    expect(within(zone).queryByRole("textbox", { name: /APR|balance|minimum/i })).toBeNull();
    expect(zone.textContent).not.toMatch(/sandbox|apply to my/i);
  });
});
