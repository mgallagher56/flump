import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  BudgetEntryDialog,
  type BudgetEntryDialogProps,
  EMPTY_ENTRY_VALUES,
} from "./BudgetEntryDialog";

const setup = (over: Partial<BudgetEntryDialogProps> = {}) => {
  const props: BudgetEntryDialogProps = {
    mode: "add",
    initial: EMPTY_ENTRY_VALUES,
    categoryLabel: "Bills",
    isIncome: false,
    showContractDate: true,
    saving: false,
    onSave: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(<BudgetEntryDialog {...props} />);
  return props;
};

describe("<BudgetEntryDialog />", () => {
  it("keeps Save disabled until a name and an amount are entered", () => {
    const { onSave } = setup();
    const save = screen.getByRole("button", { name: "Save" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: "Water bill" } });
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: "45" } });
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Water bill", amount: 45, frequency: "monthly" }),
    );
  });

  it("hides the essential switch for income and the contract date outside bills", () => {
    setup({ isIncome: true, showContractDate: false, categoryLabel: "Income" });
    expect(screen.queryByLabelText("Essential spending")).toBeNull();
    expect(screen.queryByLabelText(/Contract end date/)).toBeNull();
  });

  it("starts from the entry being edited", () => {
    setup({
      mode: "edit",
      initial: { ...EMPTY_ENTRY_VALUES, name: "Broadband", amount: 30 },
    });
    expect(screen.getByText("Edit entry")).toBeDefined();
    expect((screen.getByLabelText(/Name/) as HTMLInputElement).value).toBe("Broadband");
  });
});
