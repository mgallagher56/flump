import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import BudgetCategoryTable, { type BudgetCategoryTableProps } from "./BudgetCategoryTable";

describe("<BudgetCategoryTable />", () => {
  const defaultEntries: BudgetCategoryTableProps["entries"] = [
    {
      id: "entry-1",
      userId: "user-1",
      category: "housing",
      name: "Mortgage",
      amount: 1200,
      frequency: "monthly",
      isEssential: true,
      isIncome: false,
      isPrimaryIncome: false,
      isDefault: false,
      notes: "Fixed rate",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ];

  const defaultProps: BudgetCategoryTableProps = {
    category: "housing",
    entries: defaultEntries,
    onAdd: vi.fn().mockResolvedValue(undefined),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onDeleteCategory: vi.fn(),
  };

  test("renders category table, rows, and allows adding new entry", async () => {
    const { getByText, getByPlaceholderText } = customRender(
      <BudgetCategoryTable {...defaultProps} />,
    );

    expect(getByText("Housing")).toBeDefined();
    expect(getByText("Mortgage")).toBeDefined();
    expect(getByText("essential")).toBeDefined();

    // Click Add button
    fireEvent.click(getByText("Add"));

    // Fill in inputs
    const nameInput = getByPlaceholderText("Name (e.g. Netflix)");
    fireEvent.change(nameInput, { target: { value: "Water Bill" } });

    const amountInput = getByPlaceholderText(/Amount/i);
    fireEvent.change(amountInput, { target: { value: "45" } });

    // Save
    fireEvent.click(getByText("Save"));
    await waitFor(() => {
      expect(defaultProps.onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "housing",
          name: "Water Bill",
          amount: 45,
          frequency: "monthly",
        }),
      );
    });
  });

  test("allows deleting an entry", async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    const { getByTitle } = customRender(<BudgetCategoryTable {...defaultProps} />);

    const deleteBtn = getByTitle("Delete");
    fireEvent.click(deleteBtn);
    expect(defaultProps.onDelete).toHaveBeenCalledWith("entry-1");
  });

  test("renders mobile variant cleanly", () => {
    const { getByText } = customRender(<BudgetCategoryTable {...defaultProps} variant="mobile" />);
    expect(getByText("Housing")).toBeDefined();
    expect(getByText("Mortgage")).toBeDefined();
  });
});
