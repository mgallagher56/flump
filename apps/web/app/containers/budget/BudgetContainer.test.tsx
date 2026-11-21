import { countFigures, expectPageRules } from "@repo/ui/testing";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateProfile = vi.fn().mockResolvedValue({});
const mockRevalidate = vi.fn();
const mockMarkChecklistStep = vi.fn().mockResolvedValue({});

let mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

let mockLoaderData: any = {
  accounts: [
    { id: "acc-1", name: "Monzo", type: "Current", balance: 4500 },
    { id: "acc-2", name: "Halifax Mortgage", type: "Mortgage", balance: -210000 },
  ],
  accountDetails: [{ account_id: "acc-1", month: 5, year: 2026, value: 4500 }],
  budgetEntries: [],
  userProfile: {
    customBudgetCategories: ["subscriptions"],
    hasResetFinancialData: true,
    monthlyTakeHome: 3500,
  },
};

const mockProfileData = {
  customBudgetCategories: ["subscriptions"],
  hasResetFinancialData: true,
};

vi.mock("react-router", () => ({
  Link: ({ children, to, ...rest }: { children: ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useLoaderData: () => mockLoaderData,
  useNavigate: () => vi.fn(),
  // Saved writes reload saved data (audit slice 8).
  useRevalidator: () => ({ revalidate: mockRevalidate, state: "idle" }),
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

vi.mock("~/hooks/useUserProfile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/hooks/useUserProfile")>();
  return {
    ...actual,
    useUserProfile: () => ({
      profile: mockProfileData,
      updateProfile: mockUpdateProfile,
      markChecklistStep: mockMarkChecklistStep,
    }),
  };
});

// Pass-through spies, so a test can make one request fail without stubbing the transport.
vi.mock("~/services/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/services/api-client")>();
  return {
    ...actual,
    apiFetch: vi.fn(actual.apiFetch),
    apiFetchAll: vi.fn(actual.apiFetchAll),
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

import { ToastProvider } from "@repo/ui";
import { apiFetch, apiFetchAll } from "~/services/api-client";
import { BackendError, kindFromStatus } from "~/services/backend-error";
import BudgetContainer from "./BudgetContainer";

const baseLoaderData = mockLoaderData;

const row = (overrides: Record<string, unknown>) => ({
  id: "b-1",
  userId: "u1",
  name: "Mortgage",
  category: "housing",
  amount: 1200,
  frequency: "monthly",
  isIncome: false,
  isPrimaryIncome: false,
  isEssential: true,
  notes: null,
  isDefault: false,
  createdAt: "",
  updatedAt: "",
  ...overrides,
});

const withBudget = [
  row({}),
  row({
    id: "b-2",
    name: "Salary",
    category: "income",
    amount: 4000,
    isIncome: true,
    isPrimaryIncome: true,
    isEssential: false,
  }),
  row({ id: "b-3", name: "Eating out", category: "expenses", amount: 300, isEssential: false }),
];

describe("BudgetContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoaderData = baseLoaderData;
    mockSearchParams = new URLSearchParams();
    vi.stubGlobal("ENV", { VITE_API_URL: "https://api.example.test" });
    global.fetch = vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify([
            {
              id: "b-1",
              name: "Rent",
              category: "housing",
              amount: 1200,
              frequency: "monthly",
              isIncome: false,
            },
          ]),
          { status: 200 },
        ),
    ) as any;
  });

  it("with no budget: one Add common budget items button, one prompt, no hero and no notice", () => {
    const { container } = render(<BudgetContainer />);
    expect(screen.getByRole("heading", { level: 1, name: "Your budget" })).toBeDefined();
    // One call to action, named as on the filled page; no header action (P52).
    const buttons = screen.getAllByRole("button", { name: /budget|common/i });
    expect(buttons.map((b) => b.textContent)).toEqual(["Add common budget items"]);
    expect(screen.queryByTestId("setup-wizard-btn")).toBeNull();
    expect(screen.getByText("No budget yet")).toBeDefined();
    expect(container.querySelector('[data-tone="hero"]')).toBeNull();
    expect(screen.queryByTestId("budget-tab-subscriptions")).toBeNull();
    // Debt help is the same line for every user.
    expect(screen.getByRole("link", { name: /MoneyHelper/ })).toBeDefined();
    expectPageRules(container, { maxFigures: 4, maxNotSet: 1, projectionNotices: 0 });
  });

  it("with a budget: Edit budget, the hero and 2 KPIs first, one list, one zone with the notice", () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    const { container } = render(<BudgetContainer />);
    expect(screen.getByRole("button", { name: "Edit budget" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Set up your budget" })).toBeNull();
    const hero = screen.getByTestId("hero-figure");
    expect(hero.textContent).toContain("Left over each month");
    // 4,000 - 1,200 - 300
    expect(hero.querySelector('[data-figure="budget.surplus"]')?.textContent).toBe("£2,500");
    // First view: the hero (with its weekly sub-line) and the strip of 2, 4 figures at most.
    expect(countFigures(hero)).toBeLessThanOrEqual(2);
    const firstView = hero.parentElement as HTMLElement;
    expect(within(firstView).getByText("Money in each month")).toBeDefined();
    expect(within(firstView).getByText("Going out each month")).toBeDefined();
    expect(within(firstView).queryByText("Breathing room")).toBeNull();
    expect(within(firstView).queryByText("Bills and essentials")).toBeNull();
    expect(within(firstView).queryByText("Flexible spending")).toBeNull();
    expectPageRules(firstView, { maxFigures: 4, maxNotSet: 1 });
    // Income is money in, not somewhere money goes.
    expect(screen.getByRole("heading", { name: "Where your money goes" })).toBeDefined();
    expect(screen.queryByTestId("budget-category-income")).toBeNull();
    // No donut, no pill nav, no fixed and flexible cards, no separate details card.
    expect(screen.queryByRole("figure", { name: /Expense breakdown/ })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Budget sections" })).toBeNull();
    expect(screen.queryByText("Fixed and flexible")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Your details" })).toBeNull();
    // Categories are added in Edit budget, so the read-only list has no Add category.
    expect(screen.queryByRole("button", { name: "Add category" })).toBeNull();
    // The zone starts closed below the saved Breathing room figure, with a one-line summary
    // (owner item 4, UX S11).
    const drawer = screen.getByRole("button", {
      name: "Show what-if: redundancy pay, a spending cut",
    });
    expect(drawer.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("runway-result")).toBeNull();
    expect(screen.getByText(/^Starts from your savings of/)).toBeDefined();
    fireEvent.click(drawer);
    expect(drawer.getAttribute("aria-expanded")).toBe("true");
    const zone = screen.getByRole("region", { name: "Model a change to your budget" });
    // Breathing room is a saved figure: its own section, one result card, outside the zone
    // (owner ruling 15 November 2026, UX-GUIDELINES S10).
    const room = screen.getByRole("region", { name: "Breathing room" });
    expect(zone.contains(room)).toBe(false);
    expect(room.contains(zone)).toBe(false);
    expect(within(room).getAllByRole("group")).toHaveLength(1);
    expect(room.querySelector('[data-figure="monthsOfCover"]')).not.toBeNull();
    expect(zone.querySelector('[data-figure="monthsOfCover"]')).toBeNull();
    // The zone shows only the illustrated result, in its one result card, after the saved section.
    expect(within(zone).getAllByRole("group")).toHaveLength(1);
    expect(
      within(zone).getByRole("group", { name: "Breathing room in this illustration" }),
    ).toBeDefined();
    expect(room.compareDocumentPosition(zone) & 4).toBeTruthy();
    expect(screen.getByRole("link", { name: /MoneyHelper/ })).toBeDefined();
    expectPageRules(container, { maxNotSet: 1, projectionNotices: 1 });
    // The hero and strip come before the list and the zone, and nothing sits above the h1.
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.compareDocumentPosition(hero) & 4).toBeTruthy();
  });

  // Audit slice 5 (link L34): safe to spend starts from the budget's income, as left over does,
  // so the typed £4,000 salary line is enough with no take-home saved.
  it("with take-home pay unknown, safe to spend starts from the typed income line", () => {
    mockLoaderData = {
      ...baseLoaderData,
      userProfile: { ...baseLoaderData.userProfile, monthlyTakeHome: null },
      budgetEntries: withBudget,
    };
    render(<BudgetContainer />);
    const hero = screen.getByTestId("hero-figure");
    // 4,000 - 1,200 mortgage (essential) = 2,800; eating out is what it is spent on.
    expect(hero.querySelector('[data-figure="safeToSpend.monthly"]')?.textContent).toBe("£2,800");
    // Left over: 4,000 - 1,200 - 300 = 2,500, from the same income.
    expect(hero.querySelector('[data-figure="budget.surplus"]')?.textContent).toBe("£2,500");
    expect(hero.textContent).not.toMatch(/Add your salary/);
  });

  it("with no budget, the empty state's only controls work: no hero link and no strip prompt", () => {
    render(<BudgetContainer />);
    // Neither the hero nor the strip shows before there is a budget, so the empty state's button
    // is the page's one way in (P52).
    expect(screen.queryByTestId("hero-figure")).toBeNull();
    expect(screen.queryByText(/Add your income and spending/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Set up your budget" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add common budget items" })).toBeDefined();
  });

  it("opens Add Category modal and allows adding a new category", async () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    render(<BudgetContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
    fireEvent.click(screen.getByTestId("budget-editor-add-category-btn"));

    expect(screen.getByText("Add budget category")).toBeDefined();

    const input = screen.getByTestId("new-category-name-input");
    fireEvent.change(input, { target: { value: "Holidays" } });

    const saveBtn = screen.getByTestId("save-new-category-btn");
    fireEvent.click(saveBtn);

    // The new category gets its own section in the editor, ready for entries.
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 3, name: "Holidays" })).toBeDefined();
    });
  });

  it("opens a category's entries from its row, read only: editing lives in Edit budget", () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    render(<BudgetContainer />);
    // A category with no amount is not listed (owner item 33a).
    expect(screen.queryByTestId("budget-category-subscriptions")).toBeNull();
    fireEvent.click(screen.getByTestId("budget-category-housing"));
    const list = screen.getByRole("list", { name: "Housing entries" });
    expect(within(list).getByText("Mortgage")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Edit Mortgage" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add category" })).toBeNull();
    fireEvent.click(screen.getByTestId("budget-category-housing"));
    expect(screen.queryByRole("list", { name: "Housing entries" })).toBeNull();
  });

  it("Edit budget edits the page in place, with no wizard, and Finish editing returns", async () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    render(<BudgetContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));

    // No wizard steps: the hero stays, the list and the scenario zone give way to the editor.
    expect(screen.queryByText(/Step 1 of/)).toBeNull();
    expect(screen.getByTestId("hero-figure")).toBeDefined();
    expect(screen.getByTestId("budget-editor")).toBeDefined();
    expect(screen.queryByTestId("budget-category-housing")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Where your money goes" })).toBeNull();
    expect(screen.queryByTestId("runway-outcome")).toBeNull();
    expect(screen.queryByRole("list", { name: "Budget steps" })).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "Money in" })).toBeDefined();
    // Custom categories get a section too.
    expect(screen.getByRole("heading", { level: 3, name: "Subscriptions" })).toBeDefined();

    // A change saves where it sits.
    vi.mocked(apiFetch).mockResolvedValueOnce(row({ name: "Mortgage", amount: 1300 }) as any);
    const amount = screen.getByTestId("budget-editor-amount-b-1");
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value: "1300" } });
    fireEvent.blur(amount);
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith(
        "/budget-entries/b-1",
        expect.objectContaining({ method: "PATCH", body: { amount: 1300 } }),
      ),
    );

    const finish = screen.getByTestId("finish-editing-btn");
    expect(finish.id).toBe("finish-editing-btn");
    expect(finish.textContent).toBe("Finish editing");
    expect(screen.queryByTestId("setup-wizard-btn")).toBeNull();
    fireEvent.click(finish);
    expect(screen.queryByTestId("budget-editor")).toBeNull();
    expect(screen.getByTestId("budget-category-housing")).toBeDefined();
    expect(screen.getByRole("button", { name: "Edit budget" })).toBeDefined();
  });

  describe("Add common budget items", () => {
    /** The budget rows onboarding saves for a renter: take-home, rent and other spending. */
    const seeded = [
      row({
        id: "s-1",
        name: "Monthly Take-Home Income",
        category: "income",
        amount: 2500,
        isIncome: true,
      }),
      row({ id: "s-2", name: "Rent Payment", category: "housing", amount: 900 }),
      row({ id: "s-3", name: "General living and outgoings", category: "living", amount: 400 }),
    ];

    it("is offered beside Edit budget on a saved budget, as a secondary button", () => {
      mockLoaderData = { ...baseLoaderData, budgetEntries: seeded };
      render(<BudgetContainer />);
      const add = screen.getByRole("button", { name: "Add common budget items" });
      expect(add.id).toBe("add-common-items-btn");
      expect(screen.getByRole("button", { name: "Edit budget" })).toBeDefined();
      fireEvent.click(add);
      expect(screen.getByRole("heading", { name: "Add common budget items" })).toBeDefined();
      expect(screen.getByText("Step 1 of 7")).toBeDefined();
      expect(screen.getByRole("list", { name: "Common budget items" }).textContent).toContain(
        "Rent or mortgage: already in your budget",
      );
    });

    it("adds only what the budget does not have, and changes no saved entry", async () => {
      mockLoaderData = { ...baseLoaderData, budgetEntries: seeded };
      const passThrough = vi.mocked(apiFetch).getMockImplementation();
      vi.mocked(apiFetch).mockImplementation(
        async (_path: string, init?: any) =>
          row({ id: `new-${init?.body?.name}`, ...init?.body }) as any,
      );
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Add common budget items" }));
      fireEvent.click(screen.getByRole("button", { name: "Add these items" }));
      await screen.findByText("Monthly Take-Home Income");
      const calls = vi.mocked(apiFetch).mock.calls;
      expect(calls.every(([, init]) => (init as any)?.method === "POST")).toBe(true);
      expect(calls.map(([, init]) => (init as any)?.body?.name)).toEqual([
        "Council Tax",
        "Gas & Electricity",
        "Water",
        "Broadband",
        "Groceries",
      ]);
      if (passThrough) vi.mocked(apiFetch).mockImplementation(passThrough);
    });

    it("is not offered when the budget has every common item, or when it is empty", () => {
      mockLoaderData = {
        ...baseLoaderData,
        budgetEntries: [
          row({ id: "c-1", name: "Rent", category: "housing" }),
          row({ id: "c-2", name: "Council tax", category: "bills", amount: 150 }),
          row({ id: "c-3", name: "Energy", category: "bills", amount: 120 }),
          row({ id: "c-4", name: "Water", category: "bills", amount: 40 }),
          row({ id: "c-5", name: "Broadband", category: "bills", amount: 30 }),
          row({ id: "c-6", name: "Groceries", category: "expenses", amount: 300 }),
        ],
      };
      const { unmount } = render(<BudgetContainer />);
      expect(screen.queryByRole("button", { name: "Add common budget items" })).toBeNull();
      unmount();
      mockLoaderData = baseLoaderData;
      render(<BudgetContainer />);
      // The empty page has no header action; its one button is the empty state's (P52).
      expect(screen.queryByTestId("add-common-items-btn")).toBeNull();
    });

    it("?setup=common opens the add wizard on load for a saved budget", () => {
      mockLoaderData = { ...baseLoaderData, budgetEntries: seeded };
      mockSearchParams = new URLSearchParams("setup=common");
      render(<BudgetContainer />);
      expect(screen.getByRole("heading", { name: "Add common budget items" })).toBeDefined();
      // The parameter is cleared without moving the reader to the top.
      expect(mockSetSearchParams).toHaveBeenCalledWith(expect.any(Function), {
        replace: true,
        preventScrollReset: true,
      });
    });

    it("?setup=common opens first-time setup on an empty budget", () => {
      mockSearchParams = new URLSearchParams("setup=common");
      render(<BudgetContainer />);
      expect(screen.getByText("Set up your budget", { selector: "h2" })).toBeDefined();
      expect(screen.getByText("Step 1 of 8")).toBeDefined();
    });

    it("?setup=common opens the wizard once: cancelling stays on the budget", () => {
      mockLoaderData = { ...baseLoaderData, budgetEntries: seeded };
      mockSearchParams = new URLSearchParams("setup=common");
      const { rerender } = render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      rerender(<BudgetContainer />);
      expect(screen.queryByRole("heading", { name: "Add common budget items" })).toBeNull();
      expect(screen.getByRole("button", { name: "Edit budget" })).toBeDefined();
    });

    it("?setup=common is cleared after it opens the wizard, keeping other params", () => {
      mockLoaderData = { ...baseLoaderData, budgetEntries: seeded };
      mockSearchParams = new URLSearchParams("setup=common&month=6");
      mockSetSearchParams.mockClear();
      render(<BudgetContainer />);
      expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
      const [update, options] = mockSetSearchParams.mock.calls[0] as [
        (prev: URLSearchParams) => URLSearchParams,
        { replace?: boolean },
      ];
      expect(options).toMatchObject({ replace: true });
      // A reload then has no ?setup=common, so the wizard does not open again.
      expect(update(new URLSearchParams("setup=common&month=6")).toString()).toBe("month=6");
    });

    it("ignores any other ?setup= value", () => {
      mockLoaderData = { ...baseLoaderData, budgetEntries: seeded };
      mockSearchParams = new URLSearchParams("setup=other");
      mockSetSearchParams.mockClear();
      render(<BudgetContainer />);
      expect(screen.queryByText(/Step 1 of/)).toBeNull();
      expect(mockSetSearchParams).not.toHaveBeenCalled();
    });
  });

  it("Add common budget items opens the wizard on the empty page and on a filled page alike", () => {
    // Empty page: the empty state's button opens the wizard in setup mode (step 1).
    const { unmount } = render(<BudgetContainer />);
    fireEvent.click(screen.getByTestId("add-suggested-defaults-btn"));
    expect(screen.queryByTestId("budget-editor")).toBeNull();
    expect(screen.getByText(/Step 1 of/)).toBeDefined();
    unmount();

    // Filled page: the header button of the same name opens the same wizard.
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    render(<BudgetContainer />);
    fireEvent.click(screen.getByTestId("add-common-items-btn"));
    expect(screen.queryByTestId("budget-editor")).toBeNull();
    expect(screen.getByText(/Step 1 of/)).toBeDefined();
  });

  it("Edit budget moves focus to the editor heading and scrolls it into view (P33)", async () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    render(<BudgetContainer />);
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
    await waitFor(() => expect(document.activeElement?.id).toBe("budget-editor-heading"));
    expect(focus).toHaveBeenCalledWith({ preventScroll: false });
    focus.mockRestore();
  });

  it("keeps breathing room inputs for the visit only: not saved, not requested, not in the hero", async () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    localStorage.clear();
    const { unmount } = render(<BudgetContainer />);
    const saved = () => screen.getByTestId("hero-figure").textContent;
    const strip = () => screen.getByTestId("hero-figure").parentElement?.textContent;
    const savedHero = saved();
    const savedStrip = strip();
    const requestsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    fireEvent.click(
      screen.getByRole("button", { name: "Show what-if: redundancy pay, a spending cut" }),
    );
    fireEvent.change(screen.getByLabelText("Redundancy pay or lump sum"), {
      target: { value: "9000" },
    });
    expect(saved()).toBe(savedHero);
    expect(strip()).toBe(savedStrip);
    expect(localStorage.getItem("flump_runway_calculator_settings")).toBeNull();
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(requestsBefore);
    expect(mockMarkChecklistStep).toHaveBeenCalledWith("runway", true);

    // ...and is gone after a reload (a fresh mount).
    unmount();
    render(<BudgetContainer />);
    fireEvent.click(
      screen.getByRole("button", { name: "Show what-if: redundancy pay, a spending cut" }),
    );
    expect((screen.getByLabelText("Redundancy pay or lump sum") as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("counts a joint account at the user's share once in the runway (JO-2)", () => {
    // Easy access £7,600 held jointly at 40%: 7,600 x 0.40 = £3,040.
    // Sharing twice would give 3,040 x 0.40 = £1,216.
    mockLoaderData = {
      ...baseLoaderData,
      accounts: [
        {
          id: "acc-joint",
          name: "Easy access savings",
          type: "Saving",
          balance: 7600,
          ownership: "joint",
          sharePercent: 40,
        },
      ],
      accountDetails: [],
      budgetEntries: withBudget,
    };
    render(<BudgetContainer />);
    fireEvent.click(
      screen.getByRole("button", { name: "Show what-if: redundancy pay, a spending cut" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Accounts and income in this illustration/ }),
    );
    const group = screen.getByRole("group", { name: "Accounts to draw on" });
    expect(group.textContent).toContain("£3,040");
    expect(group.textContent).not.toContain("£1,216");
  });

  it("keeps the row and shows an error when deleting an entry fails", async () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: [row({})] };
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 500 })) as any;

    render(<BudgetContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Mortgage" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete entry" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/could not delete that entry\. Nothing has changed/i);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/budget-entries/b-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(screen.getByTestId("budget-editor-amount-b-1")).toBeDefined();
  });

  it("updates an entry after a 412 by saying it changed somewhere else and reloading the rows", async () => {
    const read = withBudget.map((r) =>
      r.id === "b-1" ? { ...r, updatedAt: "2026-06-01T08:00:00.000Z" } : r,
    );
    mockLoaderData = { ...baseLoaderData, budgetEntries: read };
    const serverRows = withBudget.map((r) =>
      r.id === "b-1" ? { ...r, name: "Joint mortgage", amount: 1300, updatedAt: "2026-06-02" } : r,
    );
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new BackendError(kindFromStatus(412), "/budget-entries/b-1", 412),
    );
    vi.mocked(apiFetchAll).mockResolvedValueOnce(serverRows as never);

    render(<BudgetContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
    const amount = screen.getByTestId("budget-editor-amount-b-1");
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value: "1250" } });
    fireEvent.blur(amount);

    const alert = await screen.findByText(
      "We did not save this because it was changed somewhere else. The latest version is now loaded. Check it and save again.",
    );
    expect(alert.closest('[role="alert"]')).not.toBeNull();
    // The save sent the version the page had read.
    expect(apiFetch).toHaveBeenCalledWith(
      "/budget-entries/b-1",
      expect.objectContaining({
        method: "PATCH",
        ifMatch: '"2026-06-01T08:00:00.000Z"',
      }),
    );
    expect(apiFetchAll).toHaveBeenCalledWith("/budget-entries", expect.anything());
    // The editor now holds the server's rows, so the next try sends the current version.
    await waitFor(() =>
      expect((screen.getByTestId("budget-editor-name-b-1") as HTMLInputElement).value).toBe(
        "Joint mortgage",
      ),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Finish editing" })[0] as HTMLElement);
    expect(within(screen.getByTestId("budget-category-housing")).getByText("£1,300")).toBeDefined();
  });

  const withHousing = (housingStatus: string | null, monthlyHousingCost?: number) => ({
    ...baseLoaderData,
    budgetEntries: withBudget,
    userProfile: {
      ...baseLoaderData.userProfile,
      annualSalary: 40000,
      employmentType: "employed",
      pensionPercent: 5,
      isSalarySacrifice: false,
      housingStatus,
      monthlyHousingCost,
    },
  });

  it("renters: housing shows once, as the row, and rent is edited from the open row (E32)", async () => {
    mockLoaderData = withHousing("renting", 1200);
    render(<BudgetContainer />);
    expect(screen.getAllByTestId("budget-category-housing")).toHaveLength(1);
    const housingRow = screen.getByTestId("budget-category-housing");
    expect(within(housingRow).getByText("Renting")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Your details" })).toBeNull();
    expect(screen.queryByTestId("housing-details")).toBeNull();

    fireEvent.click(housingRow);
    expect(screen.getAllByTestId("housing-details")).toHaveLength(1);
    expect(screen.queryByLabelText("Rent each month")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit your rent" }));
    fireEvent.change(await screen.findByLabelText("Rent each month"), {
      target: { value: "950" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        housingStatus: "renting",
        monthlyHousingCost: 950,
      }),
    );
    await waitFor(() => expect(screen.queryByLabelText("Rent each month")).toBeNull());
  });

  it("not said yet: the open housing row asks for rent and saves the person as renting", async () => {
    mockLoaderData = withHousing(null);
    render(<BudgetContainer />);
    const housingRow = screen.getByTestId("budget-category-housing");
    // No tenure to name, so the row shows its name and amount only.
    expect(within(housingRow).queryByText(/entr(y|ies)/)).toBeNull();
    fireEvent.click(housingRow);
    fireEvent.click(screen.getByRole("button", { name: "Add your rent" }));
    fireEvent.change(await screen.findByLabelText("Rent each month"), {
      target: { value: "900" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        housingStatus: "renting",
        monthlyHousingCost: 900,
      }),
    );
  });

  it("owners with a mortgage: the housing row is a link to the mortgage page", () => {
    mockLoaderData = withHousing("mortgage", 1200);
    render(<BudgetContainer />);
    expect(screen.getAllByTestId("budget-category-housing")).toHaveLength(1);
    const housingRow = screen.getByTestId("budget-category-housing");
    expect(within(housingRow).getByText("Mortgage")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Your details" })).toBeNull();
    expect(housingRow.tagName).toBe("A");
    expect(housingRow.getAttribute("href")).toBe("/app/mortgage");
    expect(housingRow.textContent).toMatch(
      /^Housing\s*Mortgage\s*£[\d,]+ a month, open the mortgage page$/,
    );
    // No panel opens: no housing details and no rent form.
    expect(screen.queryByTestId("housing-details")).toBeNull();
    expect(screen.queryByRole("button", { name: /Edit your rent|Add your rent/ })).toBeNull();
  });

  it("living with family: the row names it, £0 can be saved, and the tenure is kept", async () => {
    mockLoaderData = withHousing("living_with_family", 200);
    render(<BudgetContainer />);
    expect(screen.getAllByTestId("budget-category-housing")).toHaveLength(1);
    const housingRow = screen.getByTestId("budget-category-housing");
    expect(within(housingRow).getByText("Living with family or friends")).toBeDefined();
    fireEvent.click(housingRow);
    fireEvent.click(screen.getByRole("button", { name: "Edit what you pay" }));
    fireEvent.change(await screen.findByLabelText("What you pay each month"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        housingStatus: "living_with_family",
        monthlyHousingCost: 0,
      }),
    );
  });

  describe("an entry that matches an account's monthly payment (audit slice 5)", () => {
    const withDuplicate = () => ({
      ...baseLoaderData,
      accounts: [
        ...baseLoaderData.accounts,
        {
          id: "acc-3",
          name: "Car loan",
          type: "Loan",
          balance: -5000,
          interestRate: 7.9,
          monthlyContribution: 265,
        },
      ],
      budgetEntries: [
        ...withBudget,
        row({ id: "b-4", name: "Car loan payment", category: "bills", amount: 265 }),
      ],
    });

    it("shows one note under the category row offering the link, and a row button in the editor", () => {
      mockLoaderData = withDuplicate();
      render(<BudgetContainer />);
      const note = screen.getByRole("note", { name: "About Car loan payment" });
      expect(note.textContent).toContain(
        "This matches the monthly payment of £265 a month on Car loan. Link it and it changes when the account does.",
      );
      expect(screen.getAllByRole("note", { name: /^About/ })).toHaveLength(1);
      expect(screen.getByTestId("budget-category-bills").getAttribute("aria-expanded")).toBe(
        "false",
      );
      // The editor offers the same link on the entry itself, not as a note.
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      expect(screen.queryByRole("note", { name: /^About/ })).toBeNull();
      expect(
        screen.getByRole("button", { name: "Link Car loan payment to Car loan" }),
      ).toBeDefined();
    });

    it("Link moves the entry to Debt, stores no amount, links the account and says Saved", async () => {
      mockLoaderData = withDuplicate();
      vi.mocked(apiFetch).mockResolvedValueOnce(
        row({
          id: "b-4",
          name: "Car loan payment",
          category: "debt",
          amount: 0,
          linkKind: "debt",
          linkAccountId: "acc-3",
        }) as any,
      );
      render(
        <ToastProvider>
          <BudgetContainer />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Link to Car loan" }));
      await waitFor(() =>
        expect(apiFetch).toHaveBeenCalledWith(
          "/budget-entries/b-4",
          expect.objectContaining({
            method: "PATCH",
            body: { amount: 0, category: "debt", linkKind: "debt", linkAccountId: "acc-3" },
          }),
        ),
      );
      expect(await screen.findByText("Saved")).toBeDefined();
      expect(screen.queryByRole("note", { name: /^About/ })).toBeNull();
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByTestId("budget-category-debt")),
      );
      // The linked line reads the account's £265 and says where it comes from.
      fireEvent.click(screen.getByTestId("budget-category-debt"));
      expect(await screen.findByText("From Car loan")).toBeDefined();
    });

    it("a failed link keeps the note and shows the page error", async () => {
      mockLoaderData = withDuplicate();
      vi.mocked(apiFetch).mockRejectedValueOnce(new Error("offline"));
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Link to Car loan" }));
      expect(
        await screen.findByText("We could not save your changes. Nothing has changed. Try again."),
      ).toBeDefined();
      expect(screen.getByRole("note", { name: /^About/ })).toBeDefined();
    });

    it("Keep my own figure hides the note for this visit only and stores nothing", async () => {
      mockLoaderData = withDuplicate();
      window.sessionStorage.clear();
      const { unmount } = render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Keep my own figure" }));
      expect(screen.queryByRole("note", { name: /^About/ })).toBeNull();
      await waitFor(() =>
        expect(document.activeElement?.getAttribute("data-testid")).toMatch(/^budget-category-/),
      );
      expect(apiFetch).not.toHaveBeenCalled();
      expect(window.sessionStorage.length).toBe(0);
      unmount();
      render(<BudgetContainer />);
      expect(screen.getByRole("note", { name: "About Car loan payment" })).toBeDefined();
    });

    it("no matching debt: no note", () => {
      mockLoaderData = { ...withDuplicate(), accounts: baseLoaderData.accounts };
      render(<BudgetContainer />);
      expect(screen.queryByRole("note", { name: /About/ })).toBeNull();
      expect(screen.queryByRole("note", { name: /^About/ })).toBeNull();
    });
  });

  describe("owner items 7, 29, 30, 31, 32b and 33b", () => {
    const salaryProfile = {
      ...baseLoaderData.userProfile,
      annualSalary: 30000,
      employmentType: "employed",
      pensionPercent: 5,
      isSalarySacrifice: false,
      taxRegion: "ENGLAND",
      studentLoanPlans: [],
    };
    const spendingOnly = [
      row({ id: "g", name: "Groceries", category: "expenses", amount: 300, isEssential: true }),
    ];

    it("is not empty when every row is a linked line (stored £0, read from saved facts)", () => {
      // Salary and rent saved, and the budget is only the two linked rows, each storing £0. The
      // resolved budget has take-home and rent in it, so the page shows it, never "No budget yet".
      mockLoaderData = {
        ...baseLoaderData,
        budgetEntries: [
          row({
            id: "lt",
            name: "Take-home pay",
            category: "income",
            isIncome: true,
            amount: 0,
            linkKind: "take_home",
          }),
          row({ id: "lh", name: "Rent", category: "housing", amount: 0, linkKind: "housing" }),
        ],
        userProfile: { ...salaryProfile, housingStatus: "renting", monthlyHousingCost: 900 },
      };
      render(<BudgetContainer />);
      expect(screen.getByTestId("budget-category-housing").textContent).toContain("£900");
      expect(screen.getByRole("region", { name: "Breathing room" })).toBeDefined();
      expect(screen.queryByText("No budget yet")).toBeNull();
    });

    it("puts Edit budget on Where your money goes, and not in the page header", () => {
      mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
      render(<BudgetContainer />);
      const header = screen.getByTestId("budget-categories-header");
      expect(within(header).getByRole("button", { name: "Edit budget" })).toBeDefined();
      expect(screen.getAllByRole("button", { name: "Edit budget" })).toHaveLength(1);
    });

    it("has Finish editing at the foot of the editor, which returns to the budget", () => {
      mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      // The same action at the head of the page and at the foot of the editor (owner item 29).
      const finish = screen.getAllByRole("button", { name: "Finish editing" });
      expect(finish).toHaveLength(2);
      fireEvent.click(finish[1] as HTMLElement);
      expect(screen.queryByTestId("budget-editor")).toBeNull();
      expect(screen.getByTestId("budget-category-expenses")).toBeDefined();
    });

    it("reads take-home pay from the profile's salary, with no budget row copied", () => {
      mockLoaderData = {
        ...baseLoaderData,
        budgetEntries: spendingOnly,
        userProfile: salaryProfile,
      };
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      const amount = screen.getByLabelText("Amount for Take-home pay") as HTMLInputElement;
      expect(Number(amount.value.replace(/,/g, ""))).toBeGreaterThan(0);
      expect(screen.getByTestId("budget-editor-source-linked-take-home").textContent).toContain(
        "From your salary in Profile",
      );
      // Nothing was written: the figure is read, not copied.
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("keeps a rent the person typed in Housing: the saved rent is only offered", () => {
      // Typed rent £700, saved rent £900: a typed figure never leaves the totals unasked.
      mockLoaderData = {
        ...baseLoaderData,
        budgetEntries: [
          ...spendingOnly,
          row({ id: "old-rent", name: "Rent", category: "housing", amount: 700 }),
        ],
        userProfile: {
          ...baseLoaderData.userProfile,
          housingStatus: "renting",
          monthlyHousingCost: 900,
        },
      };
      render(<BudgetContainer />);
      const housing = screen.getByTestId("budget-category-housing");
      expect(housing.textContent).toContain("£700");
      expect(housing.textContent).not.toContain("£900");
    });

    // Each POST answers with the row it was sent, so the page holds what was saved.
    // Only the next `count` requests, so later tests keep the pass-through.
    const echoCreates = (count = 2) => {
      for (const id of ["new-1", "new-2"].slice(0, count)) {
        vi.mocked(apiFetch).mockImplementationOnce((async (
          _url: string,
          init?: { body?: unknown },
        ) => row({ id, ...(init?.body as Record<string, unknown>) })) as never);
      }
    };
    const addInEditor = (slug: string, name: string, amount: string) => {
      fireEvent.click(screen.getByTestId(`budget-editor-open-add-${slug}`));
      fireEvent.change(screen.getByTestId(`budget-editor-new-name-${slug}`), {
        target: { value: name },
      });
      const field = screen.getByTestId(`budget-editor-new-amount-${slug}`);
      fireEvent.focus(field);
      fireEvent.change(field, { target: { value: amount } });
      fireEvent.click(screen.getByTestId(`budget-editor-add-${slug}`));
    };
    const posted = () =>
      vi
        .mocked(apiFetch)
        .mock.calls.filter(([url, init]) => url === "/budget-entries" && init?.method === "POST")
        .map(([, init]) => init?.body as Record<string, unknown>);

    it("keeps the take-home it added when the person adds their own income entry", async () => {
      // Salary saved, Groceries £300 only: the engine adds the take-home line. Adding "Child
      // benefit £100" first saves that line linked to the take-home (£0 stored), then the entry,
      // so the budget is the linked take-home plus £100, and nothing is left to offer.
      echoCreates();
      mockLoaderData = {
        ...baseLoaderData,
        budgetEntries: spendingOnly,
        userProfile: salaryProfile,
      };
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      addInEditor("income", "Child benefit", "100");
      await waitFor(() => expect(posted()).toHaveLength(2));
      expect(posted()[0]).toMatchObject({ isIncome: true, amount: 0, linkKind: "take_home" });
      expect(posted()[1]).toMatchObject({ name: "Child benefit", amount: 100, isIncome: true });
      expect(posted()[1]?.linkKind).toBeUndefined();
      expect(screen.getByTestId("budget-editor-name-linked-take-home")).toBeDefined();
      expect(screen.queryByTestId("budget-link-notice")).toBeNull();
    });

    it("counts a take-home typed over the added line once, as the person's own figure", async () => {
      // Salary saved, Groceries £300 only: the engine adds the take-home line, whose field says a
      // typed figure is used instead. Typing £2,500 saves one unlinked £2,500 income row and
      // nothing linked, so money in is 2,500, never 2,500 plus the salary's take-home.
      echoCreates(1);
      mockLoaderData = {
        ...baseLoaderData,
        budgetEntries: spendingOnly,
        userProfile: salaryProfile,
      };
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      const field = screen.getByLabelText("Amount for Take-home pay");
      fireEvent.focus(field);
      fireEvent.change(field, { target: { value: "2500" } });
      fireEvent.blur(field);
      await waitFor(() => expect(posted()).toHaveLength(1));
      expect(posted()[0]).toMatchObject({ isIncome: true, amount: 2500 });
      expect(posted()[0]?.linkKind).toBeUndefined();
      const label = screen.getByText("Money in each month");
      let card: HTMLElement | null = label;
      while (card && !card.textContent?.includes("£")) card = card.parentElement;
      expect(card?.textContent).toContain("£2,500");
    });

    it("keeps the rent it added when the person adds their own housing entry", async () => {
      // Rent £900 saved and no housing entry: the engine adds the rent line. Adding "Home
      // insurance £30" first saves that line linked to the rent, so housing is £900 + £30.
      echoCreates();
      mockLoaderData = {
        ...baseLoaderData,
        budgetEntries: spendingOnly,
        userProfile: {
          ...baseLoaderData.userProfile,
          housingStatus: "renting",
          monthlyHousingCost: 900,
        },
      };
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      addInEditor("housing", "Home insurance", "30");
      await waitFor(() => expect(posted()).toHaveLength(2));
      expect(posted()[0]).toMatchObject({ category: "housing", name: "Rent", linkKind: "housing" });
      expect(posted()[1]).toMatchObject({ name: "Home insurance", amount: 30 });
      expect(screen.getByTestId("budget-editor-name-linked-housing")).toBeDefined();
      expect(screen.queryByTestId("budget-link-notice")).toBeNull();
    });

    it("lists the saved rent in Housing through the rent row linked to it", () => {
      mockLoaderData = {
        ...baseLoaderData,
        budgetEntries: [
          ...spendingOnly,
          row({
            id: "old-rent",
            name: "Rent",
            category: "housing",
            amount: 0,
            linkKind: "housing",
          }),
        ],
        userProfile: {
          ...baseLoaderData.userProfile,
          housingStatus: "renting",
          monthlyHousingCost: 900,
        },
      };
      render(<BudgetContainer />);
      const housing = screen.getByTestId("budget-category-housing");
      expect(housing.textContent).toContain("£900");
      expect(screen.queryByTestId("budget-link-notice")).toBeNull();
    });

    it("says the saved rent is not in the budget beside an unlinked rent row, and adds it on request", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(
        row({ id: "new-rent", name: "Rent", category: "housing", amount: 0, linkKind: "housing" }),
      );
      mockLoaderData = {
        ...baseLoaderData,
        budgetEntries: [
          ...spendingOnly,
          row({ id: "old-rent", name: "Rent", category: "housing", amount: 0 }),
        ],
        userProfile: {
          ...baseLoaderData.userProfile,
          housingStatus: "renting",
          monthlyHousingCost: 900,
        },
      };
      render(<BudgetContainer />);
      // The £0 row is not filled on its own: the saved £900 is counted nowhere until chosen.
      expect(screen.getByTestId("budget-link-notice").textContent).toContain(
        "Your rent of £900 from your housing details is not in this budget yet.",
      );
      fireEvent.click(screen.getByRole("button", { name: "Add your rent of £900" }));
      await waitFor(() =>
        expect(apiFetch).toHaveBeenCalledWith(
          "/budget-entries",
          expect.objectContaining({
            method: "POST",
            body: expect.objectContaining({
              category: "housing",
              name: "Rent",
              amount: 0,
              linkKind: "housing",
            }),
          }),
        ),
      );
      await waitFor(() => expect(screen.queryByTestId("budget-link-notice")).toBeNull());
    });

    it("shows where Breathing room comes from, with links to Savings", () => {
      mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
      render(<BudgetContainer />);
      // Monzo £4,500 over the £1,200 essential mortgage row = 3.8 months.
      expect(screen.getByTestId("breathing-room-source").textContent).toContain(
        "From your savings of £4,500 and essentials of £1,200 a month.",
      );
    });

    it("switches an entry's Essential flag from What Breathing room counts", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(
        row({
          id: "b-3",
          name: "Eating out",
          category: "expenses",
          amount: 300,
          isEssential: true,
        }),
      );
      mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: /What Breathing room counts/ }));
      fireEvent.click(screen.getByRole("switch", { name: /Eating out/ }));
      await waitFor(() =>
        expect(apiFetch).toHaveBeenCalledWith(
          "/budget-entries/b-3",
          expect.objectContaining({ method: "PATCH", body: { isEssential: true } }),
        ),
      );
      // £4,500 over £1,500 (1,200 + 300) = 3.0 months.
      await waitFor(() =>
        expect(screen.getByTestId("breathing-room-source").textContent).toContain(
          "essentials of £1,500 a month",
        ),
      );
    });
  });

  it("shows the stale-rates banner when the calendar is past the latest supported tax year", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2028-06-01T12:00:00Z"));
    try {
      render(<BudgetContainer />);
      expect(screen.getByText(/Using 2027\/28 rates/)).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("BudgetContainer behaviour around saved data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoaderData = baseLoaderData;
    mockSearchParams = new URLSearchParams();
    vi.stubGlobal("ENV", { VITE_API_URL: "https://api.example.test" });
    global.fetch = vi.fn().mockResolvedValue(new Response("[]", { status: 200 })) as any;
  });

  const salaryProfile = {
    ...baseLoaderData.userProfile,
    annualSalary: 30000,
    employmentType: "employed",
    pensionPercent: 5,
    isSalarySacrifice: false,
    taxRegion: "ENGLAND",
    studentLoanPlans: [],
  };
  const groceries = row({
    id: "g",
    name: "Groceries",
    category: "expenses",
    amount: 300,
    isEssential: true,
  });
  /** Each POST answers with the row it was sent, so the page holds what was saved. */
  const echoCreates = () =>
    vi
      .mocked(apiFetch)
      .mockImplementation((async (url: string, init?: { body?: unknown }) =>
        row({ id: `new-${url}-${Math.random()}`, ...(init?.body as object) })) as never);
  const posted = () =>
    vi
      .mocked(apiFetch)
      .mock.calls.filter(([url, init]) => url === "/budget-entries" && init?.method === "POST")
      .map(([, init]) => init?.body as Record<string, unknown>);
  const addInEditor = (slug: string, name: string, amount: string) => {
    fireEvent.click(screen.getByTestId(`budget-editor-open-add-${slug}`));
    fireEvent.change(screen.getByTestId(`budget-editor-new-name-${slug}`), {
      target: { value: name },
    });
    const field = screen.getByTestId(`budget-editor-new-amount-${slug}`);
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: amount } });
    fireEvent.click(screen.getByTestId(`budget-editor-add-${slug}`));
  };
  const editAmount = (id: string, value: string) => {
    const amount = screen.getByTestId(`budget-editor-amount-${id}`);
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value } });
    fireEvent.blur(amount);
  };
  const editorHeadings = () =>
    within(screen.getByTestId("budget-editor"))
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
  const restoreApiFetch = async () => {
    const actual =
      await vi.importActual<typeof import("~/services/api-client")>("~/services/api-client");
    vi.mocked(apiFetch).mockImplementation(actual.apiFetch as never);
  };

  it("renders a budget from loader data that has only the entries", () => {
    mockLoaderData = { budgetEntries: withBudget };
    render(<BudgetContainer />);
    expect(screen.getByRole("region", { name: "Breathing room" })).toBeDefined();
    fireEvent.click(screen.getByTestId("budget-category-housing"));
    expect(screen.getByTestId("housing-details")).toBeDefined();
  });

  it("a profile with no custom categories gives the standard editor sections only", () => {
    mockLoaderData = {
      ...baseLoaderData,
      budgetEntries: withBudget,
      userProfile: { monthlyTakeHome: 3500, customBudgetCategories: [] },
    };
    const { unmount } = render(<BudgetContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
    const withEmptyList = editorHeadings();
    unmount();
    mockLoaderData = {
      ...baseLoaderData,
      budgetEntries: withBudget,
      userProfile: { monthlyTakeHome: 3500 },
    };
    render(<BudgetContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
    expect(editorHeadings()).toEqual(withEmptyList);
  });

  it("a category that only an entry names stays, removable, once its last entry is deleted", async () => {
    mockLoaderData = {
      ...baseLoaderData,
      budgetEntries: [...withBudget, row({ id: "p-1", name: "Vet", category: "pets", amount: 20 })],
    };
    // The first delete fails; the second answers 204 with no body.
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValue(new Response(null, { status: 204 })) as any;
    render(<BudgetContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Vet" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete entry" }));
    expect(await screen.findByText(/could not delete that entry/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Delete Vet" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete entry" }));
    await waitFor(() => expect(screen.queryByTestId("budget-editor-amount-p-1")).toBeNull());
    expect(screen.queryByText(/could not delete that entry/)).toBeNull();
    expect(mockRevalidate).toHaveBeenCalled();
    expect(editorHeadings()).toContain("Pets");
    fireEvent.click(screen.getByRole("button", { name: "Remove pets" }));
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        customBudgetCategories: ["subscriptions"],
      }),
    );
    await waitFor(() => expect(editorHeadings()).not.toContain("Pets"));
  });

  it("follows reloaded loader data: new entries, new categories, and a first budget", () => {
    const { rerender } = render(<BudgetContainer />);
    expect(screen.getByText("No budget yet")).toBeDefined();
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    rerender(<BudgetContainer />);
    expect(screen.queryByText("No budget yet")).toBeNull();
    expect(screen.queryByTestId("budget-category-pets")).toBeNull();
    mockLoaderData = {
      ...baseLoaderData,
      budgetEntries: [...withBudget, row({ id: "p-1", name: "Vet", category: "pets", amount: 20 })],
      userProfile: {
        ...baseLoaderData.userProfile,
        customBudgetCategories: ["subscriptions", "gifts"],
      },
    };
    rerender(<BudgetContainer />);
    expect(screen.getByTestId("budget-category-pets")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
    expect(editorHeadings()).toContain("Gifts");
  });

  it("a budget whose rows all store £0, none linked, is empty", () => {
    mockLoaderData = {
      ...baseLoaderData,
      budgetEntries: [
        row({ id: "z-1", amount: 0 }),
        row({ id: "z-2", name: "Food", category: "expenses", amount: 0 }),
      ],
    };
    render(<BudgetContainer />);
    expect(screen.getByText("No budget yet")).toBeDefined();
  });

  it("one linked row among £0 rows makes a budget", () => {
    mockLoaderData = {
      ...baseLoaderData,
      budgetEntries: [
        row({ id: "z-1", name: "Food", category: "expenses", amount: 0 }),
        row({ id: "lh", name: "Rent", category: "housing", amount: 0, linkKind: "housing" }),
      ],
      userProfile: {
        ...baseLoaderData.userProfile,
        housingStatus: "renting",
        monthlyHousingCost: 900,
      },
    };
    render(<BudgetContainer />);
    expect(screen.queryByText("No budget yet")).toBeNull();
  });

  it("marks the months-of-cover step once, however many what-if changes follow", () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    render(<BudgetContainer />);
    fireEvent.click(
      screen.getByRole("button", { name: "Show what-if: redundancy pay, a spending cut" }),
    );
    const outcome = () => document.getElementById("runway-outcome")?.textContent ?? "";
    const before = outcome();
    const lump = screen.getByLabelText("Redundancy pay or lump sum") as HTMLInputElement;
    fireEvent.change(lump, { target: { value: "9000" } });
    fireEvent.change(lump, { target: { value: "8000" } });
    expect(mockMarkChecklistStep.mock.calls.filter(([step]) => step === "runway")).toEqual([
      ["runway", true],
    ]);
    expect(lump.value.replace(/,/g, "")).toBe("8000");
    // £8,000 more to draw on lasts longer, so the illustration changes.
    expect(outcome()).not.toBe(before);
    // The what-if is kept for the visit: it is still there after editing the budget.
    fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Finish editing" })[0] as HTMLElement);
    const toggle = screen.queryByRole("button", {
      name: "Show what-if: redundancy pay, a spending cut",
    });
    if (toggle) fireEvent.click(toggle);
    expect(
      (screen.getByLabelText("Redundancy pay or lump sum") as HTMLInputElement).value.replace(
        /,/g,
        "",
      ),
    ).toBe("8000");
  });

  it("clears the old saved months-of-cover preference from the browser", () => {
    localStorage.setItem("flump_runway_calculator_settings", '{"accounts":[]}');
    render(<BudgetContainer />);
    expect(localStorage.getItem("flump_runway_calculator_settings")).toBeNull();
  });

  it("a saved rent shows at once and keeps the rest of the profile's figures", async () => {
    mockLoaderData = {
      ...baseLoaderData,
      budgetEntries: [groceries],
      userProfile: { ...salaryProfile, housingStatus: "renting", monthlyHousingCost: 1200 },
    };
    render(<BudgetContainer />);
    const moneyIn = () => {
      let card: HTMLElement | null = screen.getByText("Money in each month");
      while (card && !card.textContent?.includes("£")) card = card.parentElement;
      return card?.textContent ?? "";
    };
    const before = moneyIn();
    fireEvent.click(screen.getByTestId("budget-category-housing"));
    fireEvent.click(screen.getByRole("button", { name: "Edit your rent" }));
    fireEvent.change(await screen.findByLabelText("Rent each month"), {
      target: { value: "950" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.getByTestId("budget-category-housing").textContent).toContain("£950"),
    );
    // The take-home from the salary is still counted.
    expect(moneyIn()).toBe(before);
  });

  it("opening the housing row shows the saved rent", () => {
    mockLoaderData = {
      ...baseLoaderData,
      budgetEntries: withBudget,
      userProfile: {
        ...baseLoaderData.userProfile,
        housingStatus: "renting",
        monthlyHousingCost: 1250,
      },
    };
    render(<BudgetContainer />);
    fireEvent.click(screen.getByTestId("budget-category-housing"));
    fireEvent.click(screen.getByRole("button", { name: "Edit your rent" }));
    const field = screen.getByLabelText("Rent each month") as HTMLInputElement;
    expect(field.value.replace(/,/g, "")).toBe("1250");
  });

  it("an opened category lists its own entries, each with its figure, and no housing details", () => {
    mockLoaderData = {
      ...baseLoaderData,
      budgetEntries: [
        ...withBudget,
        row({ id: "b-4", name: "Cinema", category: "expenses", amount: 40, isEssential: false }),
      ],
    };
    render(<BudgetContainer />);
    fireEvent.click(screen.getByTestId("budget-category-expenses"));
    const list = screen.getByRole("list", { name: "Expenses entries" });
    expect(within(list).getByText("Eating out")).toBeDefined();
    expect(within(list).getByText("£300")).toBeDefined();
    expect(within(list).getByText("£40")).toBeDefined();
    expect(within(list).queryByText("Mortgage")).toBeNull();
    expect(within(list).queryByText("Salary")).toBeNull();
    expect(screen.queryByTestId("housing-details")).toBeNull();
  });

  it("an opened category with one entry shows its name only, as the row has its figure", () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    render(<BudgetContainer />);
    fireEvent.click(screen.getByTestId("budget-category-housing"));
    const list = screen.getByRole("list", { name: "Housing entries" });
    expect(within(list).getByText("Mortgage")).toBeDefined();
    expect(within(list).queryByText("£1,200")).toBeNull();
    expect(within(list).queryByText("Eating out")).toBeNull();
  });

  it("a linked rent with no saved rent says Not set in the opened row", () => {
    mockLoaderData = {
      ...baseLoaderData,
      budgetEntries: [
        groceries,
        row({ id: "lh", name: "Rent", category: "housing", amount: 0, linkKind: "housing" }),
        row({ id: "x", name: "Water", category: "housing", amount: 30 }),
      ],
      userProfile: { ...baseLoaderData.userProfile, housingStatus: "renting" },
    };
    render(<BudgetContainer />);
    fireEvent.click(screen.getByTestId("budget-category-housing"));
    const list = screen.getByRole("list", { name: "Housing entries" });
    expect(within(list).getByText("Rent")).toBeDefined();
    expect(within(list).getByText("Not set")).toBeDefined();
  });

  it("only the housing row links to the mortgage page or names the tenure", () => {
    mockLoaderData = {
      ...baseLoaderData,
      budgetEntries: withBudget,
      userProfile: {
        ...baseLoaderData.userProfile,
        housingStatus: "mortgage",
        monthlyHousingCost: 1200,
      },
    };
    const { unmount } = render(<BudgetContainer />);
    expect(screen.getByTestId("budget-category-expenses").tagName).not.toBe("A");
    unmount();
    mockLoaderData = {
      ...baseLoaderData,
      budgetEntries: withBudget,
      userProfile: {
        ...baseLoaderData.userProfile,
        housingStatus: "renting",
        monthlyHousingCost: 1200,
      },
    };
    render(<BudgetContainer />);
    expect(
      within(screen.getByTestId("budget-category-housing")).getByText("Renting"),
    ).toBeDefined();
    expect(
      within(screen.getByTestId("budget-category-expenses")).queryByText("Renting"),
    ).toBeNull();
  });

  it("Breathing room shows on the saved budget only: not while editing, not when empty", () => {
    const { unmount } = render(<BudgetContainer />);
    expect(screen.queryByRole("region", { name: "Breathing room" })).toBeNull();
    unmount();
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    render(<BudgetContainer />);
    expect(screen.getByRole("region", { name: "Breathing room" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
    expect(screen.queryByRole("region", { name: "Breathing room" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Show what-if: redundancy pay, a spending cut" }),
    ).toBeNull();
  });

  it("the header offers no second way into the wizard while it is open", () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    render(<BudgetContainer />);
    fireEvent.click(screen.getByTestId("add-common-items-btn"));
    expect(screen.queryByTestId("add-common-items-btn")).toBeNull();
  });

  it("Replace one of your entries instead opens the editor", () => {
    mockLoaderData = {
      ...baseLoaderData,
      budgetEntries: [
        groceries,
        row({ id: "old-rent", name: "Rent", category: "housing", amount: 0 }),
      ],
      userProfile: {
        ...baseLoaderData.userProfile,
        housingStatus: "renting",
        monthlyHousingCost: 900,
      },
    };
    render(<BudgetContainer />);
    fireEvent.click(screen.getByTestId("budget-link-notice-choose"));
    expect(screen.getByTestId("budget-editor")).toBeDefined();
  });

  it("switching an entry's Essential flag says Saved", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      row({ id: "b-3", name: "Eating out", category: "expenses", amount: 300, isEssential: true }),
    );
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    render(
      <ToastProvider>
        <BudgetContainer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /What Breathing room counts/ }));
    fireEvent.click(screen.getByRole("switch", { name: /Eating out/ }));
    expect(await screen.findByText("Saved")).toBeDefined();
  });

  it("?setup=common arriving on the open page opens the wizard", () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    const { rerender } = render(<BudgetContainer />);
    expect(screen.queryByText(/Step 1 of/)).toBeNull();
    mockSearchParams = new URLSearchParams("setup=common");
    rerender(<BudgetContainer />);
    expect(screen.getByText(/Step 1 of/)).toBeDefined();
  });

  describe("adding entries in the editor", () => {
    afterEach(restoreApiFetch);

    it("the take-home line saved before an income entry is named, filed and counted as essential", async () => {
      echoCreates();
      mockLoaderData = {
        ...baseLoaderData,
        budgetEntries: [groceries],
        userProfile: salaryProfile,
      };
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      addInEditor("income", "Child benefit", "100");
      await waitFor(() => expect(posted()).toHaveLength(2));
      expect(posted()[0]).toMatchObject({
        category: "income",
        name: "Take-home pay",
        isIncome: true,
        isEssential: true,
        linkKind: "take_home",
      });
      expect(mockRevalidate).toHaveBeenCalled();
    });

    it("the household contribution line keeps its own name", async () => {
      echoCreates();
      mockLoaderData = {
        ...baseLoaderData,
        budgetEntries: [groceries],
        userProfile: {
          ...baseLoaderData.userProfile,
          housingStatus: "living_with_family",
          monthlyHousingCost: 200,
        },
      };
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      addInEditor("housing", "Contents insurance", "10");
      await waitFor(() => expect(posted()).toHaveLength(2));
      expect(posted()[0]).toMatchObject({
        category: "housing",
        name: "Household contribution",
        linkKind: "housing",
      });
    });

    const addsOnlyTheEntry = async (
      budgetEntries: unknown[],
      userProfile: unknown,
      slug: string,
      name: string,
    ) => {
      echoCreates();
      mockLoaderData = { ...baseLoaderData, budgetEntries, userProfile };
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      addInEditor(slug, name, "25");
      await waitFor(() => expect(posted().length).toBeGreaterThan(0));
      // Let any second save land before counting.
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(posted()).toHaveLength(1);
      expect(posted()[0]).toMatchObject({ name, amount: 25 });
    };
    const income = row({
      id: "i",
      name: "Salary",
      category: "income",
      amount: 2000,
      isIncome: true,
      isEssential: false,
    });
    const rentRow = row({ id: "r", name: "Rent", category: "housing", amount: 900 });
    const renting = { ...salaryProfile, housingStatus: "renting", monthlyHousingCost: 900 };

    it("a housing entry beside an existing housing row adds no rent line", () =>
      addsOnlyTheEntry([groceries, rentRow], renting, "housing", "Insurance"));

    it("a spending entry outside Housing adds no rent line", () =>
      addsOnlyTheEntry(
        [groceries],
        { ...baseLoaderData.userProfile, housingStatus: "renting", monthlyHousingCost: 900 },
        "expenses",
        "Gym",
      ));

    it("an income entry beside an existing income row adds no take-home or rent line", () =>
      addsOnlyTheEntry([groceries, income], renting, "income", "Bonus"));

    it("an income entry with no salary saved adds no take-home line", () =>
      addsOnlyTheEntry([groceries], { monthlyTakeHome: null }, "income", "Bonus"));

    it("a failed add says so, and the next good add clears the message", async () => {
      vi.mocked(apiFetch).mockRejectedValueOnce(new Error("offline"));
      mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      addInEditor("expenses", "Gym", "25");
      expect((await screen.findByRole("alert")).textContent).toMatch(
        /could not add that entry\. Nothing has changed/,
      );
      echoCreates();
      // The add row stays open with what was typed, so the same add is tried again.
      fireEvent.click(screen.getByTestId("budget-editor-add-expenses"));
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    });
  });

  describe("saving changes to entries", () => {
    afterEach(restoreApiFetch);

    it("sends the version of the entry being changed", async () => {
      const read = withBudget.map((r, i) => ({
        ...r,
        updatedAt: `2026-06-0${i + 1}T08:00:00.000Z`,
      }));
      mockLoaderData = { ...baseLoaderData, budgetEntries: read };
      vi.mocked(apiFetch).mockResolvedValueOnce({ ...read[2], amount: 350 } as never);
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      editAmount("b-3", "350");
      await waitFor(() =>
        expect(apiFetch).toHaveBeenCalledWith(
          "/budget-entries/b-3",
          expect.objectContaining({ method: "PATCH", ifMatch: '"2026-06-03T08:00:00.000Z"' }),
        ),
      );
      await waitFor(() => expect(mockRevalidate).toHaveBeenCalled());
    });

    it("a failed save that is not a conflict says so without reloading, and the next save clears it", async () => {
      mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
      vi.mocked(apiFetch).mockRejectedValueOnce(
        new BackendError(kindFromStatus(500), "/budget-entries/b-3", 500),
      );
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      editAmount("b-3", "350");
      expect((await screen.findByRole("alert")).textContent).toMatch(
        /could not save your changes\. Nothing has changed/,
      );
      expect(apiFetchAll).not.toHaveBeenCalled();
      vi.mocked(apiFetch).mockResolvedValueOnce({ ...withBudget[2], amount: 360 } as never);
      editAmount("b-3", "360");
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    });
  });

  describe("adding a category", () => {
    afterEach(restoreApiFetch);

    const addCategory = (name: string) => {
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      fireEvent.click(screen.getByTestId("budget-editor-add-category-btn"));
      fireEvent.change(screen.getByTestId("new-category-name-input"), { target: { value: name } });
      fireEvent.click(screen.getByTestId("save-new-category-btn"));
    };

    it("saves the name trimmed and in lower case, and keeps the server's list on the profile", async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        categories: ["subscriptions", "holidays", "gifts"],
      } as never);
      mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
      render(<BudgetContainer />);
      addCategory("  Holidays ");
      await waitFor(() =>
        expect(apiFetch).toHaveBeenCalledWith(
          "/budget-entries/categories",
          expect.objectContaining({ method: "POST", body: { category: "holidays" } }),
        ),
      );
      await waitFor(() =>
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          customBudgetCategories: ["subscriptions", "holidays", "gifts"],
        }),
      );
    });

    it("says so when the profile cannot be saved, and a later save clears it", async () => {
      vi.mocked(apiFetch).mockResolvedValue({ categories: null } as never);
      mockUpdateProfile.mockRejectedValueOnce(new Error("offline"));
      mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
      render(<BudgetContainer />);
      addCategory("Holidays");
      expect((await screen.findByRole("alert")).textContent).toMatch(
        /could not save your new category/,
      );
      // The local list is kept when the server gives none back.
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        customBudgetCategories: ["subscriptions", "holidays"],
      });
      fireEvent.click(screen.getByTestId("budget-editor-add-category-btn"));
      fireEvent.change(screen.getByTestId("new-category-name-input"), {
        target: { value: "Gifts" },
      });
      fireEvent.click(screen.getByTestId("save-new-category-btn"));
      // By text: the page alert is hidden from the role query while the modal is open.
      await waitFor(() =>
        expect(screen.queryByText(/could not save your new category/)).toBeNull(),
      );
    });
  });

  describe("the setup wizard", () => {
    const toIncomeStep = () => {
      // Welcome, then the start choice, then income.
      fireEvent.click(screen.getByTestId("add-suggested-defaults-btn"));
      fireEvent.click(screen.getByRole("button", { name: /Next/ }));
      fireEvent.click(screen.getByRole("button", { name: "Start blank" }));
    };

    it("finishing setup marks the budget step and returns to the page", async () => {
      render(<BudgetContainer />);
      fireEvent.click(screen.getByTestId("add-suggested-defaults-btn"));
      for (let i = 0; i < 12; i += 1) {
        const finish = screen.queryByRole("button", { name: /Finish setup/ });
        if (finish) {
          fireEvent.click(finish);
          break;
        }
        fireEvent.click(screen.getByRole("button", { name: /Next/ }));
        await waitFor(() =>
          expect(screen.getByRole("button", { name: /Next|Finish setup/ })).toBeDefined(),
        );
      }
      await waitFor(() => expect(mockMarkChecklistStep).toHaveBeenCalledWith("budget", true));
      await waitFor(() => expect(screen.queryByText(/Step \d of/)).toBeNull());
    });

    it("the income step shows the take-home from the salary, with nothing after its last sentence", () => {
      mockLoaderData = { ...baseLoaderData, userProfile: salaryProfile };
      render(<BudgetContainer />);
      toIncomeStep();
      const callout = screen.getByTestId("wizard-linked-take-home");
      expect(callout.textContent).toMatch(/Your take-home pay of £[\d,]+/);
      expect(callout.textContent?.trim()).toMatch(/\.$/);
    });

    it("the income step has no take-home figure without a salary", () => {
      mockLoaderData = { ...baseLoaderData, userProfile: { customBudgetCategories: [] } };
      render(<BudgetContainer />);
      toIncomeStep();
      expect(screen.queryByTestId("wizard-linked-take-home")).toBeNull();
    });

    it("the savings step offers a saved account's monthly saving", async () => {
      mockLoaderData = {
        ...baseLoaderData,
        accounts: [
          {
            id: "acc-s",
            name: "Rainy day saver",
            type: "Saving",
            balance: 2000,
            monthlyContribution: 150,
          },
        ],
        accountDetails: [],
      };
      render(<BudgetContainer />);
      toIncomeStep();
      // Income, housing, bills and expenses come before savings.
      for (let i = 0; i < 4; i += 1) {
        await waitFor(() => expect(screen.getByRole("button", { name: /Next/ })).toBeDefined());
        fireEvent.click(screen.getByRole("button", { name: /Next/ }));
      }
      expect(await screen.findByText(/Rainy day saver/)).toBeDefined();
    });
  });
});
