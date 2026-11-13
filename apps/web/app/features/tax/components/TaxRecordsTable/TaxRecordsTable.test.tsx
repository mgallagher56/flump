import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { manyRecords, taxRecordsFixture } from "../../__fixtures__/taxRecords";
import { TAX_RECORDS_PAGE_SIZE, TaxRecordsTable } from "./TaxRecordsTable";

const setup = (records = taxRecordsFixture) => {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onViewReceipt: vi.fn(), onAdd: vi.fn() };
  render(
    <TaxRecordsTable records={records} availableYears={["2025/26", "2026/27"]} {...handlers} />,
  );
  return handlers;
};

describe("TaxRecordsTable", () => {
  it("lists records newest first with signed, tabular amounts", () => {
    setup();
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows[1].textContent).toContain("Laptop");
    expect(rows[1].textContent).toContain("-£1,299.00");
    expect(screen.getByText("Showing 1 to 6 of 6 records")).toBeDefined();
  });

  it("filters by source and type", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Income source"), { target: { value: "rental" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "expense" } });
    expect(screen.getByText("Showing 1 to 1 of 1 records")).toBeDefined();
    expect(screen.getByRole("button", { name: "Mortgage interest" })).toBeDefined();
  });

  it("filters by tax year", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Tax year"), { target: { value: "2025/26" } });
    expect(screen.getByRole("button", { name: "Old rent" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Laptop" })).toBeNull();
  });

  it(`pages after ${TAX_RECORDS_PAGE_SIZE} rows`, () => {
    setup(manyRecords(23));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      TAX_RECORDS_PAGE_SIZE + 1,
    );
    expect(screen.getByText("Page 1 of 3")).toBeDefined();
    expect((screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Showing 21 to 23 of 23 records")).toBeDefined();
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("goes back to page 1 when a filter changes", () => {
    setup(manyRecords(23));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "expense" } });
    expect(screen.getByText("Page 1 of 3")).toBeDefined();
  });

  it("opens a record for editing from the keyboard (J-03)", async () => {
    const user = userEvent.setup();
    const { onEdit } = setup();
    screen.getByRole("button", { name: "Flat rent" }).focus();
    await user.keyboard("{Enter}");
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "r1" }));
  });

  it("deletes and views receipts through their own buttons", () => {
    const { onDelete, onViewReceipt, onEdit } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Delete Laptop" }));
    expect(onDelete).toHaveBeenCalledWith("r4");
    fireEvent.click(screen.getByRole("button", { name: "View receipt for Laptop" }));
    expect(onViewReceipt).toHaveBeenCalledWith(expect.objectContaining({ id: "r4" }));
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("shows an empty state with an add action when there are no records", () => {
    const { onAdd } = setup([]);
    fireEvent.click(screen.getByRole("button", { name: "Add a record" }));
    expect(onAdd).toHaveBeenCalled();
  });
});
