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

  it("shows a linked entry's figure from its saved fact, with no amount field", () => {
    render(
      <WizardEntryRow
        entry={{ ...entry, category: "savings", name: "Saver", amount: 0, linkKind: "savings" }}
        linked={{ value: 250, source: "From Easy access saver" }}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Amount for Saver")).toBeNull();
    expect(screen.getByText("From Easy access saver")).toBeDefined();
    expect(screen.getByText(/£250/)).toBeDefined();
  });

  it("shows Not set, never £0, for a linked entry whose saved fact is not set", () => {
    render(
      <WizardEntryRow
        entry={{ ...entry, category: "savings", name: "Saver", amount: 0, linkKind: "savings" }}
        linked={{ value: null, source: "The account this line used was removed or changed" }}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("Not set")).toBeDefined();
    expect(screen.queryByText(/£0/)).toBeNull();
  });
});
