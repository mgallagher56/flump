import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { manyRecords, taxRecordsFixture } from "../../__fixtures__/taxRecords";
import { TAX_RECORDS_PAGE_SIZE, TaxRecordsTable } from "./TaxRecordsTable";

const setup = (records = taxRecordsFixture) => {
  const handlers = { onEdit: vi.fn(), onDelete: vi.fn(), onViewReceipt: vi.fn(), onAdd: vi.fn() };
  render(<TaxRecordsTable records={records} taxYear="2026/27" {...handlers} />);
  return handlers;
};

describe("TaxRecordsTable", () => {
  it("lists the year's records newest first, in whole pounds, with how often they are paid", () => {
    setup();
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows[1].textContent).toContain("Laptop");
    // Whole pounds, as everywhere on the page; pence only where the record was entered with them.
    expect(rows[1].textContent).toContain("-£1,299");
    expect(rows[1].textContent).not.toContain("£1,299.00");
    // Income has no "+"; a monthly amount says so.
    const rent = rows.find((r) => r.textContent?.includes("Flat rent"));
    expect(rent?.textContent).toMatch(/£[\d,]+a month/);
    expect(rent?.textContent).not.toContain("+");
    // Only the records that count towards the page's tax year: "Old rent" ended in 2025/26.
    expect(screen.queryByRole("button", { name: "Old rent" })).toBeNull();
    expect(rows).toHaveLength(6);
  });

  it("shows pence only on an amount entered with pence", () => {
    const base = taxRecordsFixture[0];
    render(
      <TaxRecordsTable
        records={[{ ...base, id: "p1", name: "Stamps", amount: 12.5 }]}
        taxYear="2026/27"
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onViewReceipt={vi.fn()}
      />,
    );
    expect(within(screen.getByRole("table")).getAllByText(/£12\.50/).length).toBeGreaterThan(0);
  });

  it("always shows the search and filters, but no count line until they narrow the list", () => {
    setup();
    expect(screen.getByLabelText("Search records")).toBeDefined();
    expect(screen.getByLabelText("Income source")).toBeDefined();
    expect(screen.getByLabelText("Type")).toBeDefined();
    expect(screen.queryByLabelText("Tax year")).toBeNull();
    expect(screen.queryByText(/^Showing/)).toBeNull();
  });

  it("hides the source column and filter when the year has one source", () => {
    setup(taxRecordsFixture.filter((r) => r.source === "rental"));
    expect(screen.queryByRole("columnheader", { name: "Source" })).toBeNull();
    expect(screen.queryByLabelText("Income source")).toBeNull();
    expect(screen.getByLabelText("Type")).toBeDefined();
  });

  it("filters by source and type", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Income source"), { target: { value: "rental" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "expense" } });
    expect(screen.getByText("Showing 1 to 1 of 1 records")).toBeDefined();
    expect(screen.getByRole("button", { name: "Mortgage interest" })).toBeDefined();
  });

  it(`pages after ${TAX_RECORDS_PAGE_SIZE} rows`, () => {
    setup(manyRecords(23));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      TAX_RECORDS_PAGE_SIZE + 1,
    );
    expect(screen.getByText("Page 1 of 3")).toBeDefined();
    expect(
      (screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Showing 21 to 23 of 23 records")).toBeDefined();
    expect((screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("goes back to page 1 when a filter changes", () => {
    setup(manyRecords(23));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
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

  it("opens a record for editing when the row is clicked", async () => {
    const user = userEvent.setup();
    const { onEdit } = setup();
    const laptopRow = screen.getByRole("button", { name: "Laptop" }).closest("tr");
    if (!laptopRow) throw new Error("no row");
    const amountCell = within(laptopRow).getAllByRole("cell")[3];
    if (!amountCell) throw new Error("no amount cell");
    await user.click(amountCell);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "r4" }));
  });

  it("edits from the row's menu, with Edit above Delete", async () => {
    const user = userEvent.setup();
    const { onEdit } = setup();
    await user.click(screen.getByRole("button", { name: "Actions for Laptop" }));
    const items = await screen.findAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["Edit", "View receipt", "Delete"]);
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));
    // Once, from the menu: the click does not also reach the row.
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "r4" }));
  });

  it("deletes and views receipts from the row's menu", async () => {
    const user = userEvent.setup();
    const { onDelete, onViewReceipt, onEdit } = setup();
    await user.click(screen.getByRole("button", { name: "Actions for Laptop" }));
    await user.click(await screen.findByRole("menuitem", { name: "View receipt" }));
    expect(onViewReceipt).toHaveBeenCalledWith(expect.objectContaining({ id: "r4" }));
    await user.click(screen.getByRole("button", { name: "Actions for Laptop" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("r4");
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("shows an empty state with an add action when there are no records", () => {
    const { onAdd } = setup([]);
    fireEvent.click(screen.getByRole("button", { name: "Add record" }));
    expect(onAdd).toHaveBeenCalled();
  });

  it("sorts columns ascending and descending when headers are clicked", () => {
    setup();
    const recordHeader = screen.getByRole("columnheader", { name: "Record" });
    expect(recordHeader.getAttribute("aria-sort")).toBe("none");
    expect(screen.getByRole("columnheader", { name: "Date" }).getAttribute("aria-sort")).toBe(
      "descending",
    );
    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    expect(recordHeader.getAttribute("aria-sort")).toBe("ascending");
    const ascRows = within(screen.getByRole("table")).getAllByRole("row");
    expect(ascRows[1].textContent).toContain("Design retainer");

    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    expect(recordHeader.getAttribute("aria-sort")).toBe("descending");
    const descRows = within(screen.getByRole("table")).getAllByRole("row");
    expect(descRows[1].textContent).toContain("Saver interest");
  });

  it("filters by search text", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Search records"), { target: { value: "mortgage" } });
    expect(screen.getByText("Showing 1 to 1 of 1 records")).toBeDefined();
    expect(screen.getByRole("button", { name: "Mortgage interest" })).toBeDefined();
  });
});
