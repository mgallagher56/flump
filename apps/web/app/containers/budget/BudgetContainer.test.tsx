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
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
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
    expect(within(firstView).getByText("Months of cover")).toBeDefined();
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
    expect(screen.getAllByRole("button", { name: "Add category" })).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Model a change to your budget" })).toBeDefined();
    expect(screen.getByRole("link", { name: /MoneyHelper/ })).toBeDefined();
    expectPageRules(container, { maxNotSet: 1, projectionNotices: 1 });
    // The hero and strip come before the list and the zone, and nothing sits above the h1.
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.compareDocumentPosition(hero) & 4).toBeTruthy();
  });

  it("renders Add example figures and calls backend seed-defaults", async () => {
    render(<BudgetContainer />);
    const addDefaultsBtn = screen.getByTestId("add-suggested-defaults-btn");
    expect(addDefaultsBtn.textContent).toBe("Add example figures");

    fireEvent.click(addDefaultsBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/budget-entries/seed-defaults"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("opens Add Category modal and allows adding a new category", async () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    render(<BudgetContainer />);
    fireEvent.click(screen.getByTestId("add-category-btn"));

    expect(screen.getByText("Add budget category")).toBeDefined();

    const input = screen.getByTestId("new-category-name-input");
    fireEvent.change(input, { target: { value: "Holidays" } });

    const saveBtn = screen.getByTestId("save-new-category-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByTestId("budget-category-holidays").getAttribute("aria-expanded")).toBe(
        "true",
      );
    });
  });

  it("opens a category's entries from its row, and opens the wizard from Edit budget", () => {
    mockLoaderData = { ...baseLoaderData, budgetEntries: withBudget };
    render(<BudgetContainer />);
    expect(screen.getByTestId("budget-category-subscriptions")).toBeDefined();
    fireEvent.click(screen.getByTestId("budget-category-housing"));
    expect(screen.getByRole("button", { name: "Edit Mortgage" })).toBeDefined();
    fireEvent.click(screen.getByTestId("budget-category-housing"));
    expect(screen.queryByRole("button", { name: "Edit Mortgage" })).toBeNull();

    fireEvent.click(screen.getByTestId("setup-wizard-btn"));
    expect(screen.queryByTestId("hero-figure")).toBeNull();
    expect(screen.queryByTestId("setup-wizard-btn")).toBeNull();
    // Edit budget edits the saved budget: no first-run welcome or example figures.
    expect(screen.getByText("Edit your budget")).toBeDefined();
    expect(screen.queryByText("Set up your budget")).toBeNull();
    expect(screen.getByRole("heading", { name: "Income" })).toBeDefined();
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
    fireEvent.click(screen.getByTestId("budget-category-housing"));
    const entriesTable = await screen.findByRole("table", { name: "Housing entries" });
    const entryName = within(entriesTable).getByText("Mortgage");
    fireEvent.click(screen.getByRole("button", { name: "Delete Mortgage" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete entry" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/could not delete that entry\. Nothing has changed/i);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/budget-entries/b-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(
      within(screen.getByRole("table", { name: "Housing entries" })).getByText("Mortgage"),
    ).toBe(entryName);
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
    fireEvent.click(screen.getByTestId("budget-category-housing"));
    fireEvent.click(screen.getByRole("button", { name: "Edit Mortgage" }));
    fireEvent.change(await screen.findByLabelText(/^Amount/), { target: { value: "1250" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // The entry dialog stays open (nothing typed is lost), so the page behind it is inert.
    const alert = await screen.findByText(/could not save your changes\. Nothing has changed/i);
    expect(alert.closest('[role="alert"]')).not.toBeNull();
    expect(apiFetch).toHaveBeenCalledWith(
      "/budget-entries/b-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(apiFetchAll).toHaveBeenCalledWith("/budget-entries", expect.anything());
    // The list now holds the server's rows, so the next try sends the current version.
    const table = await screen.findByRole("table", { name: "Housing entries", hidden: true });
    await waitFor(() => expect(within(table).getByText("Joint mortgage")).toBeDefined());
    expect(within(table).queryByText("Mortgage")).toBeNull();
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
    // No tenure to name, so the row keeps its entry count.
    expect(within(housingRow).getByText("1 entry")).toBeDefined();
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

  it("owners with a mortgage: the row says Mortgage and points to the mortgage page", () => {
    mockLoaderData = withHousing("mortgage", 1200);
    render(<BudgetContainer />);
    expect(screen.getAllByTestId("budget-category-housing")).toHaveLength(1);
    const housingRow = screen.getByTestId("budget-category-housing");
    expect(within(housingRow).getByText("Mortgage")).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Your details" })).toBeNull();
    fireEvent.click(housingRow);
    expect(screen.getByRole("link", { name: "Open the mortgage page" })).toBeDefined();
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
});
