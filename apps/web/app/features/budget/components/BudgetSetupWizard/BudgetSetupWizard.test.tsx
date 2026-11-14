import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BudgetEntry } from "~/types/budget";
import { BudgetSetupWizard } from "./BudgetSetupWizard";

const mockEntries: BudgetEntry[] = [
  {
    id: "entry-1",
    userId: "user-1",
    category: "income",
    name: "Salary",
    amount: 3000,
    frequency: "monthly",
    isIncome: true,
    isPrimaryIncome: true,
    isEssential: true,
    notes: null,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "entry-2",
    userId: "user-1",
    category: "housing",
    name: "Rent",
    amount: 1000,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    notes: null,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("BudgetSetupWizard", () => {
  it("renders the welcome step and advances to income step", async () => {
    const onUpdateEntry = vi.fn().mockResolvedValue(undefined);
    const onAddEntry = vi.fn().mockResolvedValue(undefined);
    const onDeleteEntry = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(
      <BudgetSetupWizard
        entries={mockEntries}
        monthlyTakeHome={3000}
        onAddEntry={onAddEntry}
        onCancel={onCancel}
        onComplete={onComplete}
        onDeleteEntry={onDeleteEntry}
        onUpdateEntry={onUpdateEntry}
      />,
    );

    expect(screen.getByText("Set up your budget")).toBeDefined();

    // Click Next to go to Defaults step
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText(/start with example figures/i)).toBeDefined();

    // Click Start blank to go to Income step
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }));

    expect(await screen.findByText("Salary")).toBeDefined();
    expect(screen.getByText("Add income entry")).toBeDefined();
  });

  it("edit mode starts at Income with the saved entries, with no welcome or example figures", async () => {
    const onCancel = vi.fn();
    const onComplete = vi.fn();
    render(
      <BudgetSetupWizard
        entries={mockEntries}
        mode="edit"
        monthlyTakeHome={3000}
        onAddEntry={vi.fn().mockResolvedValue(undefined)}
        onCancel={onCancel}
        onComplete={onComplete}
        onDeleteEntry={vi.fn().mockResolvedValue(undefined)}
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText("Edit your budget")).toBeDefined();
    expect(screen.getByText("Step 1 of 6")).toBeDefined();
    expect(screen.queryByText("Set up your budget")).toBeNull();
    expect(screen.queryByText("Defaults")).toBeNull();
    expect(screen.getByRole("heading", { name: "Income" })).toBeDefined();
    expect(screen.getByText("Salary")).toBeDefined();

    // Back from the first step cancels, it never reaches the welcome or example figures.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      await screen.findByText(`Step ${i + 2} of 6`);
    }
    fireEvent.click(screen.getByRole("button", { name: "Finish editing" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("allows removing an item", async () => {
    const onUpdateEntry = vi.fn().mockResolvedValue(undefined);
    const onAddEntry = vi.fn().mockResolvedValue(undefined);
    const onDeleteEntry = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(
      <BudgetSetupWizard
        entries={mockEntries}
        monthlyTakeHome={3000}
        onAddEntry={onAddEntry}
        onCancel={onCancel}
        onComplete={onComplete}
        onDeleteEntry={onDeleteEntry}
        onUpdateEntry={onUpdateEntry}
      />,
    );

    // Advance through Defaults to Income step
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(await screen.findByRole("button", { name: /start blank/i }));
    await screen.findByText("Salary");

    // Click the delete button for Salary
    const confirmSpy = vi.fn();
    vi.stubGlobal("confirm", confirmSpy);
    const deleteButton = screen.getByTitle("Remove Salary");
    fireEvent.click(deleteButton);

    // Asks first: nothing is deleted until confirmed
    expect(screen.getByRole("alertdialog", { name: "Delete Salary?" })).toBeDefined();
    expect(onDeleteEntry).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete entry" }));

    await waitFor(() => {
      expect(onDeleteEntry).toHaveBeenCalledWith("entry-1");
    });
    expect(onDeleteEntry).toHaveBeenCalledTimes(1);
  });

  it("cancelling the remove confirm does not delete", async () => {
    const onDeleteEntry = vi.fn().mockResolvedValue(undefined);
    render(
      <BudgetSetupWizard
        entries={mockEntries}
        monthlyTakeHome={3000}
        onAddEntry={vi.fn()}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
        onDeleteEntry={onDeleteEntry}
        onUpdateEntry={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(await screen.findByRole("button", { name: /start blank/i }));
    await screen.findByText("Salary");
    fireEvent.click(screen.getByTitle("Remove Salary"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDeleteEntry).not.toHaveBeenCalled();
  });

  it("allows adding a new item", async () => {
    const onUpdateEntry = vi.fn().mockResolvedValue(undefined);
    const onAddEntry = vi.fn().mockResolvedValue(undefined);
    const onDeleteEntry = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(
      <BudgetSetupWizard
        entries={mockEntries}
        monthlyTakeHome={3000}
        onAddEntry={onAddEntry}
        onCancel={onCancel}
        onComplete={onComplete}
        onDeleteEntry={onDeleteEntry}
        onUpdateEntry={onUpdateEntry}
      />,
    );

    // Advance through Defaults to Income step
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(await screen.findByRole("button", { name: /start blank/i }));
    await screen.findByText("Salary");

    // Click Add entry button
    fireEvent.click(screen.getByText("Add income entry"));

    // Fill in new item form
    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Freelance" } });

    const amountInput = screen.getByLabelText("Amount a month");
    fireEvent.change(amountInput, { target: { value: "500" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));

    await waitFor(() => {
      expect(onAddEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "income",
          name: "Freelance",
          amount: 500,
          isIncome: true,
        }),
      );
    });
  });

  it("allows applying example figures from the defaults step", async () => {
    const onAddEntry = vi.fn().mockResolvedValue(undefined);

    render(
      <BudgetSetupWizard
        entries={[]}
        monthlyTakeHome={2500}
        onAddEntry={onAddEntry}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
        onDeleteEntry={vi.fn()}
        onUpdateEntry={vi.fn()}
      />,
    );

    // Advance to Defaults step
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    const useDefaultsBtn = await screen.findByRole("button", {
      name: /use example figures/i,
    });
    fireEvent.click(useDefaultsBtn);

    await waitFor(() => {
      expect(onAddEntry).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Rent / Mortgage", amount: 0 }),
      );
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
