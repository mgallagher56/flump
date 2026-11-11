import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  accessToken: "mock-token",
};

const mockProfileData = {
  customBudgetCategories: ["subscriptions"],
  hasResetFinancialData: true,
};

vi.mock("react-router", () => ({
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

import BudgetContainer from "./BudgetContainer";

describe("BudgetContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("renders the Budget Planner heading and custom category tab", () => {
    render(<BudgetContainer />);
    expect(screen.getByText("Budget planner")).toBeDefined();
    // Custom category tab from user profile
    expect(screen.getByTestId("budget-tab-subscriptions")).toBeDefined();
  });

  it("renders Add Suggested Defaults button and calls backend seed-defaults", async () => {
    render(<BudgetContainer />);
    const addDefaultsBtn = screen.getByTestId("add-suggested-defaults-btn");
    expect(addDefaultsBtn).toBeDefined();

    fireEvent.click(addDefaultsBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/budget-entries/seed-defaults"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("opens Add Category modal and allows adding a new category", async () => {
    render(<BudgetContainer />);
    const addCatBtn = screen.getByTestId("add-category-btn");
    fireEvent.click(addCatBtn);

    expect(screen.getByText("Add Budget Category")).toBeDefined();

    const input = screen.getByTestId("new-category-name-input");
    fireEvent.change(input, { target: { value: "Holidays" } });

    const saveBtn = screen.getByTestId("save-new-category-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByTestId("budget-tab-holidays")).toBeDefined();
    });
  });

  it("navigates across wizard, runway, and category tabs and renders non-empty dashboard", async () => {
    mockLoaderData = {
      ...mockLoaderData,
      budgetEntries: [
        {
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
        },
        {
          id: "b-2",
          userId: "u1",
          name: "Salary",
          category: "income",
          amount: 4000,
          frequency: "monthly",
          isIncome: true,
          isPrimaryIncome: true,
          isEssential: false,
          notes: null,
          isDefault: false,
          createdAt: "",
          updatedAt: "",
        },
      ],
    };

    render(<BudgetContainer />);

    // Switch to Runway tab
    fireEvent.click(screen.getByTestId("budget-tab-runway"));
    expect(mockMarkChecklistStep).toHaveBeenCalledWith("runway", true);

    // Switch to Housing category tab
    fireEvent.click(screen.getByTestId("budget-tab-housing"));

    // Switch to custom category tab
    fireEvent.click(screen.getByTestId("budget-tab-subscriptions"));

    // Switch back to Overview
    fireEvent.click(screen.getByTestId("budget-tab-overview"));

    // Open Setup Wizard
    fireEvent.click(screen.getByTestId("setup-wizard-btn"));
  });

  it("keeps the row and shows an error when deleting an entry fails", async () => {
    const entry = {
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
    };
    mockLoaderData = { ...mockLoaderData, budgetEntries: [entry] };
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 500 })) as any;

    render(<BudgetContainer />);
    fireEvent.click(screen.getByTestId("budget-tab-housing"));
    const row = await screen.findByText("Mortgage");
    const deleteBtn = screen.getAllByTitle("Delete")[0];
    fireEvent.click(deleteBtn);
    fireEvent.click(await screen.findByRole("button", { name: "Delete entry" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn.t delete/i);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.test/budget-entries/b-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(screen.getByText("Mortgage")).toBe(row);
  });
});
