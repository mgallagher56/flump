import { getCurrentUKTaxYear, getPreviousTaxYear, type TaxRecord } from "@flump/finance-engine";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const current = getCurrentUKTaxYear();
const start = current.slice(0, 4);
const previous = getPreviousTaxYear(current);

const rec = (over: Partial<TaxRecord>): TaxRecord =>
  ({
    id: "x",
    userId: "user-1",
    name: "Record",
    source: "self-employed",
    type: "income",
    category: "self_employed_income",
    amount: 100,
    frequency: "monthly",
    date: `${start}-04-06`,
    endDate: null,
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: `${start}-04-06T00:00:00Z`,
    updatedAt: `${start}-04-06T00:00:00Z`,
    ...over,
  }) as TaxRecord;

const records: TaxRecord[] = [
  rec({ id: "s1", name: "Design work", amount: 900 }),
  rec({ id: "s2", name: "Software", type: "expense", category: "office_costs", amount: 10 }),
  rec({ id: "r1", name: "Flat rent", source: "rental", category: "rental_income", amount: 1000 }),
  rec({
    id: "r2",
    name: "Mortgage interest",
    source: "rental",
    type: "expense",
    category: "mortgage_interest",
    amount: 300,
  }),
  rec({
    id: "p1",
    name: "Old design work",
    amount: 500,
    date: `${previous.slice(0, 4)}-04-06`,
    endDate: `${start}-04-05`,
  }),
];

let mockSource = "self-employed";
let mockSearch = "";
const mockSetSearchParams = vi.fn();
const mockSubmit = vi.fn();

vi.mock("react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
  useInRouterContext: () => false,
  useSearchParams: () => [new URLSearchParams(mockSearch), mockSetSearchParams],
  useLoaderData: () => ({
    source: mockSource,
    records,
    userProfile: { annualSalary: 40000, propertyOwnershipShare: 50, enabledPages: ["tax"] },
  }),
  useFetcher: () => ({ submit: mockSubmit, state: "idle", data: null }),
}));

import TaxSourceContainer from "./TaxSourceContainer";

describe("TaxSourceContainer", () => {
  beforeEach(() => {
    mockSource = "self-employed";
    mockSearch = "";
    mockSubmit.mockClear();
    mockSetSearchParams.mockClear();
  });

  it("is titled with the source and links back to Self Assessment on the same year", () => {
    render(<TaxSourceContainer />);
    expect(screen.getByRole("heading", { level: 1, name: "Self-employed" })).toBeDefined();
    const back = screen.getByRole("link", { name: "Back to Self Assessment" });
    expect(back.getAttribute("href")).toBe(
      `/app/self-assessment?year=${current.replace("/", "-")}`,
    );
    expect((screen.getByLabelText("Tax year") as HTMLSelectElement).value).toBe(current);
  });

  it("shows the year's income and expenses for the source, and nothing else in the strip", () => {
    const { container } = render(<TaxSourceContainer />);
    const strip = container.querySelector("[data-density='compact']") as HTMLElement;
    const cards = Array.from(strip.children).map((c) => c.textContent ?? "");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toContain("Income");
    expect(cards[0]).toContain("£10,800");
    expect(cards[1]).toContain("Expenses");
    expect(cards[1]).toContain("£120");
    expect(strip.textContent).not.toContain("Income after expenses");
  });

  it("opens on the year in the link and puts a new year in the link", () => {
    mockSearch = `year=${previous.replace("/", "-")}`;
    render(<TaxSourceContainer />);
    const select = screen.getByLabelText("Tax year") as HTMLSelectElement;
    expect(select.value).toBe(previous);
    fireEvent.change(select, { target: { value: current } });
    expect(mockSetSearchParams).toHaveBeenCalledWith(
      { year: current.replace("/", "-") },
      { replace: true, preventScrollReset: true },
    );
  });

  it("lists only this source's records", () => {
    render(<TaxSourceContainer />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Design work")).toBeDefined();
    expect(within(table).getByText("Software")).toBeDefined();
    expect(within(table).queryByText("Flat rent")).toBeNull();
  });

  it("sets the trading allowance beside the recorded expenses, with one notice", () => {
    render(<TaxSourceContainer />);
    expect(
      screen.getByRole("heading", { name: "Expenses and the trading allowance" }),
    ).toBeDefined();
    expect(screen.getByText(/uses the trading allowance, which is larger\./)).toBeDefined();
    expect(screen.getAllByRole("note")).toHaveLength(1);
    // The notice sits straight after the comparison it covers, before the records.
    const allowance = screen.getByTestId("allowance-self-employed");
    expect(allowance.nextElementSibling?.contains(screen.getByRole("note"))).toBe(true);
  });

  it("uses the owner's share for the property allowance", () => {
    mockSource = "rental";
    const { container } = render(<TaxSourceContainer />);
    expect(screen.getByRole("heading", { level: 1, name: "Rental property" })).toBeDefined();
    expect(container.textContent).toContain("These figures are your 50% share of the property.");
    // The strip shows the whole property, and says so on both cards.
    const strip = container.querySelector("[data-density='compact']") as HTMLElement;
    for (const card of Array.from(strip.children)) {
      expect(card.textContent).toContain("Whole property, this tax year");
    }
    expect(container.textContent).toContain("Mortgage interest is not in these expenses.");
  });

  it("has no allowance comparison for savings, and an empty state with both add actions", () => {
    mockSource = "savings";
    render(<TaxSourceContainer />);
    expect(screen.queryByRole("heading", { name: /allowance/ })).toBeNull();
    expect(screen.getByText(`No records for ${current}`)).toBeDefined();
    expect(screen.getByRole("button", { name: "Add income" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Add expense" })).toBeDefined();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("adds an expense to this source", () => {
    render(<TaxSourceContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Add expense" }));
    const dialog = screen.getByRole("dialog", { name: "Add a record" });
    expect((within(dialog).getByLabelText("Income source") as HTMLSelectElement).value).toBe(
      "self-employed",
    );
    expect((within(dialog).getByLabelText("Type") as HTMLSelectElement).value).toBe("expense");
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: "Train" } });
    fireEvent.change(within(dialog).getByLabelText(/^Amount/), { target: { value: "40" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add record" }));
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "create-transaction",
        source: "self-employed",
        type: "expense",
        amount: "40",
      }),
      { method: "POST" },
    );
  });

  it("deletes a record after confirming", async () => {
    const user = userEvent.setup();
    render(<TaxSourceContainer />);
    await user.click(screen.getByRole("button", { name: "Actions for Software" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete record" }));
    expect(mockSubmit).toHaveBeenCalledWith(
      { intent: "delete-transaction", id: "s2" },
      { method: "POST" },
    );
  });
});
