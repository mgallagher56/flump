import {
  getCurrentUKTaxYear,
  getNextTaxYear,
  getPreviousTaxYear,
  type TaxRecord,
} from "@flump/finance-engine";
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
// The profile's share is no longer read for tax (owner decision 6): the rental property's is.
const baseProfile = { annualSalary: 40000, propertyOwnershipShare: 100, enabledPages: ["tax"] };
const baseAccounts: Record<string, unknown>[] = [
  {
    id: "flat",
    name: "Flat 2",
    type: "Property",
    accountSubtype: "rental",
    ownership: "joint",
    sharePercent: 50,
  },
];
let mockAccounts: Record<string, unknown>[] | undefined = baseAccounts;
let mockProfile: Record<string, unknown> | undefined = baseProfile;
let mockRecords: TaxRecord[] | undefined = records;
let mockSearch = "";
const mockSetSearchParams = vi.fn();
const mockSubmit = vi.fn();
const fetcherData = { current: null as unknown };

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
    records: mockRecords,
    userProfile: mockProfile,
    accounts: mockAccounts,
  }),
  useFetcher: () => ({ submit: mockSubmit, state: "idle", data: fetcherData.current }),
}));

// A spy over the real calculateUKTax, to see what the fallback calculation passes it.
const calculateSpy = vi.hoisted(() => ({ fn: undefined as undefined | ReturnType<typeof vi.fn> }));
vi.mock("@flump/finance-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flump/finance-engine")>();
  calculateSpy.fn = vi.fn(actual.calculateUKTax);
  return { ...actual, calculateUKTax: calculateSpy.fn };
});

import { SCOTTISH_BANDS_NOTE } from "~/features/tax/tax-labels";
import TaxSourceContainer from "./TaxSourceContainer";

describe("TaxSourceContainer", () => {
  beforeEach(() => {
    mockSource = "self-employed";
    mockSearch = "";
    mockProfile = baseProfile;
    mockRecords = records;
    mockAccounts = baseAccounts;
    fetcherData.current = null;
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

  it("uses the rental property's share from Accounts for the property allowance", () => {
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

  it("self-employed, salary kept, rent but no self-employed record: no estimate, one prompt", () => {
    // Before: the rental page said which deduction "your Self Assessment estimate" used, worked
    // from £0 PAYE pay, with the Unverified estimate notice. The Dashboard says unknown.
    mockSource = "rental";
    mockProfile = { ...baseProfile, employmentType: "self-employed" };
    mockRecords = records.filter((r) => r.source === "rental");
    render(<TaxSourceContainer />);
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.queryByText(/Your Self Assessment estimate compares/)).toBeNull();
    expect(
      screen.getByText(
        "Add your self-employed income for this tax year to see an estimated tax bill.",
      ),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Add self-employed income" }).getAttribute("href"),
    ).toBe(`/app/self-assessment/self-employed?year=${current.replace("/", "-")}`);
  });

  it("passes the region and shares to the fallback calculation when the estimate is unknown", () => {
    // Self-employed with rent but no self-employed record: the estimate's inputs are unknown, so
    // the page works the ledger figures out without a salary. It still passes the saved region.
    mockSource = "rental";
    mockProfile = { ...baseProfile, employmentType: "self-employed", taxRegion: "SCOTLAND" };
    mockRecords = records.filter((r) => r.source === "rental");
    calculateSpy.fn?.mockClear();
    render(<TaxSourceContainer />);
    const calls = calculateSpy.fn?.mock.calls ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call[4]).toEqual({ region: "SCOTLAND", rentalShares: expect.anything() });
    }
  });

  it("folds the Scottish bands note into the page's one notice for a Scottish taxpayer", () => {
    mockProfile = { ...baseProfile, taxRegion: "SCOTLAND" };
    render(<TaxSourceContainer />);
    expect(screen.getAllByRole("note")).toHaveLength(1);
    expect(within(screen.getByRole("note")).getByText(SCOTTISH_BANDS_NOTE)).toBeDefined();
  });
});

describe("TaxSourceContainer, what the page decides (E41 M5)", () => {
  const next = getNextTaxYear(current);
  beforeEach(() => {
    mockSource = "self-employed";
    mockSearch = "";
    mockProfile = baseProfile;
    mockRecords = records;
    mockAccounts = baseAccounts;
    fetcherData.current = null;
    mockSubmit.mockClear();
  });

  const strip = () => document.querySelector("[data-density='compact']") as HTMLElement | null;
  const allowanceHeading = () => screen.queryByRole("heading", { name: /allowance/ });
  // Twelve month-end balances across the tax year, April to March.
  const yearOfBalances = (value: number) =>
    Array.from({ length: 12 }, (_, i) => ({
      year: Number(start) + (i < 9 ? 0 : 1),
      month: ((i + 3) % 12) + 1,
      value,
    }));
  const btlMortgage = {
    id: "m1",
    name: "Flat 2 mortgage",
    type: "Mortgage",
    accountSubtype: "btl_mortgage",
    interestRate: 4.5,
    balance: -150000,
    details: yearOfBalances(-150000),
  };
  const saver = {
    id: "s1",
    name: "Easy saver",
    type: "Saving",
    interestRate: 4,
    balance: 10000,
    details: yearOfBalances(10000),
  };

  it("offers mortgage interest on the rental page and savings interest on the savings page only", () => {
    mockAccounts = [...baseAccounts, btlMortgage, saver];
    for (const [source, shown, hidden] of [
      ["rental", "calculated-figure-m1", "calculated-figure-s1"],
      ["savings", "calculated-figure-s1", "calculated-figure-m1"],
    ] as const) {
      mockSource = source;
      const view = render(<TaxSourceContainer />);
      expect(screen.getByTestId(shown)).toBeDefined();
      expect(screen.queryByTestId(hidden)).toBeNull();
      view.unmount();
    }
    mockSource = "self-employed";
    render(<TaxSourceContainer />);
    expect(screen.queryByTestId("calculated-figure-m1")).toBeNull();
    expect(screen.queryByTestId("calculated-figure-s1")).toBeNull();
  });

  it("shows a failed add of a calculated figure on the page, and no alert before it", () => {
    mockSource = "rental";
    mockAccounts = [...baseAccounts, btlMortgage];
    const view = render(<TaxSourceContainer />);
    expect(screen.queryByRole("alert")).toBeNull();
    const card = screen.getByTestId("calculated-figure-m1");
    fireEvent.click(within(card).getByRole("button", { name: /^Add this estimate as a record/ }));
    expect(mockSubmit).toHaveBeenCalled();
    fetcherData.current = { success: false, error: "We could not add that record." };
    view.rerender(<TaxSourceContainer />);
    expect(screen.getByRole("alert").textContent).toBe("We could not add that record.");
  });

  it("says unlinked rent counts in full on the rental page only", () => {
    mockAccounts = [];
    mockSource = "rental";
    const rental = render(<TaxSourceContainer />);
    expect(screen.getByRole("note").textContent).toContain("Rental records are counted in full.");
    rental.unmount();
    mockSource = "self-employed";
    render(<TaxSourceContainer />);
    expect(screen.getByRole("note").textContent).not.toContain("Rental records");
    expect(screen.getByRole("note").textContent).not.toContain(SCOTTISH_BANDS_NOTE);
  });

  it("shows the refusal line, with figures at your share, when the year's Scottish rates are not published", () => {
    mockSource = "rental";
    mockSearch = `year=${next.replace("/", "-")}`;
    mockProfile = { ...baseProfile, taxRegion: "SCOTLAND" };
    mockRecords = [
      rec({
        id: "rent-next",
        source: "rental",
        category: "rental_income",
        amount: 12000,
        frequency: "one-off",
        date: `${next.slice(0, 4)}-05-01`,
      }),
      rec({
        id: "cost-next",
        source: "rental",
        type: "expense",
        category: "rent_rates_insurance",
        amount: 2000,
        frequency: "one-off",
        date: `${next.slice(0, 4)}-05-01`,
      }),
    ];
    const { container } = render(<TaxSourceContainer />);
    expect(container.textContent).toContain(
      `Scottish Income Tax rates for ${next} are not published yet`,
    );
    // The one rental property is held 50%: 2,000 of expenses x 50% = £1,000 recorded as yours.
    const recorded = screen.getByText("Expenses you have recorded").nextElementSibling;
    expect(recorded?.textContent).toBe("£1,000");
  });

  it("asks for the salary with a link to the salary setting when it is missing", () => {
    mockSource = "rental";
    mockProfile = { ...baseProfile, annualSalary: null };
    render(<TaxSourceContainer />);
    expect(screen.getByRole("link", { name: "Add salary" }).getAttribute("href")).toBe(
      "/app/profile#settings-age-and-pay",
    );
  });

  describe("the allowance comparison", () => {
    it("shows for self-employed income alone or expenses alone, and not with neither", () => {
      mockRecords = [rec({ id: "inc", amount: 500 })];
      const income = render(<TaxSourceContainer />);
      expect(allowanceHeading()).not.toBeNull();
      income.unmount();
      mockRecords = [rec({ id: "exp", type: "expense", category: "office_costs", amount: 50 })];
      const expenses = render(<TaxSourceContainer />);
      expect(allowanceHeading()).not.toBeNull();
      expenses.unmount();
      mockRecords = records.filter((r) => r.source === "rental");
      render(<TaxSourceContainer />);
      expect(allowanceHeading()).toBeNull();
    });

    it("shows for rent alone or rental expenses alone, and not with neither", () => {
      mockSource = "rental";
      mockRecords = [rec({ id: "rent", source: "rental", category: "rental_income" })];
      const income = render(<TaxSourceContainer />);
      expect(allowanceHeading()).not.toBeNull();
      income.unmount();
      mockRecords = [
        rec({ id: "cost", source: "rental", type: "expense", category: "rent_rates_insurance" }),
      ];
      const expenses = render(<TaxSourceContainer />);
      expect(allowanceHeading()).not.toBeNull();
      expenses.unmount();
      mockRecords = records.filter((r) => r.source === "self-employed");
      render(<TaxSourceContainer />);
      expect(allowanceHeading()).toBeNull();
    });

    it("is not shown on the savings page", () => {
      mockSource = "savings";
      mockRecords = [rec({ id: "int", source: "savings", category: "savings_interest" })];
      render(<TaxSourceContainer />);
      expect(allowanceHeading()).toBeNull();
    });

    it("says nothing about a property share on the self-employed page", () => {
      const { container } = render(<TaxSourceContainer />);
      expect(container.textContent).not.toContain("share of the property");
    });

    it("says when the property allowance and the expenses give the same tax", () => {
      // Rent 10,000 with 1,000 of expenses, the whole property: the 1,000 property allowance and
      // the 1,000 of expenses take the same off, so the total tax is the same either way.
      mockSource = "rental";
      mockAccounts = [];
      mockRecords = [
        rec({
          id: "rent",
          source: "rental",
          category: "rental_income",
          amount: 10000,
          frequency: "one-off",
        }),
        rec({
          id: "cost",
          source: "rental",
          type: "expense",
          category: "rent_rates_insurance",
          amount: 1000,
          frequency: "one-off",
        }),
      ];
      const { container } = render(<TaxSourceContainer />);
      expect(container.textContent).toContain("The total tax is the same either way.");
    });
  });

  describe("the strip", () => {
    it("is not drawn for a source with no records", () => {
      mockSource = "savings";
      render(<TaxSourceContainer />);
      expect(strip()).toBeNull();
    });

    it("rounds to whole pounds, says This tax year, and says when no expenses are recorded", () => {
      mockRecords = [rec({ id: "inc", amount: 1000.4, frequency: "one-off" })];
      render(<TaxSourceContainer />);
      const cards = Array.from(strip()?.children ?? []).map((c) => c.textContent ?? "");
      expect(cards[0]).toContain("£1,000");
      expect(cards[0]).not.toContain("£1,000.40");
      expect(cards[0]).toContain("This tax year");
      expect(cards[0]).not.toContain("Whole property");
      expect(cards[1]).toContain("No expenses recorded");
      expect(cards[1]).not.toContain("£0");
    });

    it("rounds the expenses to whole pounds", () => {
      mockRecords = [
        rec({ id: "inc", amount: 500, frequency: "one-off" }),
        rec({
          id: "exp",
          type: "expense",
          category: "office_costs",
          amount: 10.6,
          frequency: "one-off",
        }),
      ];
      render(<TaxSourceContainer />);
      const expenses = strip()?.children[1]?.textContent ?? "";
      expect(expenses).toContain("£11");
      expect(expenses).not.toContain("£10.60");
    });
  });

  it("starts the records drawer open with 8 records and closed with 9, and counts them", () => {
    const many = (count: number) =>
      Array.from({ length: count }, (_, i) =>
        rec({ id: `se-${i}`, name: `Job ${i + 1}`, frequency: "one-off" }),
      );
    mockRecords = many(8);
    const eight = render(<TaxSourceContainer />);
    expect(screen.getByRole("table")).toBeDefined();
    eight.unmount();
    mockRecords = many(9);
    render(<TaxSourceContainer />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("button", { name: /9 records/ })).toBeDefined();
  });

  describe("loader data", () => {
    it("shows the empty state when the loader sends no records, accounts or profile", () => {
      mockRecords = undefined;
      mockAccounts = undefined;
      mockProfile = undefined;
      render(<TaxSourceContainer />);
      expect(screen.getByText(`No records for ${current}`)).toBeDefined();
    });

    it("shows the latest records and profile after the loader sends new ones", () => {
      const view = render(<TaxSourceContainer />);
      // 120 of expenses is less than the 1,000 trading allowance.
      expect(screen.getByText(/uses the trading allowance, which is larger\./)).toBeDefined();
      expect(screen.getAllByRole("note")).toHaveLength(1);
      mockRecords = [
        ...records,
        rec({
          id: "s3",
          name: "Laptop",
          type: "expense",
          category: "office_costs",
          amount: 3000,
          frequency: "one-off",
        }),
      ];
      mockProfile = { ...baseProfile, annualSalary: null };
      view.rerender(<TaxSourceContainer />);
      // 120 + 3,000 = 3,120 of expenses is now larger than the 1,000 allowance.
      expect(
        screen.getByText(/The expenses you have recorded are larger than the trading allowance\./),
      ).toBeDefined();
      // With no salary the estimate is unknown, so the notice goes.
      expect(screen.queryByRole("note")).toBeNull();
    });
  });
});
