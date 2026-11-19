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

  it("disables Save while a save is being sent", () => {
    const props = { ...baseProps(), saving: true };
    customRender(<MortgageEditDialog {...props} />);
    const saveButton = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
    fireEvent.click(saveButton);
    expect(props.onSave).not.toHaveBeenCalled();
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
    // The note is behind an info button; the field names its hidden copy in aria-describedby.
    const noteIds = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(noteIds.map((id) => document.getElementById(id)?.textContent)).toContain(
      "The amount you pay your lender each month, without any overpayment",
    );
    expect(screen.getByRole("button", { name: "About the monthly payment" })).toBeDefined();
    fireEvent.change(input, { target: { value: "1300" } });
    fireEvent.blur(input);
    expect(props.onEditMonthlyPaymentChange).toHaveBeenCalledWith(1300);
  });

  it("does not offer the monthly payment without a linked account", () => {
    customRender(<MortgageEditDialog {...baseProps()} canSaveTerm={false} mortgageAccounts={[]} />);
    expect(screen.queryByLabelText(/^Monthly payment/)).toBeNull();
  });

  it("keeps field notes behind info buttons, read with their fields, and no visible hints", () => {
    const { container } = customRender(
      <MortgageEditDialog
        {...baseProps()}
        editHomeValue={null}
        homeValueMode="input"
        onEditHomeValueChange={vi.fn()}
      />,
    );
    const described = (label: RegExp) =>
      (screen.getByLabelText(label).getAttribute("aria-describedby") ?? "")
        .split(" ")
        .map((id) => document.getElementById(id)?.textContent ?? "");
    expect(described(/^Remaining balance/)).toContain("Saved on your mortgage account");
    expect(described(/^Years left/)).toContain("Saved on your mortgage account");
    expect(described(/^What your home is worth/)).toContain(
      "Your own estimate. Saved as your home on Accounts.",
    );
    for (const name of [
      "About the remaining balance",
      "About years left",
      "About the monthly payment",
      "About your home value",
    ]) {
      expect(screen.getByRole("button", { name })).toBeDefined();
    }
    // No FormField hint paragraphs remain.
    expect(container.ownerDocument.querySelectorAll("[id$='-hint']")).toHaveLength(0);
  });

  it("types the term into whole number fields with no leading zero", () => {
    const props = { ...baseProps(), editTermYears: "0", editTermMonths: "0" };
    customRender(<MortgageEditDialog {...props} />);
    const years = screen.getByLabelText(/^Years left/) as HTMLInputElement;
    fireEvent.change(years, { target: { value: "018" } });
    expect(props.onEditTermYearsChange).toHaveBeenLastCalledWith("18");
    const months = screen.getByLabelText(/^Months/) as HTMLInputElement;
    fireEvent.change(months, { target: { value: "" } });
    // Empty stays empty, never 0.
    expect(props.onEditTermMonthsChange).toHaveBeenLastCalledWith("");
  });

  it("shows the term as whole years and months, with no decimal years or read-back line", () => {
    customRender(<MortgageEditDialog {...baseProps()} editTermMonths="2" editTermYears="18" />);
    expect((screen.getByLabelText(/^Years left/) as HTMLInputElement).value).toBe("18");
    expect((screen.getByLabelText(/^Months/) as HTMLInputElement).value).toBe("2");
    expect(screen.queryByText(/^That is /)).toBeNull();
  });

  it("stacks years and months in one column below sm (P66)", () => {
    customRender(<MortgageEditDialog {...baseProps()} />);
    const pair = screen.getByLabelText(/^Years left/).closest('[class*="grid-tc"]');
    expect(pair?.className).toContain("grid-tc_minmax(0,_1fr)");
    expect(pair?.className).toContain("sm:grid-tc_repeat(2,_minmax(0,_1fr))");
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

  describe("home value", () => {
    it("is not offered unless the page asks for it", () => {
      customRender(<MortgageEditDialog {...baseProps()} />);
      expect(screen.queryByLabelText(/What your home is worth/)).toBeNull();
      expect(screen.queryByTestId("home-equity-line")).toBeNull();
    });

    it("offers the home value with its hint and reports changes", () => {
      const onEditHomeValueChange = vi.fn();
      customRender(
        <MortgageEditDialog
          {...baseProps()}
          editHomeValue={null}
          homeValueMode="input"
          onEditHomeValueChange={onEditHomeValueChange}
        />,
      );
      expect(screen.getByText("Your own estimate. Saved as your home on Accounts.")).toBeDefined();
      // No value typed: no equity line yet.
      expect(screen.queryByTestId("home-equity-line")).toBeNull();
      fireEvent.change(screen.getByLabelText(/^What your home is worth/), {
        target: { value: "300000" },
      });
      expect(onEditHomeValueChange).toHaveBeenCalledWith(300000);
    });

    it("shows the equity at the user's share for a joint mortgage", () => {
      customRender(
        <MortgageEditDialog
          {...baseProps()}
          editHomeValue={300000}
          homeSharePercent={50}
          homeValueMode="input"
          mortgageSharePercent={50}
          onEditHomeValueChange={vi.fn()}
        />,
      );
      // 300,000 x 50 / 100 - 135,400 x 50 / 100 = 150,000 - 67,700 = 82,300.
      const line = screen.getByTestId("home-equity-line");
      expect(line.textContent).toContain("£82,300");
      expect(line.textContent).toContain("At your 50% share");
    });

    it("with two or more homes shows where the value comes from instead of the field", () => {
      customRender(
        <MortgageEditDialog {...baseProps()} editHomeValue={450000} homeValueMode="fromAccounts" />,
      );
      expect(screen.queryByLabelText(/What your home is worth/)).toBeNull();
      expect(
        screen.getByText(
          "You have more than one property on Accounts, so we cannot tell which is your home. Change each value on Accounts.",
        ),
      ).toBeDefined();
      // One mortgage against several homes would misstate the equity, so no line shows.
      expect(screen.queryByTestId("home-equity-line")).toBeNull();
    });

    it("asks what the property is worth for buy to let", () => {
      customRender(
        <MortgageEditDialog
          {...baseProps()}
          editHomeValue={null}
          homeValueMode="input"
          propertyCategory="btl"
          onEditHomeValueChange={vi.fn()}
        />,
      );
      expect(screen.getByLabelText(/^What the property is worth/)).toBeDefined();
      expect(screen.queryByText(/Saved as your home on Accounts/)).toBeNull();
    });

    it("says which rental is unclear for buy to let with two or more rental properties", () => {
      customRender(
        <MortgageEditDialog {...baseProps()} homeValueMode="fromAccounts" propertyCategory="btl" />,
      );
      expect(
        screen.getByText(
          "You have more than one rental property on Accounts, so we cannot tell which this mortgage is on. Change each value on Accounts.",
        ),
      ).toBeDefined();
    });

    it("lets buy to let choose between its mortgage accounts", () => {
      const onSelectAccount = vi.fn();
      customRender(
        <MortgageEditDialog
          {...baseProps()}
          mortgageAccounts={[
            { id: "b1", name: "Flat 2 mortgage", balance: -150000 },
            { id: "b2", name: "Harbour Street mortgage", balance: -90000 },
          ]}
          propertyCategory="btl"
          selectedAccountId="b1"
          onSelectAccount={onSelectAccount}
        />,
      );
      const select = screen.getByLabelText("Mortgage account") as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "b2" } });
      expect(onSelectAccount).toHaveBeenCalledWith("b2");
    });
  });
});
