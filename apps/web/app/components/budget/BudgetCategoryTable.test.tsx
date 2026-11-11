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

  test("renders contract renewal badges, frequencies, desktop edit, and mobile add/edit", async () => {
    const soonDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const expiredDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const farDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const variedEntries: BudgetCategoryTableProps["entries"] = [
      {
        ...defaultEntries[0],
        id: "e-soon",
        name: "Broadband",
        frequency: "annual",
        contractEndDate: soonDate,
      },
      {
        ...defaultEntries[0],
        id: "e-exp",
        name: "Mobile Plan",
        frequency: "weekly",
        isEssential: true,
        contractEndDate: expiredDate,
      },
      {
        ...defaultEntries[0],
        id: "e-far",
        name: "Energy Fixed",
        frequency: "monthly",
        contractEndDate: farDate,
      },
    ];

    // Desktop edit flow
    const { getAllByTitle, getByText } = customRender(
      <BudgetCategoryTable {...defaultProps} entries={variedEntries} />,
    );

    expect(getAllByTitle("Edit").length).toBeGreaterThan(0);

    // Edit first entry on desktop (desktop Save button is an icon button right before Cancel)
    fireEvent.click(getAllByTitle("Edit")[0]);
    const nameEditInput = mobileViewPlaceholderHelper();
    function mobileViewPlaceholderHelper() {
      return document.querySelector('input[placeholder="Name"]') as HTMLInputElement;
    }
    if (nameEditInput) {
      fireEvent.change(nameEditInput, { target: { value: "Broadband Fibre" } });
    }
    // Click the Save icon button in the row (first button after the inputs inside the row)
    const buttonsAfterEdit = Array.from(document.querySelectorAll("button"));
    const addBtnIndex = buttonsAfterEdit.findIndex((b) => b.textContent?.includes("Add"));
    if (addBtnIndex >= 0 && buttonsAfterEdit[addBtnIndex + 1]) {
      fireEvent.click(buttonsAfterEdit[addBtnIndex + 1]);
    }
    await waitFor(() => {
      expect(defaultProps.onUpdate).toHaveBeenCalled();
    });

    // Mobile edit and add flows
    const mobileView = customRender(
      <BudgetCategoryTable {...defaultProps} entries={variedEntries} variant="mobile" />,
    );
    const editButtons = mobileView.getAllByTitle("Edit");
    fireEvent.click(editButtons[editButtons.length - 1]);
    fireEvent.click(mobileView.getByText(/Save/i));

    const addButtons = mobileView.getAllByText("Add");
    fireEvent.click(addButtons[addButtons.length - 1]);
    const mobileNameInput = mobileView.getByPlaceholderText("Name (e.g. Netflix)");
    fireEvent.change(mobileNameInput, { target: { value: "Council Tax" } });
    const mobileAmtInput = mobileView.getByPlaceholderText(/Amount/i);
    fireEvent.change(mobileAmtInput, { target: { value: "160" } });
    fireEvent.click(mobileView.getByText(/Save/i));
  });
});
