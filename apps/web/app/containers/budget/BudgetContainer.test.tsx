import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateProfile = vi.fn().mockResolvedValue({});
const mockSetProfile = vi.fn();
const mockMarkChecklistStep = vi.fn();

const mockLoaderData = {
  accounts: [],
  accountDetails: [],
  budgetEntries: [],
  userProfile: {
    customBudgetCategories: ["subscriptions"],
    hasResetFinancialData: true,
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
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "b-1",
            name: "Rent",
            category: "housing",
            amount: 1200,
            frequency: "monthly",
            isIncome: false,
          },
        ]),
    }) as any;
  });

  it("renders the Budget Planner heading and custom category tab", () => {
    render(<BudgetContainer />);
    expect(screen.getByText("Budget Planner")).toBeDefined();
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
});
