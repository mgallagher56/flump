import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { MortgageEditDialog, type MortgageEditDialogProps } from "./MortgageEditDialog";

const baseProps = (): MortgageEditDialogProps => ({
  open: true,
  onOpenChange: vi.fn(),
  propertyCategory: "residential",
  canSaveFigures: true,
  canSaveTerm: true,
  mortgageAccounts: [{ id: "m1", name: "HSBC Fixed Mortgage", balance: -135400 }],
  selectedAccountId: "m1",
  onSelectAccount: vi.fn(),
  editLoanAmount: 135400,
  editInterestRate: "",
  editRemainingTerm: "",
  editMortgageType: "repayment",
  editFixEndDate: "",
  editPayment: null,
  saveError: null,
  onAddAccount: vi.fn(),
  onSave: vi.fn(),
  onEditLoanAmountChange: vi.fn(),
  onEditInterestRateChange: vi.fn(),
  onEditRemainingTermChange: vi.fn(),
  onEditMortgageTypeChange: vi.fn(),
  onEditFixEndDateChange: vi.fn(),
});

describe("<MortgageEditDialog />", () => {
  it("holds the linked account choice and uses currency and percent inputs, never type=number", () => {
    const props = baseProps();
    customRender(<MortgageEditDialog {...props} />);
    const dialog = screen.getByRole("dialog", { name: "Edit your mortgage details" });
    expect(dialog.querySelector('input[type="number"]')).toBeNull();
    fireEvent.change(screen.getByLabelText("Mortgage account"), { target: { value: "" } });
    expect(props.onSelectAccount).toHaveBeenCalledWith(null);
    fireEvent.change(screen.getByLabelText(/^Interest rate/), { target: { value: "4.5" } });
    expect(props.onEditInterestRateChange).toHaveBeenCalledWith("4.5");
    fireEvent.change(screen.getByLabelText(/^Years left/), { target: { value: "18" } });
    expect(props.onEditRemainingTermChange).toHaveBeenCalledWith("18");
  });

  it("chooses the repayment type with radio cards and saves or cancels", () => {
    const props = baseProps();
    customRender(<MortgageEditDialog {...props} />);
    fireEvent.click(screen.getByRole("radio", { name: /Interest-only/ }));
    expect(props.onEditMortgageTypeChange).toHaveBeenCalledWith("interest-only");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(props.onSave).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("offers to add an account instead of fields that could not be saved", () => {
    const props = {
      ...baseProps(),
      canSaveFigures: false,
      canSaveTerm: false,
      mortgageAccounts: [],
    };
    customRender(<MortgageEditDialog {...props} />);
    expect(screen.queryByLabelText(/^Remaining balance/)).toBeNull();
    expect(screen.queryByLabelText(/^Years left/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add mortgage account" }));
    expect(props.onAddAccount).toHaveBeenCalled();
  });

  it("shows a save error as an alert", () => {
    customRender(<MortgageEditDialog {...baseProps()} saveError="We could not save." />);
    expect(screen.getByRole("alert").textContent).toContain("We could not save.");
  });
});
