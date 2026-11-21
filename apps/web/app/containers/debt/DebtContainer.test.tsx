import { expectPageRules } from "@repo/ui/testing";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROMO_REVERT_ASSUMED_LINE } from "~/features/debt/components/DebtSummary/DebtSummary";
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

const rawLoader = vi.hoisted(() => ({ use: false, value: undefined as unknown }));

vi.mock("react-router", () => ({
  useLoaderData: () =>
    rawLoader.use
      ? rawLoader.value
      : {
          accounts: loaderState.accountsOverride
            ? loaderState.accountsOverride
            : loaderState.empty
              ? []
              : [
                  {
                    id: "acc-cc",
                    name: "Everyday credit card",
                    type: "Credit Card",
                    balance: 3000,
                    interestRate: 22.9,
                    monthlyContribution: 90,
                    monthlyContributionKnown: true,
                  },
                  {
                    id: "acc-loan",
                    name: "Car loan",
                    type: "Loan",
                    balance: 4500,
                    interestRate: 7.9,
                    monthlyContribution: 150,
                    monthlyContributionKnown: true,
                  },
                ],
          debtInputs: loaderState.debtInputs,
          userProfile: {},
        },
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

/** The what-if zone starts closed below the saved figures; open it from its named button. */
const openZone = () =>
  fireEvent.click(screen.getByRole("button", { name: "Show what-if: pay more each month" }));

/** Elements marked with data-testid (the test id query here reads the id attribute). */
const byDataTestId = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  if (!el) throw new Error(`No element with data-testid ${id}`);
  return el;
};

/** Delete lives in the edit dialog: open the row's one Edit control, then "Delete debt". */
const openDeleteFor = (name: string) => {
  fireEvent.click(screen.getByRole("button", { name: `Edit ${name}` }));
  fireEvent.click(
    within(screen.getByRole("dialog", { name: "Edit debt" })).getByRole("button", {
      name: "Delete debt",
    }),
  );
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
    expectPageRules(container, { maxNotSet: 0, projectionNotices: 0 });
    openZone();
    expectPageRules(container, { maxNotSet: 0, projectionNotices: 1 });
    expectPageRules(firstView(container), { maxFigures: 10, maxNotSet: 0 });
    expect(container.querySelectorAll("[data-list-row]")).toHaveLength(2);
  });

  it("meets the page rules without debts: h1, intro, one Add button, the MoneyHelper line", () => {
    withEmpty(() => {
      const { container } = render(<DebtContainer />);
      expectPageRules(container, { maxFigures: 0, maxNotSet: 0, projectionNotices: 0 });
      expect(screen.getByRole("heading", { level: 1, name: "Cards and loans" })).toBeDefined();
      expect(screen.getByRole("heading", { level: 2, name: "No debts added" })).toBeDefined();
      expect(
        screen.getByText(
          "Add a credit card, loan or overdraft to see when it would be paid off at your minimum payments.",
        ),
      ).toBeDefined();
      // One illustration in view: the page icon in the header, none in the empty state.
      expect(container.querySelectorAll("svg[data-scene]")).toHaveLength(1);
      expect(container.querySelector("header [data-scene=empty-debt]")).not.toBeNull();
      expect(screen.getAllByRole("button", { name: "Add a debt" })).toHaveLength(1);
      expect(screen.queryAllByRole("tab")).toHaveLength(0);
      expect(screen.queryByText("Total you owe")).toBeNull();
      expect(screen.queryByRole("region", { name: "Model a change to your debts" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Add a debt" }));
      expect(screen.getByRole("dialog", { name: "Add a debt" })).toBeDefined();
    });
  });

  it("shows the saved total as the hero and the debt-free date as the first KPI, an estimate", () => {
    render(<DebtContainer />);
    openZone();
    const hero = document.querySelector("[data-tone='hero']");
    expect(hero?.textContent).toContain("Total you owe");
    expect(hero?.textContent).toContain("£7,500");
    expect(screen.getAllByText("Debt-free date").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Estimate").length).toBe(1);
    // Out of the first view (hero and strip), available lower down in the modelling zone.
    expect(hero?.parentElement?.textContent ?? "").not.toMatch(/Interest over the next 12 months/);
    expect(screen.getByTestId("interest-this-year").textContent).toMatch(
      /^Interest over the next 12 months, at minimum payments£[\d,]+$/,
    );
  });

  it("missing APRs give one prompt with one button, and no 'Not set' cards", () => {
    withAccounts(
      [
        { id: "acc-cc", name: "Everyday card", type: "Credit Card", balance: 3000 },
        { id: "acc-loan", name: "Car loan", type: "Loan", balance: 4500 },
      ],
      () => {
        const { container } = render(<DebtContainer />);
        openZone();
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
          name: "Everyday card",
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
      [
        {
          id: "acc-cc",
          name: "Everyday card",
          type: "Credit Card",
          balance: 3000,
          interestRate: 20,
        },
      ],
      () => {
        render(<DebtContainer />);
        expect(screen.getByText(/Minimum payments, some are estimates/)).toBeDefined();
      },
    );
  });

  it("passes what the budget leaves over, not a hard-coded fallback", () => {
    render(<DebtContainer />);
    openZone();
    expect(screen.getByRole("button", { name: "Use the £420 left over" })).toBeDefined();
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
      openZone();
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
    expect(screen.queryByRole("button", { name: /^Delete Car loan/ })).toBeNull();
    openDeleteFor("Car loan");
    expect(screen.queryByRole("dialog", { name: "Edit debt" })).toBeNull();

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(/Delete Car loan\?/)).toBeDefined();
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
    fireEvent.click(screen.getByRole("button", { name: "Edit Everyday credit card" }));
    fireEvent.change(screen.getByLabelText(/^Interest rate/), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(fetcherState.submit).toHaveBeenCalledWith(
      { intent: "updateDebt", accountId: "acc-cc", interestRate: "" },
      { method: "POST", action: "/app/debt" },
    );
  });

  it("does not submit when the delete confirmation is cancelled", () => {
    render(<DebtContainer />);
    openDeleteFor("Car loan");
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }),
    );
    expect(fetcherState.submit).not.toHaveBeenCalled();
  });

  it("returns focus to that debt's Edit button when the delete confirmation is cancelled", async () => {
    render(<DebtContainer />);
    // As in a browser, each button takes focus when it is clicked.
    const edit = screen.getByRole("button", { name: "Edit Car loan" });
    edit.focus();
    fireEvent.click(edit);
    const remove = within(screen.getByRole("dialog", { name: "Edit debt" })).getByRole("button", {
      name: "Delete debt",
    });
    remove.focus();
    fireEvent.click(remove);
    const cancel = within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" });
    // Initial focus is on the confirm button; Cancel is one Tab away.
    const confirm = within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Delete debt",
    });
    await waitFor(() => expect(document.activeElement).toBe(confirm));
    cancel.focus();
    fireEvent.click(cancel);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit Car loan" })),
    );
    // Still there after the dialog's own focus return has run.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit Car loan" }));
  });

  it("after a successful delete, focus lands on the Your debts heading", async () => {
    const { rerender } = render(<DebtContainer />);
    openDeleteFor("Car loan");
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete debt" }),
    );
    // The action succeeds and the loader revalidates without the deleted debt.
    loaderState.accountsOverride = [
      {
        id: "acc-cc",
        name: "Everyday credit card",
        type: "Credit Card",
        balance: 3000,
        interestRate: 22.9,
        monthlyContribution: 90,
        monthlyContributionKnown: true,
      },
    ];
    fetcherState.data = { success: true };
    rerender(<DebtContainer />);
    const heading = () => screen.getByRole("heading", { name: "Your debts", level: 2 });
    await waitFor(() => expect(document.activeElement).toBe(heading()));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.activeElement).toBe(heading());
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("after the last debt is deleted, focus lands on the empty state's Add a debt", async () => {
    loaderState.accountsOverride = [
      {
        id: "acc-loan",
        name: "Car loan",
        type: "Loan",
        balance: 4500,
        interestRate: 7.9,
        monthlyContribution: 150,
        monthlyContributionKnown: true,
      },
    ];
    const { rerender } = render(<DebtContainer />);
    openDeleteFor("Car loan");
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete debt" }),
    );
    loaderState.accountsOverride = [];
    fetcherState.data = { success: true };
    rerender(<DebtContainer />);
    const add = () => screen.getByRole("button", { name: "Add a debt" });
    await waitFor(() => expect(document.activeElement).toBe(add()));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.activeElement).toBe(add());
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
    openDeleteFor("Car loan");
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
    openZone();

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
      { id: "acc-cc", name: "Everyday card", type: "Credit Card", balance: 3000, interestRate: 20 },
    ];
    render(<DebtContainer />);
    const region = screen.getByRole("status");
    openZone();
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

  it("starts closed with a one-line summary, and opens from its named button", () => {
    render(<DebtContainer />);
    const toggle = screen.getByRole("button", { name: "Show what-if: pay more each month" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText(/^Starts from your debts of/)).toBeDefined();
    expect(screen.queryByRole("slider")).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("slider")).toHaveLength(1);
  });

  it("has one tool: one slider, one payoff-order Tabs, starting at £0, with no repeated saved figures", () => {
    render(<DebtContainer />);
    openZone();
    const zone = screen.getByRole("region", { name: "Model a change to your debts" });
    expect(zone.textContent).toContain("Illustration, not saved");
    expect(zone.textContent).not.toContain("Starting from your figures");
    expect(within(zone).getAllByRole("slider")).toHaveLength(1);
    expect(within(zone).getAllByRole("tablist")).toHaveLength(1);
    const slider = within(zone).getByRole("slider", { name: /Extra payment each month/i });
    expect((slider as HTMLInputElement).value).toBe("0");
    expect(within(zone).queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
  });

  it("'Update your details' moves focus to the saved debts list", () => {
    render(<DebtContainer />);
    openZone();
    fireEvent.click(screen.getByRole("button", { name: "Update your details" }));
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Your debts", level: 2 }),
    );
    expect(fetcherState.submit).not.toHaveBeenCalled();
  });

  it("changing the extra payment or order leaves the hero and KPI strip unchanged and makes no request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container } = render(<DebtContainer />);
    openZone();
    const before = savedText(container);
    expect(before).toContain("Total you owe");
    expect(before).toContain("Debt-free date");

    fireEvent.change(screen.getByRole("slider", { name: /Extra payment each month/i }), {
      target: { value: "300" },
    });
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Smallest balance first" }), { button: 0 });
    fireEvent.click(screen.getByRole("button", { name: /Use the £420 left over/ }));

    expect(savedText(container)).toBe(before);
    expect(document.querySelectorAll("[data-tone='hero']")).toHaveLength(1);
    expect(fetcherState.submit).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("offers Reset to saved figures once modified and restores £0", () => {
    render(<DebtContainer />);
    openZone();
    const slider = () =>
      screen.getByRole("slider", { name: /Extra payment each month/i }) as HTMLInputElement;
    fireEvent.change(slider(), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(slider().value).toBe("0");
    expect(screen.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
  });

  it("keeps fact inputs out of the zone: balances and APRs are edited in Your debts only", () => {
    render(<DebtContainer />);
    openZone();
    const zone = screen.getByRole("region", { name: "Model a change to your debts" });
    expect(within(zone).queryByRole("textbox", { name: /APR|balance|minimum/i })).toBeNull();
    expect(zone.textContent).not.toMatch(/sandbox|apply to my/i);
  });
});

describe("DebtContainer editing a joint loan (SD-7)", () => {
  beforeEach(() => fetcherState.submit.mockClear());

  it("edits the whole stored payment and saves the typed figure whole", () => {
    // £300 a month stored, joint at 50%: the page shows the share, 300 x 0.5 = £150, but the
    // form starts from £300 and a typed £320 is stored as 320.
    withAccounts(
      [
        {
          id: "acc-joint",
          name: "Joint loan",
          type: "Loan",
          balance: 6000,
          interestRate: 6,
          monthlyContribution: 300,
          ownership: "joint",
          sharePercent: 50,
        },
      ],
      () => {
        render(<DebtContainer />);
        fireEvent.click(screen.getByRole("button", { name: "Edit Joint loan" }));
        const minimum = screen.getByLabelText(/^Minimum payment each month/) as HTMLInputElement;
        expect(minimum.value.replace(/[^0-9.]/g, "")).toBe("300");
        fireEvent.change(minimum, { target: { value: "320" } });
        fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
        expect(fetcherState.submit.mock.calls[0]?.[0]).toMatchObject({
          intent: "updateDebt",
          accountId: "acc-joint",
          monthlyContribution: "320",
        });
      },
    );
  });
});

describe("DebtContainer saved figures and loader data", () => {
  beforeEach(() => {
    fetcherState.submit.mockReset();
    fetcherState.data = undefined;
    loaderState.accountsOverride = null;
  });
  afterEach(() => {
    rawLoader.use = false;
    rawLoader.value = undefined;
  });
  const withRaw = (value: unknown) => {
    rawLoader.use = true;
    rawLoader.value = value;
  };
  const kpiValue = (label: string) =>
    Array.from(document.querySelectorAll<HTMLElement>("[data-kpi-card]"))
      .find((card) => card.textContent?.includes(label))
      ?.querySelector("[data-kpi-value]")?.textContent ?? "";

  it("shows the empty state when the loader returns nothing", () => {
    withRaw(undefined);
    render(<DebtContainer />);
    expect(screen.getByRole("heading", { level: 2, name: "No debts added" })).toBeDefined();
  });

  it("shows the empty state when the loader has no accounts", () => {
    withRaw({ debtInputs: loaderState.debtInputs });
    render(<DebtContainer />);
    expect(screen.getByRole("heading", { level: 2, name: "No debts added" })).toBeDefined();
  });

  it("works without budget figures: the total is added up from the debts", () => {
    withRaw({
      accounts: [
        {
          id: "a",
          name: "Card",
          type: "Credit Card",
          balance: -3000,
          interestRate: 20,
          monthlyContribution: 90,
        },
        {
          id: "b",
          name: "Loan",
          type: "Loan",
          balance: -4500,
          interestRate: 8,
          monthlyContribution: 150,
        },
      ],
    });
    render(<DebtContainer />);
    // 3,000 + 4,500 = 7,500 owed.
    expect(document.querySelector("[data-tone='hero']")?.textContent).toContain("£7,500");
    openZone();
    expect(document.querySelector("[data-notice='projection']")?.textContent).toContain(
      "We do not know what you have left over each month",
    );
  });

  it("the summary line adds up the minimum payments", () => {
    render(<DebtContainer />);
    // £90 + £150 = £240 a month; 3,000 + 4,500 = £7,500 owed.
    expect(byDataTestId("scenario-zone-summary").textContent).toBe(
      "Starts from your debts of £7,500 and minimum payments of £240 a month.",
    );
  });

  it("the chart table starts from what is owed", () => {
    render(<DebtContainer />);
    openZone();
    const zone = screen.getByRole("region", { name: "Model a change to your debts" });
    fireEvent.click(within(zone).getByRole("button", { name: /Show data/ }));
    const table = within(zone).getByRole("table", { name: /Debt remaining every 12 months/ });
    // Month 0 of the schedule is the whole £7,500 owed (3,000 + 4,500).
    const firstRow = within(table).getAllByRole("row")[1] as HTMLElement;
    expect(firstRow.textContent).toContain("£7,500");
  });

  it("shows what the budget leaves out next to the left-over figure", () => {
    loaderState.debtInputs = {
      monthlySurplus: 420,
      monthlySurplusLeavesOut: "This leaves out your pension contributions.",
      liquidSavings: 2000,
      monthlyEssentialExpenses: 1500,
    } as typeof loaderState.debtInputs;
    try {
      render(<DebtContainer />);
      openZone();
      expect(byDataTestId("pay-extra-left-over-note").textContent).toBe(
        "This leaves out your pension contributions.",
      );
    } finally {
      loaderState.debtInputs = {
        monthlySurplus: 420,
        liquidSavings: 2000,
        monthlyEssentialExpenses: 1500,
      };
    }
  });

  it("marks minimums as estimates when only some debts have none saved", () => {
    withAccounts(
      [
        { id: "a", name: "Card", type: "Credit Card", balance: 3000, interestRate: 20 },
        {
          id: "b",
          name: "Loan",
          type: "Loan",
          balance: 4500,
          interestRate: 8,
          monthlyContribution: 150,
          monthlyContributionKnown: true,
        },
      ],
      () => {
        render(<DebtContainer />);
        expect(screen.getByText(/Minimum payments, some are estimates/)).toBeDefined();
        openZone();
        // With an estimated minimum the zone leaves out the interest row.
        expect(screen.queryByTestId("interest-this-year")).toBeNull();
      },
    );
  });

  it("says a debt the minimums never pay off is not paid off", () => {
    // £10,000 at 30% APR: interest is about 10,000 x 0.30 / 12 = £250 a month, more than the
    // £50 minimum, so the balance never falls.
    withAccounts(
      [
        {
          id: "a",
          name: "Card",
          type: "Credit Card",
          balance: 10000,
          interestRate: 30,
          monthlyContribution: 50,
          monthlyContributionKnown: true,
        },
      ],
      () => {
        render(<DebtContainer />);
        expect(kpiValue("Debt-free date")).toBe("Not paid off");
      },
    );
  });

  it("shows a debt-free date when the minimums pay the debts off", () => {
    render(<DebtContainer />);
    expect(kpiValue("Debt-free date")).not.toBe("Not paid off");
    expect(kpiValue("Debt-free date")).not.toBe("");
  });

  it("the debt-free date follows new loader data after a reload", () => {
    const { rerender } = render(<DebtContainer />);
    const before = kpiValue("Debt-free date");
    // £100 at 10% with £50 a month is paid off within three months, far sooner than the
    // £7,500 of the first view.
    loaderState.accountsOverride = [
      {
        id: "a",
        name: "Card",
        type: "Credit Card",
        balance: 100,
        interestRate: 10,
        monthlyContribution: 50,
        monthlyContributionKnown: true,
      },
    ];
    rerender(<DebtContainer />);
    expect(kpiValue("Debt-free date")).not.toBe(before);
  });

  it("the illustration follows the extra payment", () => {
    render(<DebtContainer />);
    const toggle = screen.getByRole("button", { name: "Show what-if: pay more each month" });
    fireEvent.click(toggle);
    const slider = screen.getByRole("slider", { name: /Extra payment each month/i });
    fireEvent.change(slider, { target: { value: "100" } });
    fireEvent.click(toggle);
    const at100 = byDataTestId("scenario-zone-summary").textContent;
    fireEvent.click(toggle);
    fireEvent.change(screen.getByRole("slider", { name: /Extra payment each month/i }), {
      target: { value: "500" },
    });
    fireEvent.click(toggle);
    const at500 = byDataTestId("scenario-zone-summary").textContent;
    // More each month pays the debts off sooner with less interest, so the sentence changes.
    expect(at100).toMatch(/^Your illustration: £100 extra a month, debt-free by /);
    expect(at500).toMatch(/^Your illustration: £500 extra a month, debt-free by /);
    expect(at500?.replace("£500", "")).not.toBe(at100?.replace("£100", ""));
  });

  it("starts on highest rate first, and the payoff order changes the illustration", () => {
    // By hand: highest rate first pays the 25% card first, smallest balance first pays the
    // £500 loan first, so the two orders pay different interest.
    withAccounts(
      [
        {
          id: "a",
          name: "Card",
          type: "Credit Card",
          balance: 6000,
          interestRate: 25,
          monthlyContribution: 150,
          monthlyContributionKnown: true,
        },
        {
          id: "b",
          name: "Loan",
          type: "Loan",
          balance: 500,
          interestRate: 5,
          monthlyContribution: 25,
          monthlyContributionKnown: true,
        },
      ],
      () => {
        render(<DebtContainer />);
        const toggle = screen.getByRole("button", { name: "Show what-if: pay more each month" });
        fireEvent.click(toggle);
        expect(
          screen.getByRole("tab", { name: "Highest rate first" }).getAttribute("aria-selected"),
        ).toBe("true");
        fireEvent.change(screen.getByRole("slider", { name: /Extra payment each month/i }), {
          target: { value: "200" },
        });
        fireEvent.click(toggle);
        const highestRate = byDataTestId("scenario-zone-summary").textContent;
        fireEvent.click(toggle);
        fireEvent.mouseDown(screen.getByRole("tab", { name: "Smallest balance first" }), {
          button: 0,
        });
        fireEvent.click(toggle);
        const smallestBalance = byDataTestId("scenario-zone-summary").textContent;
        expect(smallestBalance).toMatch(/^Your illustration: £200 extra a month/);
        expect(smallestBalance).not.toBe(highestRate);
        // Paying the highest rate first never costs more interest than any other order, so the
        // order shown first must be the cheaper of the two here.
        const interest = (text: string | null) =>
          Number(/total interest £([\d,]+)/.exec(text ?? "")?.[1]?.replace(/,/g, ""));
        expect(interest(highestRate)).toBeLessThan(interest(smallestBalance));
      },
    );
  });

  it("does not move focus when the page opens", async () => {
    render(<DebtContainer />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.activeElement).toBe(document.body);
  });

  it("a failed delete shows its message once, in the confirmation", () => {
    const { rerender } = render(<DebtContainer />);
    openDeleteFor("Car loan");
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete debt" }),
    );
    fetcherState.data = { success: false, error: "We couldn't reach the server." };
    rerender(<DebtContainer />);
    expect(screen.getAllByText("We couldn't reach the server.")).toHaveLength(1);
  });

  it("closing the add dialog with Cancel closes it", () => {
    render(<DebtContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Add a debt" }));
    const dialog = screen.getByRole("dialog", { name: "Add a debt" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Add a debt" })).toBeNull();
  });
});

describe("DebtContainer headline announcement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loaderState.accountsOverride = null;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays empty when only the payoff order changes", () => {
    render(<DebtContainer />);
    const region = screen.getByRole("status");
    openZone();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Smallest balance first" }), { button: 0 });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(region.textContent).toBe("");
  });

  it("stays empty when the extra payment still never pays the debt off", () => {
    // £10,000 at 30%: about £250 interest a month, more than £50 minimum plus £100 extra.
    loaderState.accountsOverride = [
      {
        id: "a",
        name: "Card",
        type: "Credit Card",
        balance: 10000,
        interestRate: 30,
        monthlyContribution: 50,
        monthlyContributionKnown: true,
      },
    ];
    render(<DebtContainer />);
    const region = screen.getByRole("status");
    openZone();
    fireEvent.change(screen.getAllByRole("slider")[0] as HTMLElement, {
      target: { value: "100" },
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(region.textContent).toBe("");
  });
});

describe("DebtContainer adding and editing", () => {
  beforeEach(() => {
    fetcherState.submit.mockReset();
    fetcherState.data = undefined;
    loaderState.accountsOverride = null;
  });

  const card = {
    id: "acc-cc",
    name: "Everyday card",
    type: "Credit Card",
    balance: -3000,
    interestRate: 20,
    monthlyContribution: 90,
    monthlyContributionKnown: true,
    creditLimit: 5000,
    promoZeroPercentUntil: "2027-06-30",
    updatedAt: "2026-11-01T10:00:00.000Z",
  };
  const jointLoan = {
    id: "acc-joint",
    name: "Joint loan",
    type: "Loan",
    balance: -6000,
    interestRate: 6,
    monthlyContribution: 300,
    monthlyContributionKnown: true,
    ownership: "joint",
    sharePercent: 40,
    updatedAt: "2026-11-02T10:00:00.000Z",
  };
  const editDialog = (name: string) => {
    fireEvent.click(screen.getByRole("button", { name: `Edit ${name}` }));
    return within(screen.getByRole("dialog", { name: "Edit debt" }));
  };
  const save = (dialog: ReturnType<typeof within>) =>
    fireEvent.click(dialog.getByRole("button", { name: "Save changes" }));
  const sent = () => fetcherState.submit.mock.calls[0]?.[0] as Record<string, string>;
  const cleanupAndRender = () => {
    cleanup();
    render(<DebtContainer />);
  };

  it("adds a debt with its rate, minimum, credit limit and 0% end date", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 14));
    try {
      render(<DebtContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Add a debt" }));
      const dialog = within(screen.getByRole("dialog", { name: "Add a debt" }));
      fireEvent.change(dialog.getByLabelText(/^Name of the debt/), {
        target: { value: "Store card" },
      });
      fireEvent.change(dialog.getByLabelText(/^Balance you owe/), { target: { value: "1000" } });
      fireEvent.change(dialog.getByLabelText(/^Interest rate/), { target: { value: "19.9" } });
      fireEvent.change(dialog.getByLabelText(/^Minimum payment each month/), {
        target: { value: "40" },
      });
      fireEvent.change(dialog.getByLabelText(/^Credit limit/), { target: { value: "2000" } });
      fireEvent.click(dialog.getByRole("button", { name: /^0% interest period ends/ }));
      fireEvent.click(screen.getByRole("button", { name: "20 Nov 2026" }));
      const form = dialog.getByLabelText(/^Name of the debt/).closest("form") as HTMLFormElement;
      fireEvent.submit(form);
      expect(sent()).toMatchObject({
        intent: "createDebt",
        name: "Store card",
        balance: "-1000",
        interestRate: "19.9",
        monthlyContribution: "40",
        creditLimit: "2000",
        promoZeroPercentUntil: "2026-11-20",
      });
      // A sole card: no subtype and no ownership fields.
      expect(Object.keys(sent())).not.toContain("accountSubtype");
      expect(Object.keys(sent())).not.toContain("ownership");
    } finally {
      vi.useRealTimers();
    }
  });

  it("adds a joint car finance debt with its kind and share", () => {
    render(<DebtContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Add a debt" }));
    const dialog = within(screen.getByRole("dialog", { name: "Add a debt" }));
    fireEvent.change(dialog.getByLabelText(/^Name of the debt/), { target: { value: "Car" } });
    fireEvent.change(dialog.getByLabelText(/^Type/), { target: { value: "car_finance" } });
    fireEvent.change(dialog.getByLabelText(/^Balance you owe/), { target: { value: "8000" } });
    fireEvent.change(dialog.getByLabelText("Ownership"), { target: { value: "joint" } });
    fireEvent.change(dialog.getByLabelText(/^Your share/), { target: { value: "40" } });
    fireEvent.submit(dialog.getByLabelText(/^Name of the debt/).closest("form") as HTMLFormElement);
    expect(sent()).toMatchObject({
      intent: "createDebt",
      accountSubtype: "car_finance",
      ownership: "joint",
      sharePercent: "40",
    });
  });

  it("the edit form opens on a joint debt's whole balance, payment, ownership and share", () => {
    withAccounts([card, jointLoan], () => {
      render(<DebtContainer />);
      const dialog = editDialog("Joint loan");
      const number = (label: RegExp) =>
        (dialog.getByLabelText(label) as HTMLInputElement).value.replace(/[^0-9.]/g, "");
      // The row shows the 40% share; the form holds the whole stored figures.
      expect(number(/^Balance you owe/)).toBe("6000");
      expect(number(/^Minimum payment each month/)).toBe("300");
      expect((dialog.getByLabelText("Ownership") as HTMLSelectElement).value).toBe("joint");
      expect(number(/^Your share/)).toBe("40");
    });
  });

  it("a stored minimum of £0 opens as no minimum saved", () => {
    withAccounts([{ ...card, monthlyContribution: 0, monthlyContributionKnown: false }], () => {
      render(<DebtContainer />);
      const dialog = editDialog("Everyday card");
      expect((dialog.getByLabelText(/^Minimum payment each month/) as HTMLInputElement).value).toBe(
        "",
      );
    });
  });

  it("a plain add sends blank optional fields", () => {
    render(<DebtContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Add a debt" }));
    const dialog = within(screen.getByRole("dialog", { name: "Add a debt" }));
    fireEvent.change(dialog.getByLabelText(/^Name of the debt/), { target: { value: "Card" } });
    fireEvent.change(dialog.getByLabelText(/^Balance you owe/), { target: { value: "500" } });
    fireEvent.submit(dialog.getByLabelText(/^Name of the debt/).closest("form") as HTMLFormElement);
    expect(sent()).toMatchObject({ creditLimit: "", promoZeroPercentUntil: "" });
  });

  it("says when a 0% deal's end is followed by an assumed rate, and only then", () => {
    // A 0% card whose deal ends next month, with no rate saved for after it: the schedule runs
    // past the end, so the assumed rate applies.
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0));
    const promoEnd = end.toISOString().slice(0, 10);
    withAccounts(
      [{ ...card, interestRate: 0, monthlyContribution: 50, promoZeroPercentUntil: promoEnd }],
      () => {
        render(<DebtContainer />);
        expect(screen.getByText(PROMO_REVERT_ASSUMED_LINE)).toBeDefined();
      },
    );
    cleanup();
    render(<DebtContainer />);
    expect(screen.queryByText(PROMO_REVERT_ASSUMED_LINE)).toBeNull();
  });

  it("an edit with nothing changed sends nothing", () => {
    withAccounts([card], () => {
      render(<DebtContainer />);
      save(editDialog("Everyday card"));
      expect(fetcherState.submit).not.toHaveBeenCalled();
    });
  });

  it("an edited name is sent alone, with the saved version", () => {
    withAccounts([jointLoan, card], () => {
      render(<DebtContainer />);
      const dialog = editDialog("Everyday card");
      fireEvent.change(dialog.getByLabelText(/^Name of the debt/), {
        target: { value: "Travel card" },
      });
      save(dialog);
      expect(sent()).toEqual({
        intent: "updateDebt",
        accountId: "acc-cc",
        name: "Travel card",
        version: "2026-11-01T10:00:00.000Z",
      });
      // No other key at all, not even an empty one.
      expect(Object.keys(sent()).sort()).toEqual(["accountId", "intent", "name", "version"]);
    });
  });

  it("an edited balance is sent as the amount owed, stored negative", () => {
    withAccounts([card], () => {
      render(<DebtContainer />);
      const dialog = editDialog("Everyday card");
      fireEvent.change(dialog.getByLabelText(/^Balance you owe/), { target: { value: "2500" } });
      save(dialog);
      expect(sent()).toMatchObject({ accountId: "acc-cc", balance: "-2500" });
      expect(Object.keys(sent())).not.toContain("interestRate");
    });
  });

  it("an edited rate and minimum are sent as typed, and cleared ones as blanks", () => {
    withAccounts([card], () => {
      render(<DebtContainer />);
      const dialog = editDialog("Everyday card");
      fireEvent.change(dialog.getByLabelText(/^Interest rate/), { target: { value: "18.5" } });
      fireEvent.change(dialog.getByLabelText(/^Minimum payment each month/), {
        target: { value: "120" },
      });
      save(dialog);
      expect(sent()).toMatchObject({ interestRate: "18.5", monthlyContribution: "120" });
    });
    fetcherState.submit.mockReset();
    withAccounts([card], () => {
      cleanupAndRender();
      const dialog = editDialog("Everyday card");
      fireEvent.change(dialog.getByLabelText(/^Minimum payment each month/), {
        target: { value: "" },
      });
      save(dialog);
      expect(sent()).toMatchObject({ monthlyContribution: "" });
    });
  });

  it("an edited credit limit and 0% end date are sent; a cleared limit is sent blank", () => {
    withAccounts([card], () => {
      render(<DebtContainer />);
      const dialog = editDialog("Everyday card");
      fireEvent.change(dialog.getByLabelText(/^Credit limit/), { target: { value: "6000" } });
      fireEvent.click(dialog.getByRole("button", { name: /^0% interest period ends/ }));
      fireEvent.click(screen.getByRole("button", { name: "15 Jun 2027" }));
      save(dialog);
      expect(sent()).toMatchObject({ creditLimit: "6000", promoZeroPercentUntil: "2027-06-15" });
    });
    fetcherState.submit.mockReset();
    withAccounts([card], () => {
      cleanupAndRender();
      const dialog = editDialog("Everyday card");
      fireEvent.change(dialog.getByLabelText(/^Credit limit/), { target: { value: "" } });
      save(dialog);
      expect(sent()).toMatchObject({ creditLimit: "" });
    });
  });

  it("making a debt joint sends the ownership and share; making it sole sends no share", () => {
    withAccounts([card], () => {
      render(<DebtContainer />);
      const dialog = editDialog("Everyday card");
      fireEvent.change(dialog.getByLabelText("Ownership"), { target: { value: "joint" } });
      fireEvent.change(dialog.getByLabelText(/^Your share/), { target: { value: "40" } });
      save(dialog);
      expect(sent()).toMatchObject({ ownership: "joint", sharePercent: "40" });
    });
    fetcherState.submit.mockReset();
    withAccounts([jointLoan], () => {
      cleanupAndRender();
      const dialog = editDialog("Joint loan");
      fireEvent.change(dialog.getByLabelText("Ownership"), { target: { value: "sole" } });
      save(dialog);
      expect(sent()).toMatchObject({ ownership: "sole" });
      expect(Object.keys(sent())).not.toContain("sharePercent");
    });
  });

  it("a saved edit closes the dialog; a failed one keeps it open with the message", async () => {
    loaderState.accountsOverride = [card];
    const { rerender } = render(<DebtContainer />);
    let dialog = editDialog("Everyday card");
    fireEvent.change(dialog.getByLabelText(/^Name of the debt/), { target: { value: "A" } });
    save(dialog);
    fetcherState.data = { success: true };
    rerender(<DebtContainer />);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Edit debt" })).toBeNull());

    fetcherState.submit.mockReset();
    dialog = editDialog("Everyday card");
    fireEvent.change(dialog.getByLabelText(/^Name of the debt/), { target: { value: "B" } });
    save(dialog);
    fetcherState.data = { success: false, error: "That debt changed elsewhere." };
    rerender(<DebtContainer />);
    await waitFor(() =>
      expect(
        within(screen.getByRole("dialog", { name: "Edit debt" })).getByText(
          "That debt changed elsewhere.",
        ),
      ).toBeDefined(),
    );

    // Trying again: the dialog waits for this save's own answer before it closes.
    fireEvent.change(dialog.getByLabelText(/^Name of the debt/), { target: { value: "C" } });
    save(dialog);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByRole("dialog", { name: "Edit debt" })).toBeDefined();
  });

  it("a cancelled failed delete does not carry its message to the next one", () => {
    loaderState.accountsOverride = null;
    const { rerender } = render(<DebtContainer />);
    openDeleteFor("Car loan");
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete debt" }),
    );
    fetcherState.data = { success: false, error: "We couldn't reach the server." };
    rerender(<DebtContainer />);
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }),
    );
    openDeleteFor("Everyday credit card");
    expect(
      within(screen.getByRole("alertdialog")).queryByText("We couldn't reach the server."),
    ).toBeNull();
  });
});
