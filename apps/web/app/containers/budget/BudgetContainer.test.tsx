import { countFigures, expectPageRules } from "@repo/ui/testing";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateProfile = vi.fn().mockResolvedValue({});
const mockSetProfile = vi.fn();
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
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

vi.mock("~/hooks/useUserProfile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/hooks/useUserProfile")>();
  return {
    ...actual,
    useUserProfile: () => ({
      profile: mockProfileData,
      setProfile: mockSetProfile,
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

  it("with no budget: one Set up your budget button, one prompt, no hero and no notice", () => {
    const { container } = render(<BudgetContainer />);
    expect(screen.getByRole("heading", { level: 1, name: "Your budget" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Set up your budget" })).toBeDefined();
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

  describe("Add common entries", () => {
    const SAVED_ID = "11111111-1111-4111-8111-111111111111";
    const SAVED_ID_2 = "22222222-2222-4222-8222-222222222222";
    const EXAMPLES = [
      "Take-home pay",
      "Rent or mortgage",
      "Council tax",
      "Energy",
      "Phone and broadband",
      "Food shop",
      "Travel",
      "Savings",
    ];
    const GROUP = { name: "Common entries not saved yet" };
    const draftNames = (editor: HTMLElement) =>
      Array.from(
        editor.querySelectorAll<HTMLInputElement>('[id^="budget-editor-draft-name-"]'),
      ).map((el) => el.value);
    const savedResponse = (id: string, name: string, category: string, amount: number) =>
      new Response(
        JSON.stringify(
          row({
            id,
            name,
            category,
            amount,
            isEssential: category !== "expenses",
            createdAt: "2026-11-15T00:00:00.000Z",
            updatedAt: "2026-11-15T00:00:00.000Z",
          }),
        ),
        { status: 201 },
      );
    const typeAmount = (label: string, value: string) => {
      const amount = screen.getByLabelText(label);
      fireEvent.focus(amount);
      fireEvent.change(amount, { target: { value } });
      fireEvent.blur(amount);
    };
    const renderWithToast = () =>
      render(
        <ToastProvider>
          <BudgetContainer />
        </ToastProvider>,
      );

    it("opens the editor with the common entries, each badged, and sends no request", () => {
      render(<BudgetContainer />);
      const button = screen.getByTestId("add-suggested-defaults-btn");
      expect(button.textContent).toBe("Add common entries");
      fireEvent.click(button);

      const editor = screen.getByTestId("budget-editor");
      expect(screen.queryByText("No budget yet")).toBeNull();
      expect(draftNames(editor)).toEqual(EXAMPLES);
      expect(within(editor).getAllByText("Common entry")).toHaveLength(EXAMPLES.length);
      // No invented figures: every amount starts empty.
      for (const input of editor.querySelectorAll<HTMLInputElement>(
        '[id^="budget-editor-draft-amount-"]',
      )) {
        expect(input.value).toBe("");
      }
      const group = within(editor).getByRole("group", GROUP);
      expect(group.textContent).toContain("Common entries not saved yet");
      expect(
        (within(group).getByRole("button", { name: "Save entries" }) as HTMLButtonElement).disabled,
      ).toBe(true);
      // The group's buttons are the way out, so the header has no Finish editing.
      expect(screen.queryByTestId("finish-editing-btn")).toBeNull();
      expect(apiFetch).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("with old £0 seed rows, shows those saved rows plus only the missing drafts", () => {
      mockLoaderData = {
        ...baseLoaderData,
        budgetEntries: [
          row({ id: "s-1", name: "Rent / Mortgage", category: "housing", amount: 0 }),
          row({ id: "s-2", name: "Gas", category: "bills", amount: 0 }),
          row({ id: "s-3", name: "Electricity", category: "bills", amount: 0 }),
          row({ id: "s-4", name: "Council Tax", category: "bills", amount: 0 }),
          row({ id: "s-5", name: "Broadband", category: "bills", amount: 0 }),
        ],
      };
      render(<BudgetContainer />);
      // £0 rows leave the budget empty, so the empty state still offers common entries.
      fireEvent.click(screen.getByTestId("add-suggested-defaults-btn"));
      const editor = screen.getByTestId("budget-editor");
      expect(draftNames(editor)).toEqual(["Take-home pay", "Food shop", "Travel", "Savings"]);
      for (const id of ["s-1", "s-2", "s-3", "s-4", "s-5"]) {
        expect(within(editor).getByTestId(`budget-editor-name-${id}`)).toBeDefined();
      }
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("Save entries saves the ready drafts, keeps the blank ones and says Saved 1 entry", async () => {
      renderWithToast();
      fireEvent.click(screen.getByTestId("add-suggested-defaults-btn"));
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () =>
        savedResponse(SAVED_ID, "Food shop", "expenses", 320),
      );
      typeAmount("Amount for Food shop", "320");
      fireEvent.click(screen.getByRole("button", { name: "Save entries" }));

      await waitFor(() => expect(screen.getByText("Saved 1 entry")).toBeDefined());
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] ?? [];
      expect(String(url)).toMatch(/\/budget-entries$/);
      expect(init).toMatchObject({ method: "POST" });
      expect(JSON.parse(String(init.body))).toMatchObject({
        category: "expenses",
        name: "Food shop",
        amount: 320,
        frequency: "monthly",
        isIncome: false,
        isEssential: false,
      });
      // The saved draft leaves the list and shows as a saved row; the blank ones stay as drafts.
      const editor = screen.getByTestId("budget-editor");
      expect(draftNames(editor)).toEqual(EXAMPLES.filter((n) => n !== "Food shop"));
      expect(screen.getByDisplayValue("Food shop").id).toBe(`budget-editor-name-${SAVED_ID}`);
      expect(within(editor).getByRole("group", GROUP)).toBeDefined();
      // The budget is no longer empty, so focus moves to the editor heading.
      await waitFor(() => expect(document.activeElement?.id).toBe("budget-editor-heading"));
    });

    it("says Saved 2 entries when two drafts save", async () => {
      renderWithToast();
      fireEvent.click(screen.getByTestId("add-suggested-defaults-btn"));
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(async () => savedResponse(SAVED_ID, "Council tax", "bills", 160))
        .mockImplementationOnce(async () =>
          savedResponse(SAVED_ID_2, "Food shop", "expenses", 320),
        );
      typeAmount("Amount for Council tax", "160");
      typeAmount("Amount for Food shop", "320");
      fireEvent.click(screen.getByRole("button", { name: "Save entries" }));
      await waitFor(() => expect(screen.getByText("Saved 2 entries")).toBeDefined());
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("a draft with an amount but no name is not ready, and is never dropped", () => {
      render(<BudgetContainer />);
      fireEvent.click(screen.getByTestId("add-suggested-defaults-btn"));
      typeAmount("Amount for Travel", "60");
      fireEvent.change(screen.getByLabelText("Name of Travel"), { target: { value: "" } });
      const save = screen.getByRole("button", { name: "Save entries" }) as HTMLButtonElement;
      expect(save.disabled).toBe(true);
      fireEvent.click(save);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(draftNames(screen.getByTestId("budget-editor"))).toHaveLength(EXAMPLES.length);
    });

    it("a failure partway keeps the unsaved drafts and says how many were saved", async () => {
      renderWithToast();
      fireEvent.click(screen.getByTestId("add-suggested-defaults-btn"));
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(async () => savedResponse(SAVED_ID, "Council tax", "bills", 160))
        .mockImplementation(async () => new Response(null, { status: 500 }));
      typeAmount("Amount for Council tax", "160");
      typeAmount("Amount for Food shop", "320");
      fireEvent.click(screen.getByRole("button", { name: "Save entries" }));
      expect(
        await screen.findByText(
          "We saved 1 of 2 entries. The others are still here, so you can try again.",
        ),
      ).toBeDefined();
      expect(screen.queryByText(/Nothing has changed/)).toBeNull();
      const editor = screen.getByTestId("budget-editor");
      expect(draftNames(editor)).toContain("Food shop");
      expect(draftNames(editor)).not.toContain("Council tax");
      expect((screen.getByLabelText("Amount for Food shop") as HTMLInputElement).value).toBe("320");
      expect(screen.queryByText(/^Saved/)).toBeNull();
    });

    it("a failure on the first save keeps every draft and shows the add error", async () => {
      renderWithToast();
      fireEvent.click(screen.getByTestId("add-suggested-defaults-btn"));
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        async () => new Response(null, { status: 500 }),
      );
      typeAmount("Amount for Food shop", "320");
      fireEvent.click(screen.getByRole("button", { name: "Save entries" }));
      expect(
        await screen.findByText("We could not add that entry. Nothing has changed. Try again."),
      ).toBeDefined();
      expect(draftNames(screen.getByTestId("budget-editor"))).toEqual(EXAMPLES);
    });

    it("Remove common entries returns to the empty state with no request", async () => {
      render(<BudgetContainer />);
      fireEvent.click(screen.getByTestId("add-suggested-defaults-btn"));
      fireEvent.click(screen.getByRole("button", { name: "Remove common entries" }));
      expect(screen.queryByTestId("budget-editor")).toBeNull();
      expect(screen.getByText("No budget yet")).toBeDefined();
      expect(screen.getByRole("button", { name: "Set up your budget" })).toBeDefined();
      await waitFor(() => expect(document.activeElement?.id).toBe("add-suggested-defaults-btn"));
      expect(apiFetch).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("Remove common entries after a save keeps the editor and brings back Finish editing", async () => {
      renderWithToast();
      fireEvent.click(screen.getByTestId("add-suggested-defaults-btn"));
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () =>
        savedResponse(SAVED_ID, "Food shop", "expenses", 320),
      );
      typeAmount("Amount for Food shop", "320");
      fireEvent.click(screen.getByRole("button", { name: "Save entries" }));
      await waitFor(() => expect(screen.getByText("Saved 1 entry")).toBeDefined());
      fireEvent.click(screen.getByRole("button", { name: "Remove common entries" }));
      expect(screen.queryByRole("group", GROUP)).toBeNull();
      // Leaving the editor drops any drafts, so reopening it shows none.
      fireEvent.click(screen.getByTestId("finish-editing-btn"));
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      expect(draftNames(screen.getByTestId("budget-editor"))).toEqual([]);
    });

    it("removing one draft asks nothing and sends no request", () => {
      render(<BudgetContainer />);
      fireEvent.click(screen.getByTestId("add-suggested-defaults-btn"));
      fireEvent.click(screen.getByRole("button", { name: "Remove Travel" }));
      expect(screen.queryByDisplayValue("Travel")).toBeNull();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getAllByText("Common entry")).toHaveLength(EXAMPLES.length - 1);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it("with take-home pay unknown, the hero asks for a salary", () => {
    mockLoaderData = {
      ...baseLoaderData,
      userProfile: { ...baseLoaderData.userProfile, monthlyTakeHome: null },
      budgetEntries: withBudget,
    };
    render(<BudgetContainer />);
    // The global setup renders router links as their children, so the words are checked here.
    const hero = screen.getByTestId("hero-figure");
    expect(hero.textContent).toMatch(/Add your salary\s+to see/);
  });

  it("with no budget, the empty state's only controls work: no hero link and no strip prompt", () => {
    render(<BudgetContainer />);
    // Neither the hero nor the strip shows before there is a budget, so the header button and
    // the empty state's button are the page's only ways in.
    expect(screen.queryByTestId("hero-figure")).toBeNull();
    expect(screen.queryByText(/Add your income and spending/)).toBeNull();
    expect(screen.getByRole("button", { name: "Set up your budget" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Add common entries" })).toBeDefined();
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
      expect(screen.queryByRole("button", { name: "Add common budget items" })).toBeNull();
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

  it("with no budget, Set up your budget still opens the wizard", () => {
    render(<BudgetContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Set up your budget" }));
    expect(screen.queryByTestId("budget-editor")).toBeNull();
    expect(screen.queryByTestId("setup-wizard-btn")).toBeNull();
    expect(screen.getByText(/Step 1 of/)).toBeDefined();
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

  describe("an entry that may already be counted with your debts", () => {
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

    beforeEach(() => {
      window.sessionStorage.clear();
    });

    it("shows one note under the category row, without opening it", () => {
      mockLoaderData = withDuplicate();
      render(<BudgetContainer />);
      const note = screen.getByRole("note", { name: "About Car loan payment" });
      expect(note.textContent).toContain(
        "This looks like your Car loan payment of £265 a month, which is already counted with your debts.",
      );
      expect(screen.getAllByRole("note", { name: /^About/ })).toHaveLength(1);
      expect(screen.getByTestId("budget-category-bills").getAttribute("aria-expanded")).toBe(
        "false",
      );
      // Not in the editor.
      fireEvent.click(screen.getByRole("button", { name: "Edit budget" }));
      expect(screen.queryByRole("note", { name: /^About/ })).toBeNull();
    });

    it("Move to debts saves the entry in the debt category and says Saved", async () => {
      mockLoaderData = withDuplicate();
      vi.mocked(apiFetch).mockResolvedValueOnce(
        row({ id: "b-4", name: "Car loan payment", category: "debt", amount: 265 }) as any,
      );
      render(
        <ToastProvider>
          <BudgetContainer />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Move to debts" }));
      await waitFor(() =>
        expect(apiFetch).toHaveBeenCalledWith(
          "/budget-entries/b-4",
          expect.objectContaining({ method: "PATCH", body: { category: "debt" } }),
        ),
      );
      expect(await screen.findByText("Saved")).toBeDefined();
      expect(screen.queryByRole("note", { name: /^About/ })).toBeNull();
      expect(screen.getByTestId("budget-category-debt")).toBeDefined();
      // Focus follows the entry to its new Debt row, not the page body.
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByTestId("budget-category-debt")),
      );
    });

    it("a failed move keeps the note and shows the page error", async () => {
      mockLoaderData = withDuplicate();
      vi.mocked(apiFetch).mockRejectedValueOnce(new Error("offline"));
      render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Move to debts" }));
      expect(
        await screen.findByText("We could not save your changes. Nothing has changed. Try again."),
      ).toBeDefined();
      expect(screen.getByRole("note", { name: /^About/ })).toBeDefined();
    });

    it("Keep it here hides the note and remembers it for the session", async () => {
      mockLoaderData = withDuplicate();
      const { unmount } = render(<BudgetContainer />);
      fireEvent.click(screen.getByRole("button", { name: "Keep it here" }));
      expect(screen.queryByRole("note", { name: /^About/ })).toBeNull();
      // Focus moves to the category row the note sat under.
      await waitFor(() =>
        expect(document.activeElement?.getAttribute("data-testid")).toMatch(/^budget-category-/),
      );
      expect(apiFetch).not.toHaveBeenCalled();
      expect(
        JSON.parse(window.sessionStorage.getItem("flump.budget.keptDebtRows") ?? "[]"),
      ).toEqual(["b-4"]);
      unmount();
      render(<BudgetContainer />);
      expect(screen.queryByRole("note", { name: /^About/ })).toBeNull();
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
    vi.setSystemTime(new Date("2027-06-01T12:00:00Z"));
    try {
      render(<BudgetContainer />);
      expect(screen.getByText(/Using 2026\/27 rates/)).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
