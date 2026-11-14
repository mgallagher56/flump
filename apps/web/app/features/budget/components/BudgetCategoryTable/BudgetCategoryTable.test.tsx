import { fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { BudgetCategoryTable, type BudgetCategoryTableProps } from "./BudgetCategoryTable";

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

  test("icon-only row actions have accessible names", () => {
    const { getByRole } = customRender(<BudgetCategoryTable {...defaultProps} />);
    expect(getByRole("button", { name: "Edit Mortgage" })).toBeDefined();
    expect(getByRole("button", { name: "Delete Mortgage" })).toBeDefined();
  });

  test("renders the category table and adds a new entry from the dialog", async () => {
    const { getByText, getByRole, getByLabelText } = customRender(
      <BudgetCategoryTable {...defaultProps} />,
    );

    expect(getByRole("heading", { name: "Housing" })).toBeDefined();
    expect(getByText("Mortgage")).toBeDefined();
    expect(getByText("Essential")).toBeDefined();

    fireEvent.click(getByRole("button", { name: "Add entry" }));
    fireEvent.change(getByLabelText(/Name/), { target: { value: "Water Bill" } });
    fireEvent.change(getByLabelText(/Amount/), { target: { value: "45" } });
    fireEvent.click(getByRole("button", { name: "Save" }));

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

  test("edits an existing entry", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { getByRole, getByLabelText } = customRender(
      <BudgetCategoryTable {...defaultProps} onUpdate={onUpdate} />,
    );
    fireEvent.click(getByRole("button", { name: "Edit Mortgage" }));
    fireEvent.change(getByLabelText(/Name/), { target: { value: "Mortgage payment" } });
    fireEvent.click(getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(
        "entry-1",
        expect.objectContaining({ name: "Mortgage payment", amount: 1200 }),
      ),
    );
  });

  test("delete opens a confirm and does not call window.confirm", async () => {
    const confirmSpy = vi.fn();
    vi.stubGlobal("confirm", confirmSpy);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { getByTitle, getByRole } = customRender(
      <BudgetCategoryTable {...defaultProps} onDelete={onDelete} />,
    );

    fireEvent.click(getByTitle("Delete"));
    expect(getByRole("alertdialog", { name: "Delete Mortgage?" })).toBeDefined();
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(getByRole("button", { name: "Delete entry" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("entry-1"));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  test("keeps the confirm open and pending until onDelete resolves", async () => {
    let resolve!: () => void;
    const onDelete = vi.fn().mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const { getByTitle, getByRole, queryByRole } = customRender(
      <BudgetCategoryTable {...defaultProps} onDelete={onDelete} />,
    );
    fireEvent.click(getByTitle("Delete"));
    fireEvent.click(getByRole("button", { name: "Delete entry" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    expect(getByRole("alertdialog", { name: "Delete Mortgage?" })).toBeDefined();
    expect((getByRole("button", { name: "Delete entry" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    resolve();
    await waitFor(() => expect(queryByRole("alertdialog")).toBeNull());
  });

  test("cancelling the delete confirm does nothing", () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const { getByTitle, getByRole } = customRender(
      <BudgetCategoryTable {...defaultProps} onDelete={onDelete} />,
    );
    fireEvent.click(getByTitle("Delete"));
    fireEvent.click(getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  test("shows renewal badges and frequency detail for bills", () => {
    const soonDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const expiredDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const base = defaultEntries[0] as BudgetCategoryTableProps["entries"][number];
    const { getByText } = customRender(
      <BudgetCategoryTable
        {...defaultProps}
        category="bills"
        entries={[
          {
            ...base,
            id: "e-soon",
            name: "Broadband",
            frequency: "annual",
            contractEndDate: soonDate,
          },
          {
            ...base,
            id: "e-exp",
            name: "Mobile",
            frequency: "weekly",
            contractEndDate: expiredDate,
          },
        ]}
      />,
    );
    expect(getByText(/Renews in \d+ days/)).toBeDefined();
    expect(getByText(/Ended \d+ days ago/)).toBeDefined();
    expect(getByText("Yearly, £1,200 a year")).toBeDefined();
  });

  test("keeps rows beyond eight behind a drawer", () => {
    const base = defaultEntries[0] as BudgetCategoryTableProps["entries"][number];
    const many = Array.from({ length: 10 }, (_, i) => ({
      ...base,
      id: `row-${i}`,
      name: `Item ${i}`,
    }));
    const { getByText } = customRender(<BudgetCategoryTable {...defaultProps} entries={many} />);
    expect(getByText("2 more entries")).toBeDefined();
  });

  test("shows an empty state with an add action", () => {
    const { getByText, getAllByRole } = customRender(
      <BudgetCategoryTable {...defaultProps} entries={[]} />,
    );
    expect(getByText("Nothing here yet")).toBeDefined();
    expect(getAllByRole("button", { name: /Add/ }).length).toBeGreaterThan(0);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
