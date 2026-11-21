import { MORTGAGE_ESTIMATE_STANDALONE_NOTICE } from "@flump/finance-engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MortgageEstimatesContainer from "./MortgageEstimatesContainer";

const mockLoaderData = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useLoaderData: () => mockLoaderData(),
  };
});

describe("MortgageEstimatesContainer", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockLoaderData.mockReturnValue({
      accounts: [],
      accountDetails: [],
      budgetEntries: [
        {
          id: "b1",
          name: "Groceries",
          amount: 500,
          frequency: "monthly",
          category: "food",
          isEssential: true,
          isIncome: false,
        },
        {
          id: "b2",
          name: "Rent",
          amount: 900,
          frequency: "monthly",
          category: "housing",
          isEssential: true,
          isIncome: false,
        },
        {
          id: "b3",
          name: "ISA",
          amount: 200,
          frequency: "monthly",
          category: "savings",
          isEssential: false,
          isIncome: false,
        },
      ],
      userProfile: {
        annualSalary: 45000,
        employmentType: "employed",
        taxRegion: "ENGLAND",
        studentLoanPlans: [],
        pensionPercent: 0,
        isSalarySacrifice: false,
        housingStatus: "renting",
        monthlyHousingCost: 900,
      },
    });
  });

  it("renders hero, 3 KPIs, standing notice, and all three tools without the word affordable", () => {
    const { container } = render(
      <MemoryRouter>
        <MortgageEstimatesContainer />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Mortgage estimates" })).not.toBeNull();
    expect(screen.getByTestId("mortgage-estimates-hero").textContent).toContain(
      "Left each month before housing",
    );
    expect(screen.getByText("Take-home pay")).not.toBeNull();
    expect(screen.getByText("Essentials without housing")).not.toBeNull();
    expect(screen.getByText("Debt payments")).not.toBeNull();
    expect(screen.getByText(MORTGAGE_ESTIMATE_STANDALONE_NOTICE)).not.toBeNull();
    expect(container.textContent?.toLowerCase()).not.toContain("affordab");
  });

  it("switches between the three tools and updates hero when planned savings toggle changes", () => {
    render(
      <MemoryRouter>
        <MortgageEstimatesContainer />
      </MemoryRouter>,
    );

    const heroBefore = screen.getByTestId("mortgage-estimates-hero").textContent;
    fireEvent.click(screen.getByRole("switch", { name: "Subtract planned savings" }));
    const heroAfter = screen.getByTestId("mortgage-estimates-hero").textContent;
    expect(heroAfter).not.toEqual(heroBefore);

    fireEvent.click(screen.getByRole("tab", { name: "From income" }));
    expect(screen.getByTestId("income-multiple-result").textContent).toContain(
      "~£180,000 to ~£203,000",
    );

    fireEvent.click(screen.getByRole("tab", { name: "If rates change" }));
    expect(screen.getByTestId("rate-change-result")).not.toBeNull();
  });
});
