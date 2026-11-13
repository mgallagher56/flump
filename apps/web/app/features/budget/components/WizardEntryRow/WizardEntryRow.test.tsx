import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BudgetEntry } from "~/types/budget";
import { WizardEntryRow } from "./WizardEntryRow";

const entry: BudgetEntry = {
  id: "e1",
  userId: "u",
  category: "bills",
  name: "Energy",
  amount: 120,
  frequency: "monthly",
  isIncome: false,
  isPrimaryIncome: false,
  isEssential: true,
  notes: null,
  isDefault: false,
  createdAt: "",
  updatedAt: "",
};

describe("<WizardEntryRow />", () => {
  it("reports amount, frequency and essential changes", () => {
    const onUpdate = vi.fn();
    render(<WizardEntryRow entry={entry} onDelete={vi.fn()} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByLabelText("Amount for Energy"), { target: { value: "150" } });
    expect(onUpdate).toHaveBeenCalledWith("e1", { amount: 150 });
    fireEvent.change(screen.getByLabelText("Frequency for Energy"), {
      target: { value: "annual" },
    });
    expect(onUpdate).toHaveBeenCalledWith("e1", { frequency: "annual" });
    fireEvent.click(screen.getByRole("button", { name: "Essential" }));
    expect(onUpdate).toHaveBeenCalledWith("e1", { isEssential: false });
  });

  it("sends 0 when the field is cleared and asks to remove", () => {
    const onUpdate = vi.fn();
    const onDelete = vi.fn();
    render(<WizardEntryRow entry={entry} onDelete={onDelete} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByLabelText("Amount for Energy"), { target: { value: "" } });
    expect(onUpdate).toHaveBeenCalledWith("e1", { amount: 0 });
    fireEvent.click(screen.getByTitle("Remove Energy"));
    expect(onDelete).toHaveBeenCalledWith("e1");
  });
});
