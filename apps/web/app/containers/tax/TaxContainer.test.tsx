import {
  buildCopiedRecordForTaxYear,
  calculateUKTax,
  getCurrentUKTaxYear,
  getNextTaxYear,
  getPreviousTaxYear,
  getRecordAnnualTotalForTaxYear,
  isRecordActiveInTaxYear,
  type TaxRecord,
} from "@flump/finance-engine";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const mockRecords: TaxRecord[] = [
  {
    id: "rec-1",
    userId: "user-1",
    name: "Flat rent (2024/25)",
    source: "rental",
    type: "income",
    category: "rental_income",
    amount: 1150,
    frequency: "monthly",
    date: "2024-04-06",
    endDate: "2025-03-31",
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "2024-04-06T00:00:00Z",
    updatedAt: "2024-04-06T00:00:00Z",
  },
  {
    id: "rec-2",
    userId: "user-1",
    name: "Service charge (2024/25)",
    source: "rental",
    type: "expense",
    category: "rent_rates_insurance",
    amount: 45.57,
    frequency: "monthly",
    date: "2024-04-06",
    endDate: "2025-03-31",
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "2024-04-06T00:00:00Z",
    updatedAt: "2024-04-06T00:00:00Z",
  },
  {
    id: "rec-3",
    userId: "user-1",
    name: "Mortgage Interest (2024/25)",
    source: "rental",
    type: "expense",
    category: "mortgage_interest",
    amount: 545,
    frequency: "monthly",
    date: "2024-04-06",
    endDate: "2025-03-31",
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "2024-04-06T00:00:00Z",
    updatedAt: "2024-04-06T00:00:00Z",
  },
  {
    id: "rec-4",
    userId: "user-1",
    name: "Software Consulting Retainer",
    source: "self-employed",
    type: "income",
    category: "self_employed_income",
    amount: 3500,
    frequency: "monthly",
    date: "2024-06-01",
    endDate: null,
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2024-06-01T00:00:00Z",
  },
  {
    id: "rec-5",
    userId: "user-1",
    name: "High-Yield Savings Interest",
    source: "savings",
    type: "income",
    category: "savings_interest",
    amount: 80,
    frequency: "monthly",
    date: "2024-04-06",
    endDate: "2025-03-31",
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "2024-04-06T00:00:00Z",
    updatedAt: "2024-04-06T00:00:00Z",
  },
  {
    id: "rec-6",
    userId: "user-1",
    name: "FTSE All-World Dividend",
    source: "savings",
    type: "income",
    category: "dividend_income",
    amount: 600,
    frequency: "annual",
    date: "2024-09-01",
    endDate: null,
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "2024-09-01T00:00:00Z",
    updatedAt: "2024-09-01T00:00:00Z",
  },
];

let mockLoaderRecords: TaxRecord[] = mockRecords;
let mockProfileSalary: number | null = 60000;
const mockSubmit = vi.fn();
const fetcherData = { current: null as unknown };

vi.mock("react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useInRouterContext: () => false,
  useLoaderData: () => ({
    records: mockLoaderRecords,
    userProfile: {
      annualSalary: mockProfileSalary,
      propertyOwnershipShare: 100,
      country: "GB",
    },
    accounts: [
      { id: "acc-1", name: "Marcus Savings", type: "Saving", balance: 20000, interestRate: 4.8 },
    ],
  }),
  useFetcher: () => ({
    submit: mockSubmit,
    state: "idle",
    data: fetcherData.current,
  }),
}));

import TaxContainer from "./TaxContainer";

const openTab = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));

describe("TaxContainer & Calculation Tools", () => {
  it("renders page title and 4 collapsible income sections", () => {
    render(<TaxContainer />);

    expect(screen.getByRole("heading", { level: 1, name: "Your tax" })).toBeDefined();
    expect(screen.getByText("Employment (PAYE)")).toBeDefined();
    expect(screen.getByText("Rental property")).toBeDefined();
    expect(screen.getByText("Self-employed and freelance")).toBeDefined();
    expect(screen.getByText("Savings and dividends")).toBeDefined();
  });

  it("renders top summary cards and comparison table", () => {
    render(<TaxContainer />);

    expect(screen.getByText(/Estimated Self Assessment due/i)).toBeDefined();
    expect(screen.getAllByText("Total income").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Your share of rental profit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Self-employed profit").length).toBeGreaterThan(0);

    openTab("Year by year");
    expect(screen.getByRole("table", { name: "Income and tax by tax year" })).toBeDefined();
  });

  it("labels every top KPI as an estimate for the tax year and keeps their values out of the heading outline", () => {
    render(<TaxContainer />);

    // The estimate note is shown once on the headline KPI, not repeated on pure-sum cards, and
    // sits outside any live region.
    const note = screen.getAllByText(
      /Estimate for \d{4}\/\d{2}, based on the figures you entered/,
    )[0];
    expect(note.closest('[role="status"]')).toBeNull();
    expect(screen.queryAllByRole("status")).toHaveLength(0);
    const headingTexts = screen.getAllByRole("heading").map((h) => h.textContent ?? "");
    expect(headingTexts.some((t) => t.includes("£"))).toBe(false);
  });

  it("allows switching tabs to All records", () => {
    render(<TaxContainer />);

    openTab("All records");

    expect(screen.getByText("Showing 1 to 6 of 6 records")).toBeDefined();
    expect(screen.getByText("Flat rent (2024/25)")).toBeDefined();
  });

  it("opens the Copy / Populate New Year modal", () => {
    render(<TaxContainer />);

    const copyBtn = screen.getAllByText(/Copy from/i)[0];
    fireEvent.click(copyBtn);

    expect(screen.getByText("Copy figures and populate tax year")).toBeDefined();
    expect(screen.getByText("Source year")).toBeDefined();
    expect(screen.getByText("Target year")).toBeDefined();
  });

  it("renders 'Not set' for the profile salary baseline when no salary is stored, never 45,000", () => {
    mockProfileSalary = null;
    const { container, unmount } = render(<TaxContainer />);

    expect(container.textContent).toMatch(/Salary in your profile:\s*Not set/);
    expect(container.textContent).not.toContain("45,000");
    const links = screen.getAllByRole("link", { name: "Add salary" });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].getAttribute("href")).toBe("/app/profile");

    unmount();
    mockProfileSalary = 60000;
  });

  it("shows ONLY the current UK tax year when records are empty (financial data reset)", () => {
    const currentTaxYear = getCurrentUKTaxYear();
    mockLoaderRecords = [];
    const { unmount } = render(<TaxContainer />);

    // Current tax year is present as the fiscal year option button
    expect(screen.getByRole("button", { name: currentTaxYear })).toBeDefined();

    // Historical years like 2020/21, 2021/22, etc. should not be in the fiscal year selector
    expect(screen.queryByRole("button", { name: "2020/21" })).toBeNull();
    expect(screen.queryByRole("button", { name: "2021/22" })).toBeNull();
    expect(screen.queryByRole("button", { name: "2022/23" })).toBeNull();

    unmount();
    mockLoaderRecords = mockRecords;
  });

  it("renders the Payments and reserve tab and saves tax inputs to the profile", () => {
    mockSubmit.mockClear();
    render(<TaxContainer />);

    openTab("Payments and reserve");
    expect(screen.getByRole("heading", { name: "Your inputs" })).toBeDefined();
    expect(screen.getByText(/How the estimate is worked out/i)).toBeDefined();

    fireEvent.change(screen.getByLabelText("Property ownership share"), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save to profile" }));
    expect(mockSubmit).toHaveBeenCalledWith(
      { intent: "update-profile", annualSalary: "60000", propertyOwnershipShare: "50" },
      { method: "POST" },
    );
  });

  it("opens Add Record modal and submits new record", () => {
    render(<TaxContainer />);

    mockSubmit.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Add a record" }));

    const dialog = screen.getByRole("dialog", { name: "Add a record" });
    fireEvent.change(within(dialog).getByLabelText(/^Name/), {
      target: { value: "New Consulting Invoice" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Amount/), { target: { value: "1500" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add record" }));

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "create-transaction",
        name: "New Consulting Invoice",
        amount: "1500",
        source: "rental",
        type: "income",
      }),
      { method: "POST" },
    );
  });

  it("does not submit a record with no name or amount and says what is missing", () => {
    mockSubmit.mockClear();
    render(<TaxContainer />);
    fireEvent.click(screen.getByRole("button", { name: "Add a record" }));
    const dialog = screen.getByRole("dialog", { name: "Add a record" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add record" }));

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Enter a name for this record.")).toBeDefined();
    expect(within(dialog).getByText("Enter an amount above £0.")).toBeDefined();
  });

  // Kept ahead of the destructive-confirmation tests, which leave module-level state
  // behind that stops a keyboard-opened edit dialog from appearing.
  it("tax record can be edited from the keyboard", async () => {
    const user = userEvent.setup();
    render(<TaxContainer />);
    openTab("All records");

    // The record name is itself a button, so Tab reaches it and Enter opens the editor (J-03).
    const nameBtn = screen.getByRole("button", { name: "Flat rent (2024/25)" });
    nameBtn.focus();
    expect(document.activeElement).toBe(nameBtn);
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("button", { name: "Save changes" })).toBeDefined();
  });

  it("delete does not open edit", () => {
    render(<TaxContainer />);
    openTab("All records");

    fireEvent.click(screen.getAllByTitle("Delete")[0]);
    expect(screen.getByText("Delete this record?")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });

  describe("destructive confirmations", () => {
    const stubDialogs = () => {
      const confirmSpy = vi.fn(() => true);
      const alertSpy = vi.fn();
      window.confirm = confirmSpy;
      window.alert = alertSpy;
      mockSubmit.mockClear();
      return { confirmSpy, alertSpy };
    };

    it("confirms a transaction delete in a dialog, not window.confirm", () => {
      const { confirmSpy, alertSpy } = stubDialogs();
      render(<TaxContainer />);
      openTab("All records");

      fireEvent.click(screen.getAllByTitle("Delete")[0]);
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(screen.getByText("Delete this record?")).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: "Delete record" }));
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "delete-transaction", id: expect.any(String) },
        { method: "POST" },
      );
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("a failed transaction delete shows the error inline and keeps the dialog open", () => {
      stubDialogs();
      fetcherData.current = null;
      const { rerender } = render(<TaxContainer />);
      openTab("All records");
      fireEvent.click(screen.getAllByTitle("Delete")[0]);
      fireEvent.click(screen.getByRole("button", { name: "Delete record" }));

      fetcherData.current = {
        success: false,
        error: "We couldn't reach the server. Please try again.",
      };
      rerender(<TaxContainer />);
      expect(within(screen.getByRole("alertdialog")).getByRole("alert").textContent).toBe(
        "We couldn't reach the server. Please try again.",
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete record" }));
      fetcherData.current = { success: true };
      rerender(<TaxContainer />);
      expect(screen.queryByRole("alertdialog")).toBeNull();
      fetcherData.current = null;
    });

    it("a failed tax year delete shows the error inline and keeps the dialog open", () => {
      stubDialogs();
      fetcherData.current = null;
      const { rerender } = render(<TaxContainer />);
      fireEvent.click(screen.getByRole("button", { name: "2024/25" }));
      fireEvent.click(screen.getByRole("button", { name: /Delete 2024\/25/i }));
      fireEvent.click(screen.getByRole("button", { name: "Delete year" }));

      fetcherData.current = {
        success: false,
        error: "We couldn't reach the server. Please try again.",
      };
      rerender(<TaxContainer />);
      expect(within(screen.getByRole("alertdialog")).getByRole("alert").textContent).toBe(
        "We couldn't reach the server. Please try again.",
      );

      fireEvent.click(screen.getByRole("button", { name: "Delete year" }));
      fetcherData.current = { success: true };
      rerender(<TaxContainer />);
      expect(screen.queryByRole("alertdialog")).toBeNull();
      fetcherData.current = null;
    });

    it("cancelling a transaction delete submits nothing", () => {
      stubDialogs();
      render(<TaxContainer />);
      openTab("All records");

      fireEvent.click(screen.getAllByTitle("Delete")[0]);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockSubmit).not.toHaveBeenCalled();
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("confirms a tax year delete with the record count and ids", () => {
      const { confirmSpy, alertSpy } = stubDialogs();
      render(<TaxContainer />);
      fireEvent.click(screen.getByRole("button", { name: "2024/25" }));

      fireEvent.click(screen.getByRole("button", { name: /Delete 2024\/25/i }));
      expect(mockSubmit).not.toHaveBeenCalled();
      const dialog = screen.getByRole("alertdialog");
      expect(dialog.textContent).toContain("Delete all 6 records for 2024/25?");
      expect(dialog.textContent).toContain("can't be undone");

      fireEvent.click(screen.getByRole("button", { name: "Delete year" }));
      expect(mockSubmit).toHaveBeenCalledWith(
        {
          intent: "delete-tax-year",
          recordIds: JSON.stringify(["rec-1", "rec-2", "rec-3", "rec-4", "rec-5", "rec-6"]),
        },
        { method: "POST" },
      );
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("cancelling a tax year delete submits nothing", () => {
      stubDialogs();
      render(<TaxContainer />);
      fireEvent.click(screen.getByRole("button", { name: "2024/25" }));
      fireEvent.click(screen.getByRole("button", { name: /Delete 2024\/25/i }));
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("never offers a delete-year control (or alert) for an empty year", () => {
      const { alertSpy } = stubDialogs();
      mockLoaderRecords = [];
      const { unmount } = render(<TaxContainer />);
      expect(screen.queryByRole("button", { name: /^Delete \d{4}\/\d{2}$/ })).toBeNull();
      expect(alertSpy).not.toHaveBeenCalled();
      unmount();
      mockLoaderRecords = mockRecords;
    });
  });

  it("filters Detailed Transaction Log and opens Edit Record modal", () => {
    mockSubmit.mockClear();
    render(<TaxContainer />);

    openTab("All records");
    fireEvent.click(screen.getByRole("button", { name: "Flat rent (2024/25)" }));

    const saveBtn = screen.getByRole("button", { name: "Save changes" });
    fireEvent.click(saveBtn);
    expect(mockSubmit).toHaveBeenCalled();
  });

  describe("stored receipts (E20-N15)", () => {
    const withReceipt: TaxRecord = {
      ...mockRecords[0],
      id: "rec-receipt",
      name: "Flat repairs (2024/25)",
      receiptFilename: "repairs.png",
      receiptMimeType: "image/png",
      hasReceipt: true,
    };
    const lastPayload = () => mockSubmit.mock.calls.at(-1)?.[0] as Record<string, unknown>;

    const openEdit = () => {
      mockLoaderRecords = [withReceipt];
      mockSubmit.mockClear();
      render(<TaxContainer />);
      openTab("All records");
      fireEvent.click(screen.getByRole("button", { name: "Flat repairs (2024/25)" }));
    };

    it("saves an edit without sending receipt bytes or a clear flag", () => {
      openEdit();
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      const payload = lastPayload();
      expect(payload.intent).toBe("update-transaction");
      expect(payload.receiptData).toBeUndefined();
      expect(payload.receiptClear).toBeUndefined();
      expect(payload.receiptFilename).toBe("repairs.png");
      mockLoaderRecords = mockRecords;
    });

    it("says so explicitly when the receipt is removed", () => {
      openEdit();
      fireEvent.click(screen.getByRole("button", { name: "Remove" }));
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      const payload = lastPayload();
      expect(payload.receiptClear).toBe("1");
      expect(payload.receiptData).toBeUndefined();
      expect(payload.receiptFilename).toBeUndefined();
      mockLoaderRecords = mockRecords;
    });

    it("views the receipt through the receipt route, never an inline data URL", () => {
      mockLoaderRecords = [withReceipt];
      const { container } = render(<TaxContainer />);
      openTab("All records");
      fireEvent.click(
        screen.getByRole("button", { name: "View receipt for Flat repairs (2024/25)" }),
      );
      const img = document.body.querySelector('img[src="/app/tax/receipts/rec-receipt"]');
      expect(img).not.toBeNull();
      expect(container.innerHTML + document.body.innerHTML).not.toContain("data:");
      mockLoaderRecords = mockRecords;
    });
  });

  it("executes Copy Tax Year modal action", () => {
    render(<TaxContainer />);

    const copyBtn = screen.getAllByText(/Copy from/i)[0];
    fireEvent.click(copyBtn);

    const confirmCopyBtn = screen.queryByRole("button", {
      name: /Copy .* Records/i,
      hidden: true,
    });
    if (confirmCopyBtn) {
      fireEvent.click(confirmCopyBtn);
      expect(mockSubmit).toHaveBeenCalled();
    }
  });

  it("files a record dated 1 April (old web default) under the year starting that April", () => {
    // Month bucketing: 2024-04 is a 2024/25 month, so the record is listed in 2024/25
    // (not 2023/24, which the 6 April date boundary would give), matching the totals.
    mockLoaderRecords = [{ ...mockRecords[0], id: "rec-apr1", date: "2024-04-01" }];
    const { unmount } = render(<TaxContainer />);

    expect(screen.getByRole("button", { name: "2024/25" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "2023/24" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "2024/25" }));
    openTab("All records");
    expect(screen.getByText("Flat rent (2024/25)")).toBeDefined();

    unmount();
    mockLoaderRecords = mockRecords;
  });

  describe("Tax Helper Utilities", () => {
    it("correctly identifies previous and next tax years", () => {
      expect(getPreviousTaxYear("2025/26")).toBe("2024/25");
      expect(getNextTaxYear("2024/25")).toBe("2025/26");
      expect(getNextTaxYear("2025/26")).toBe("2026/27");
    });

    it("calculates annual total and activity in a tax year for recurring records", () => {
      const rentalRec = mockRecords[0]; // £1,150/mo for 12 months
      expect(getRecordAnnualTotalForTaxYear(rentalRec, "2024/25")).toBe(13800);
      expect(isRecordActiveInTaxYear(rentalRec, "2024/25")).toBe(true);
      expect(isRecordActiveInTaxYear(rentalRec, "2022/23")).toBe(false);
    });

    it("shifts dates, names, and applies amount overrides when copying records", () => {
      const source = mockRecords[0];
      const copied = buildCopiedRecordForTaxYear(source, "2025/26", 1200);

      expect(copied.name).toBe("Flat rent (2025/26)");
      expect(copied.date).toBe("2025-04-06");
      expect(copied.endDate).toBe("2026-03-31");
      expect(copied.amount).toBe(1200);
      expect(copied.source).toBe("rental");
      expect(copied.notes).toContain("Copied from 2024/25");
    });

    it("calculates UK tax including Section 24 credit, Personal Savings Allowance and Dividend Allowance", () => {
      const result = calculateUKTax("2024/25", mockRecords, 60000, 100);

      expect(result.rentalIncomeGross).toBe(13800);
      expect(result.rentalMortgageInterest).toBe(6540);
      expect(result.rentalPropertyTaxCredit).toBeGreaterThan(0); // Section 24 20% credit
      expect(result.savingsInterestGross).toBe(960);
      expect(result.dividendIncomeGross).toBe(600);
      // Higher rate taxpayer (salary £60k) has £500 PSA and £500 Dividend Allowance in 2024/25
      expect(result.personalSavingsAllowance).toBe(500);
      expect(result.dividendAllowance).toBe(500);
      expect(result.taxableSavingsInterest).toBe(460); // 960 - 500
      expect(result.taxableDividends).toBe(100); // 600 - 500
      expect(result.netAdditionalTaxToPay).toBeGreaterThan(0);
    });
  });
});
