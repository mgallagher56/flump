import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("renders the Your budget heading and custom category tab", () => {
    render(<BudgetContainer />);
    expect(screen.getByText("Your budget")).toBeDefined();
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

    expect(screen.getByText("Add budget category")).toBeDefined();

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

    // Switch to the Months of cover tab
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

  it("keeps runway scenario inputs for the visit only: not saved, not requested, not in the headline", async () => {
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
      ],
    };
    localStorage.clear();
    const { unmount } = render(<BudgetContainer />);
    fireEvent.click(screen.getByTestId("budget-tab-runway"));
    const headline = () =>
      screen.getByText("Your months of cover").closest("[data-tone]")?.textContent;
    const savedHeadline = headline();
    const requestsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    fireEvent.change(screen.getByLabelText(/Severance or lump sum/i), {
      target: { value: "9000" },
    });
    expect(headline()).toBe(savedHeadline);
    expect(localStorage.getItem("flump_runway_calculator_settings")).toBeNull();
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(requestsBefore);

    // Survives a tab switch...
    fireEvent.click(screen.getByTestId("budget-tab-housing"));
    fireEvent.click(screen.getByTestId("budget-tab-runway"));
    expect((screen.getByLabelText(/Severance or lump sum/i) as HTMLInputElement).value).toContain(
      "9,000",
    );

    // ...and is gone after a reload (a fresh mount).
    unmount();
    render(<BudgetContainer />);
    fireEvent.click(screen.getByTestId("budget-tab-runway"));
    expect((screen.getByLabelText(/Severance or lump sum/i) as HTMLInputElement).value).toBe("");
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
      "/api/budget-entries/b-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(screen.getByText("Mortgage")).toBe(row);
  });
  it("shows the housing cost card with no budget rows, and saves rent to the profile (E32)", async () => {
    mockLoaderData = {
      ...mockLoaderData,
      budgetEntries: [],
      userProfile: {
        ...mockLoaderData.userProfile,
        annualSalary: 40000,
        employmentType: "employed",
        pensionPercent: 5,
        isSalarySacrifice: false,
        housingStatus: null,
      },
    };
    render(<BudgetContainer />);
    expect(screen.getByTestId("housing-cost-card")).toBeDefined();
    expect(screen.getByText("Not known yet. Add your monthly rent to see this.")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Monthly rent"), { target: { value: "900" } });
    fireEvent.click(screen.getByRole("button", { name: "Save rent" }));
    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        housingStatus: "renting",
        monthlyHousingCost: 900,
      }),
    );
    expect((await screen.findByTestId("housing-cost-share")).textContent).toMatch(
      /% of your estimated take-home pay$/,
    );
  });

  it("leaves the housing cost to the mortgage page for owners with a mortgage", () => {
    mockLoaderData = {
      ...mockLoaderData,
      userProfile: { ...mockLoaderData.userProfile, housingStatus: "mortgage" },
    };
    render(<BudgetContainer />);
    expect(screen.queryByTestId("housing-cost-card")).toBeNull();
  });
});
