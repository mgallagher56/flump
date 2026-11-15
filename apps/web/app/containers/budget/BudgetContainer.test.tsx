import { countFigures, expectPageRules } from "@repo/ui/testing";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateProfile = vi.fn().mockResolvedValue({});
const mockSetProfile = vi.fn();
const mockMarkChecklistStep = vi.fn().mockResolvedValue({});

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
      expect(group.textContent).toContain(
        "These common entries are not saved yet. Fill in the amounts that apply to you, then save. Entries left blank stay here until you remove them or leave the page.",
      );
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
    expect(screen.getByTestId("budget-category-subscriptions")).toBeDefined();
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

  it("with no budget, Set up your budget still opens the wizard", () => {
    render(<BudgetContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Set up your budget" }));
    expect(screen.queryByTestId("budget-editor")).toBeNull();
    expect(screen.queryByTestId("setup-wizard-btn")).toBeNull();
    expect(screen.getByText(/Step 1 of/)).toBeDefined();
  });

  it("keeps months of cover inputs for the visit only: not saved, not requested, not in the hero", async () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    localStorage.clear();
    const { unmount } = render(<BudgetContainer />);
    const saved = () => screen.getByTestId("hero-figure").textContent;
    const strip = () => screen.getByTestId("hero-figure").parentElement?.textContent;
    const savedHero = saved();
    const savedStrip = strip();
    const requestsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    fireEvent.change(screen.getByLabelText(/Redundancy pay or lump sum/i), {
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
    expect((screen.getByLabelText(/Redundancy pay or lump sum/i) as HTMLInputElement).value).toBe(
      "",
    );
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

  it("updates an entry after a 412 by showing the error and reloading the rows", async () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
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

    const alert = await screen.findByText(/could not save your changes\. Nothing has changed/i);
    expect(alert.closest('[role="alert"]')).not.toBeNull();
    expect(apiFetch).toHaveBeenCalledWith(
      "/budget-entries/b-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(apiFetchAll).toHaveBeenCalledWith("/budget-entries", expect.anything());
    // The editor now holds the server's rows, so the next try sends the current version.
    await waitFor(() =>
      expect((screen.getByTestId("budget-editor-name-b-1") as HTMLInputElement).value).toBe(
        "Joint mortgage",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Finish editing" }));
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
});
