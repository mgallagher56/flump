import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MortgageSummary, type MortgageSummaryProps } from "./MortgageSummary";

const base = (over: Partial<MortgageSummaryProps> = {}): MortgageSummaryProps => ({
  propertyCategory: "residential",
  loanAmount: 150000,
  interestRate: 4.5,
  remainingTerm: 25,
  mortgageType: "repayment",
  monthlyPayment: 833.76,
  isEditing: false,
  editLoanAmount: 150000,
  editInterestRate: "4.5",
  editRemainingTerm: "25",
  editMortgageType: "repayment",
  editPayment: 833.76,
  saveMessage: null,
  saveError: null,
  canSaveFigures: true,
  canSaveTerm: true,
  lastUpdated: "Last updated June 2026",
  onAddAccount: vi.fn(),
  onStartEditing: vi.fn(),
  onCancelEditing: vi.fn(),
  onSave: vi.fn(),
  onEditLoanAmountChange: vi.fn(),
  onEditInterestRateChange: vi.fn(),
  onEditRemainingTermChange: vi.fn(),
  onEditMortgageTypeChange: vi.fn(),
  ...over,
});

describe("<MortgageSummary />", () => {
  it("shows four KPIs with known values", () => {
    render(<MortgageSummary {...base()} />);
    expect(screen.getByText("Remaining balance")).toBeDefined();
    expect(screen.getByText("25 years")).toBeDefined();
    expect(screen.queryByText("Not set")).toBeNull();
  });

  it("renders Not set with an action for unknown values, never zero", () => {
    const onStartEditing = vi.fn();
    render(
      <MortgageSummary
        {...base({
          loanAmount: 0,
          interestRate: 0,
          remainingTerm: 0,
          monthlyPayment: null,
          onStartEditing,
        })}
      />,
    );
    expect(screen.getAllByText("Not set")).toHaveLength(4);
    expect(screen.queryByText(/0 years/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add interest rate" }));
    expect(onStartEditing).toHaveBeenCalled();
  });

  it("reports repayment type changes while editing", () => {
    const onEditMortgageTypeChange = vi.fn();
    render(<MortgageSummary {...base({ isEditing: true, onEditMortgageTypeChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "Interest-only" }));
    expect(onEditMortgageTypeChange).toHaveBeenCalledWith("interest-only");
  });

  it("shows a Saved line with the last-updated date and an Edit button", () => {
    render(<MortgageSummary {...base()} />);
    expect(screen.getByTestId("mortgage-saved-line").textContent).toContain(
      "Saved. Last updated June 2026",
    );
    expect(screen.getByRole("button", { name: "Edit" })).toBeDefined();
  });

  it("puts the hero surface on the saved balance", () => {
    const { container } = render(<MortgageSummary {...base()} />);
    const hero = container.querySelectorAll("[data-tone='hero']");
    expect(hero).toHaveLength(1);
    expect(hero[0]?.textContent).toContain("Remaining balance");
  });

  it("offers the balance and rate fields only when they can be saved", () => {
    const { rerender } = render(<MortgageSummary {...base({ isEditing: true })} />);
    expect(screen.getByLabelText(/^Remaining balance/)).toBeDefined();
    const onAddAccount = vi.fn();
    rerender(
      <MortgageSummary
        {...base({ isEditing: true, canSaveFigures: false, canSaveTerm: false, onAddAccount })}
      />,
    );
    expect(screen.queryByLabelText(/^Remaining balance/)).toBeNull();
    expect(screen.queryByLabelText(/^Interest rate/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add mortgage account" }));
    expect(onAddAccount).toHaveBeenCalled();
  });
});
