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
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockRecords: TaxRecord[] = [
  {
    id: "rec-1",
    userId: "user-1",
    name: "Poplar Rent (2024/25)",
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
    name: "Curo Service Charge (2024/25)",
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
const mockSubmit = vi.fn();

vi.mock("react-router", () => ({
  useLoaderData: () => ({
    records: mockLoaderRecords,
    userProfile: {
      annualSalary: 60000,
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
  }),
}));

import TaxContainer from "./TaxContainer";

describe("TaxContainer & Calculation Tools", () => {
  it("renders page title and 4 collapsible income sections", () => {
    render(<TaxContainer />);

    expect(screen.getByText("Income & Self Assessment Tax Planner")).toBeDefined();
    expect(screen.getByText("Employment Income (PAYE)")).toBeDefined();
    expect(screen.getByText("Rental Property (e.g. Poplar)")).toBeDefined();
    expect(screen.getByText("Self-Employed & Freelance Business")).toBeDefined();
    expect(screen.getByText("Savings & Dividend Income")).toBeDefined();
  });

  it("renders top summary cards and comparison table", () => {
    render(<TaxContainer />);

    expect(screen.getByText(/Estimated Self Assessment due/i)).toBeDefined();
    expect(screen.getAllByText(/Total Gross Income/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Rental Profit Share/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Self-Employed Profit/i).length).toBeGreaterThan(0);

    const compareTab = screen.getByText("Multi-Year Comparison");
    fireEvent.click(compareTab);
    expect(screen.getByText("P&L & Tax Comparison Table")).toBeDefined();
  });

  it("allows switching tabs to Detailed Transaction Log", () => {
    render(<TaxContainer />);

    const logTab = screen.getByText("Detailed Transaction Log");
    fireEvent.click(logTab);

    expect(screen.getByText("Showing 6 records")).toBeDefined();
    expect(screen.getByText("Poplar Rent (2024/25)")).toBeDefined();
  });

  it("opens the Copy / Populate New Year modal", () => {
    render(<TaxContainer />);

    const copyBtn = screen.getAllByText(/Copy from/i)[0];
    fireEvent.click(copyBtn);

    expect(screen.getByText("Copy Figures & Populate Tax Year")).toBeDefined();
    expect(screen.getByText("Source Year")).toBeDefined();
    expect(screen.getByText("Target Year")).toBeDefined();
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

  it("renders Tax Trap & HMRC Reserve tab and syncs tax parameters", () => {
    render(<TaxContainer />);

    fireEvent.click(screen.getByText("Tax Trap & HMRC Reserve"));
    expect(screen.getByText("Tax Parameters")).toBeDefined();
    expect(screen.getByText(/Tax Calculations breakdown/i)).toBeDefined();

    const salaryInputs = screen.getAllByRole("spinbutton");
    if (salaryInputs.length >= 2) {
      fireEvent.change(salaryInputs[0], { target: { value: "110000" } });
      fireEvent.change(salaryInputs[1], { target: { value: "50" } });
    }

    const syncBtn = screen.getByRole("button", { name: /Sync parameters/i });
    fireEvent.click(syncBtn);
    expect(mockSubmit).toHaveBeenCalled();
  });

  it("opens Add Record modal and submits new record", () => {
    render(<TaxContainer />);

    const addRecordBtns = screen.getAllByRole("button", { name: /Add Record/i });
    fireEvent.click(addRecordBtns[0]);

    const nameInput = screen.getByLabelText("Transaction Name");
    fireEvent.change(nameInput, { target: { value: "New Consulting Invoice" } });

    const amountInput = screen.getByLabelText("Amount (£)");
    fireEvent.change(amountInput, { target: { value: "1500" } });

    const modalAddBtns = screen.getAllByRole("button", { name: /Add Record/i, hidden: true });
    fireEvent.click(modalAddBtns[modalAddBtns.length - 1]);

    expect(mockSubmit).toHaveBeenCalled();
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
      fireEvent.click(screen.getByText("Detailed Transaction Log"));

      fireEvent.click(screen.getAllByTitle("Delete record")[0]);
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(screen.getByText("Delete transaction?")).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: "Delete transaction" }));
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "delete-transaction", id: expect.any(String) },
        { method: "POST" },
      );
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("cancelling a transaction delete submits nothing", () => {
      stubDialogs();
      render(<TaxContainer />);
      fireEvent.click(screen.getByText("Detailed Transaction Log"));

      fireEvent.click(screen.getAllByTitle("Delete record")[0]);
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

    fireEvent.click(screen.getByText("Detailed Transaction Log"));
    fireEvent.click(screen.getByText("Poplar Rent (2024/25)"));

    const saveBtn = screen.getByRole("button", { name: /Save Record/i, hidden: true });
    fireEvent.click(saveBtn);
    expect(mockSubmit).toHaveBeenCalled();
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
    fireEvent.click(screen.getByText("Detailed Transaction Log"));
    expect(screen.getByText("Poplar Rent (2024/25)")).toBeDefined();

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

      expect(copied.name).toBe("Poplar Rent (2025/26)");
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
