import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DebtContainer from "./DebtContainer";

vi.mock("react-router", () => ({
  useLoaderData: () => ({
    accounts: [
      {
        id: "acc-cc",
        name: "Barclaycard Platinum",
        type: "Credit Card",
        balance: 3000,
        interestRate: 22.9,
      },
      {
        id: "acc-loan",
        name: "Tesco Loan",
        type: "Loan",
        balance: 4500,
        interestRate: 7.9,
      },
    ],
    budgetData: {
      monthlySurplus: 150,
    },
    userProfile: {},
  }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
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

describe("DebtContainer", () => {
  it("renders debt payoff overview and active liabilities", () => {
    render(<DebtContainer />);

    expect(screen.getByText(/Debt payoff and recovery/i)).toBeDefined();
    expect(screen.getByText(/Total Unsecured Debt/i)).toBeDefined();
    expect(screen.getByText(/Payoff Strategy: Avalanche vs. Snowball/i)).toBeDefined();
    expect(screen.getByText(/The Debt-to-Wealth Crossover Bridge/i)).toBeDefined();
    expect(screen.getByText(/UK Debt Rules & Specialised Instruments/i)).toBeDefined();
  });

  it("allows switching UK instruments tabs and managing liability accounts", () => {
    render(<DebtContainer />);

    const overdraftTab = screen.getByRole("button", { name: /Arranged Overdraft EAR Cost/i });
    fireEvent.click(overdraftTab);

    expect(screen.getByText(/True Annual Overdraft Drain/i)).toBeDefined();
    expect(screen.getByText(/Average Arranged Overdraft Balance/i)).toBeDefined();

    // Switch top-level container tabs
    fireEvent.click(screen.getByRole("button", { name: /Liability Accounts & Cards/i }));
    fireEvent.click(screen.getByRole("button", { name: /UK Debt Rules & Helplines/i }));
    fireEvent.click(screen.getByRole("button", { name: /Strategy & Payoff Simulator/i }));

    // Open Add Debt Modal and submit a new debt
    fireEvent.click(screen.getByRole("button", { name: /Add Debt/i }));
    const nameInput = screen.getByPlaceholderText(/Barclaycard Platinum/i);
    fireEvent.change(nameInput, { target: { value: "New Store Card" } });
    const form = nameInput.closest("form");
    if (form) fireEvent.submit(form);
    expect(screen.getByText("New Store Card")).toBeDefined();

    // Delete a debt item
    fireEvent.click(screen.getByRole("button", { name: /Delete Tesco Loan/i }));
  });
});
