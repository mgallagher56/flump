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
  editTermYears: "",
  editTermMonths: "",
  editMortgageType: "repayment",
  editFixEndDate: "",
  editPayment: null,
  saveError: null,
  onAddAccount: vi.fn(),
  onSave: vi.fn(),
  onEditLoanAmountChange: vi.fn(),
  onEditInterestRateChange: vi.fn(),
  onEditTermYearsChange: vi.fn(),
  onEditTermMonthsChange: vi.fn(),
  onEditMortgageTypeChange: vi.fn(),
  onEditFixEndDateChange: vi.fn(),
  editMonthlyPayment: 1250,
  onEditMonthlyPaymentChange: vi.fn(),
});

describe("<MortgageEditDialog />", () => {
  it("holds the linked account choice and uses currency and percent inputs, never type=number", () => {
    const props = baseProps();
    customRender(<MortgageEditDialog {...props} />);
    const dialog = screen.getByRole("dialog", { name: "Edit your mortgage details" });
    expect(dialog.querySelector('input[type="number"]')).toBeNull();
    const select = screen.getByLabelText("Mortgage account") as HTMLSelectElement;
    // No "none" option: unlinking would blank the form and could clear stored figures on save.
    expect(Array.from(select.options).map((o) => o.value)).toEqual(["m1"]);
    expect(select.textContent).not.toMatch(/No account linked/);
    fireEvent.change(select, { target: { value: "m1" } });
    expect(props.onSelectAccount).toHaveBeenCalledWith("m1");
    fireEvent.change(screen.getByLabelText(/^Interest rate/), { target: { value: "4.5" } });
    expect(props.onEditInterestRateChange).toHaveBeenCalledWith("4.5");
    fireEvent.change(screen.getByLabelText(/^Years left/), { target: { value: "18" } });
    expect(props.onEditTermYearsChange).toHaveBeenCalledWith("18");
    fireEvent.change(screen.getByLabelText(/^Months/), { target: { value: "2" } });
    expect(props.onEditTermMonthsChange).toHaveBeenCalledWith("2");
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

  it("prefills the saved monthly payment and reports a change", () => {
    const props = baseProps();
    customRender(<MortgageEditDialog {...props} />);
    const input = screen.getByLabelText(/^Monthly payment/) as HTMLInputElement;
    expect(input.value).toContain("1,250");
    expect(
      screen.getByText("The amount you pay your lender each month, without any overpayment."),
    ).toBeTruthy();
    fireEvent.change(input, { target: { value: "1300" } });
    fireEvent.blur(input);
    expect(props.onEditMonthlyPaymentChange).toHaveBeenCalledWith(1300);
  });

  it("does not offer the monthly payment without a linked account", () => {
    customRender(<MortgageEditDialog {...baseProps()} canSaveTerm={false} mortgageAccounts={[]} />);
    expect(screen.queryByLabelText(/^Monthly payment/)).toBeNull();
  });

  it("shows the term as whole years and months, with no decimal years or read-back line", () => {
    customRender(<MortgageEditDialog {...baseProps()} editTermMonths="2" editTermYears="18" />);
    expect((screen.getByLabelText(/^Years left/) as HTMLInputElement).value).toBe("18");
    expect((screen.getByLabelText(/^Months/) as HTMLInputElement).value).toBe("2");
    expect(screen.queryByText(/^That is /)).toBeNull();
  });

  it("shows the estimate in whole pounds only while no payment is entered", () => {
    const { unmount } = customRender(<MortgageEditDialog {...baseProps()} editPayment={1250.32} />);
    expect(screen.queryByText("Monthly payment (estimate)")).toBeNull();
    unmount();
    customRender(
      <MortgageEditDialog {...baseProps()} editMonthlyPayment={null} editPayment={1250.32} />,
    );
    const row = screen.getByText("Monthly payment (estimate)").parentElement as HTMLElement;
    expect(row.textContent).toContain("£1,250");
    expect(row.textContent).not.toContain("1,250.32");
  });

  it("shows a save error as an alert", () => {
    customRender(<MortgageEditDialog {...baseProps()} saveError="We could not save." />);
    expect(screen.getByRole("alert").textContent).toContain("We could not save.");
  });
});
