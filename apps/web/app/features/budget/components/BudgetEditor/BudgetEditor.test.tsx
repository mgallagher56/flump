import { ToastProvider } from "@repo/ui";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BudgetEntry } from "~/types/budget";
import { BudgetEditor, type BudgetEditorProps } from "./BudgetEditor";

const row = (overrides: Partial<BudgetEntry>): BudgetEntry => ({
  id: "b-1",
  userId: "u1",
  name: "Rent",
  category: "housing",
  amount: 1200,
  frequency: "monthly",
  isIncome: false,
  isPrimaryIncome: false,
  isEssential: true,
  notes: null,
  isDefault: false,
  createdAt: "",
  updatedAt: "",
  ...overrides,
});

const entries = [
  row({}),
  row({ id: "b-2", name: "Salary", category: "income", amount: 3000, isIncome: true }),
  row({ id: "b-3", name: "Gym", category: "expenses", amount: 40, isEssential: false }),
];

const setup = (props: Partial<BudgetEditorProps> = {}, withToast = false) => {
  const handlers = {
    onAdd: vi.fn().mockResolvedValue(undefined),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(true),
  };
  const ui = (
    <BudgetEditor
      categories={["housing", "bills", "expenses", "savings", "income", "pets"]}
      entries={entries}
      {...handlers}
      {...props}
    />
  );
  render(withToast ? <ToastProvider>{ui}</ToastProvider> : ui);
  return handlers;
};

describe("BudgetEditor", () => {
  it("shows Money in first, then the page's categories in order", () => {
    setup();
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Money in", "Housing", "Bills", "Expenses", "Savings", "Pets"]);
    expect(screen.getByTestId("budget-editor-name-b-2")).toBeDefined();
    // Income rows have no essential switch.
    expect(screen.queryByTestId("budget-editor-essential-b-2")).toBeNull();
  });

  it("saves a name on blur when it changed and is not empty", async () => {
    const { onUpdate } = setup();
    const name = screen.getByTestId("budget-editor-name-b-1");
    fireEvent.blur(name);
    expect(onUpdate).not.toHaveBeenCalled();
    fireEvent.change(name, { target: { value: "  " } });
    fireEvent.blur(name);
    expect(onUpdate).not.toHaveBeenCalled();
    expect((name as HTMLInputElement).value).toBe("Rent");
    fireEvent.change(name, { target: { value: "Rent and service charge" } });
    fireEvent.blur(name);
    expect(onUpdate).toHaveBeenCalledWith("b-1", { name: "Rent and service charge" });
  });

  it("saves an amount once on blur, not on each keystroke", () => {
    const { onUpdate } = setup();
    const amount = screen.getByTestId("budget-editor-amount-b-1");
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value: "1" } });
    fireEvent.change(amount, { target: { value: "13" } });
    fireEvent.change(amount, { target: { value: "1350" } });
    expect(onUpdate).not.toHaveBeenCalled();
    fireEvent.blur(amount);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith("b-1", { amount: 1350 });
  });

  it("does not save an unchanged amount", () => {
    const { onUpdate } = setup();
    const amount = screen.getByTestId("budget-editor-amount-b-1");
    fireEvent.focus(amount);
    fireEvent.blur(amount);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("saves a frequency change", () => {
    const { onUpdate } = setup();
    fireEvent.change(screen.getByTestId("budget-editor-frequency-b-1"), {
      target: { value: "annual" },
    });
    expect(onUpdate).toHaveBeenCalledWith("b-1", { frequency: "annual" });
  });

  it("saves the essential switch", () => {
    const { onUpdate } = setup();
    fireEvent.click(screen.getByTestId("budget-editor-essential-b-3"));
    expect(onUpdate).toHaveBeenCalledWith("b-3", { isEssential: true });
  });

  it("opens the add row from its quiet button, adds with the wizard's defaults, then closes it", async () => {
    const { onAdd } = setup();
    expect(screen.queryByTestId("budget-editor-new-name-expenses")).toBeNull();
    fireEvent.click(screen.getByTestId("budget-editor-open-add-expenses"));
    const add = screen.getByTestId("budget-editor-add-expenses") as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("budget-editor-new-name-expenses"), {
      target: { value: "Phone" },
    });
    const newAmount = screen.getByTestId("budget-editor-new-amount-expenses");
    fireEvent.focus(newAmount);
    fireEvent.change(newAmount, { target: { value: "25" } });
    fireEvent.click(add);
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "expenses",
          name: "Phone",
          amount: 25,
          frequency: "monthly",
          isIncome: false,
          isEssential: false,
        }),
      ),
    );
    await waitFor(() => expect(screen.queryByTestId("budget-editor-new-name-expenses")).toBeNull());
    expect(screen.getByTestId("budget-editor-open-add-expenses")).toBeDefined();
  });

  it("adds income as income, and other spending as essential", async () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByTestId("budget-editor-open-add-income"));
    fireEvent.change(screen.getByTestId("budget-editor-new-name-income"), {
      target: { value: "Child Benefit" },
    });
    fireEvent.click(screen.getByTestId("budget-editor-add-income"));
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ category: "income", isIncome: true, amount: 0 }),
      ),
    );
    fireEvent.click(screen.getByTestId("budget-editor-open-add-bills"));
    fireEvent.change(screen.getByTestId("budget-editor-new-name-bills"), {
      target: { value: "Water" },
    });
    fireEvent.click(screen.getByTestId("budget-editor-add-bills"));
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ category: "bills", isIncome: false, isEssential: true }),
      ),
    );
  });

  it("keeps the typed add row when adding fails", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("no"));
    setup({ onAdd });
    fireEvent.click(screen.getByTestId("budget-editor-open-add-bills"));
    fireEvent.change(screen.getByTestId("budget-editor-new-name-bills"), {
      target: { value: "Water" },
    });
    fireEvent.click(screen.getByTestId("budget-editor-add-bills"));
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect((screen.getByTestId("budget-editor-new-name-bills") as HTMLInputElement).value).toBe(
        "Water",
      ),
    );
  });

  it("asks before removing, naming the entry, then deletes", async () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Remove Rent" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Delete Rent?")).toBeDefined();
    expect(dialog.textContent).toContain("£1,200");
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete entry" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("b-1"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("cancelling the remove deletes nothing", async () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Remove Gym" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("shows one quiet toast per save, add and remove when a ToastProvider is present", async () => {
    setup({}, true);
    fireEvent.change(screen.getByTestId("budget-editor-frequency-b-1"), {
      target: { value: "weekly" },
    });
    expect(await screen.findByText("Saved")).toBeDefined();

    fireEvent.click(screen.getByTestId("budget-editor-open-add-bills"));
    fireEvent.change(screen.getByTestId("budget-editor-new-name-bills"), {
      target: { value: "Water" },
    });
    fireEvent.click(screen.getByTestId("budget-editor-add-bills"));
    expect(await screen.findByText("Entry added")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Remove Rent" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete entry" }));
    expect(await screen.findByText("Entry removed")).toBeDefined();
  });

  it("shows no toast when a save fails", async () => {
    setup({ onUpdate: vi.fn().mockRejectedValue(new Error("no")) }, true);
    fireEvent.change(screen.getByTestId("budget-editor-frequency-b-1"), {
      target: { value: "weekly" },
    });
    await waitFor(() => expect(screen.queryByText("Saved")).toBeNull());
  });
});
