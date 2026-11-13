import type { TaxRecord } from "@flump/finance-engine";
import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { TaxIncomeSectionCard, type TaxIncomeSectionCardProps } from "./TaxIncomeSectionCard";

describe("<TaxIncomeSectionCard />", () => {
  const mockRecord: TaxRecord = {
    id: "rec-1",
    userId: "user-1",
    name: "Consulting Client A",
    source: "self-employed",
    type: "income",
    amount: 5000,
    frequency: "monthly",
    date: "2024-04-06",
    endDate: null,
    category: "freelance",
    notes: null,
    receiptFilename: null,
    receiptMimeType: null,
    receiptData: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };

  const defaultProps: TaxIncomeSectionCardProps = {
    source: "self-employed",
    title: "Sole Trader & Freelancing",
    subtitle: "Track gross self-employed turnover and deductible expenses",
    icon: <span id="section-icon">💼</span>,
    colorScheme: "emerald",
    records: [mockRecord],
    selectedTaxYear: "2024/25",
    previousTaxYear: "2023/24",
    onOpenAddModal: vi.fn(),
    onOpenEditModal: vi.fn(),
    onDeleteRecord: vi.fn(),
    onOpenCopyModal: vi.fn(),
    onQuickAdd: vi.fn(),
    onViewReceipt: vi.fn(),
  };

  test("renders section card with records and summary", () => {
    const { getByText, getByTestId } = customRender(<TaxIncomeSectionCard {...defaultProps} />);

    expect(getByText("Sole Trader & Freelancing")).toBeDefined();
    expect(getByText("Consulting Client A")).toBeDefined();
    expect(getByTestId("section-icon")).toBeDefined();
  });

  test("allows opening add modal and edit modal", () => {
    const { getByText, getByTitle } = customRender(<TaxIncomeSectionCard {...defaultProps} />);

    const addBtn = getByText(/Add Income/i);
    fireEvent.click(addBtn);
    expect(defaultProps.onOpenAddModal).toHaveBeenCalledWith("self-employed", "income");

    const editBtn = getByTitle("Edit record");
    fireEvent.click(editBtn);
    expect(defaultProps.onOpenEditModal).toHaveBeenCalledWith(mockRecord);
  });

  test("allows deleting a record", () => {
    const { getByTitle } = customRender(<TaxIncomeSectionCard {...defaultProps} />);

    const deleteBtn = getByTitle("Delete record");
    fireEvent.click(deleteBtn);
    expect(defaultProps.onDeleteRecord).toHaveBeenCalled();
  });

  test("toggles collapsible content", () => {
    const { getByText } = customRender(<TaxIncomeSectionCard {...defaultProps} />);

    const header = getByText("Sole Trader & Freelancing");
    fireEvent.click(header);
    // Click again to reopen
    fireEvent.click(header);
    expect(getByText("Consulting Client A")).toBeDefined();
  });

  test("supports inline quick-add, expense & receipt records, and copy modal", () => {
    const expenseWithReceipt: TaxRecord = {
      ...mockRecord,
      id: "rec-2",
      name: "Hosting Server Bill",
      type: "expense",
      amount: 120,
      frequency: "one-off",
      receiptFilename: "invoice.pdf",
      receiptMimeType: "application/pdf",
      hasReceipt: true,
    };

    const { getByText, getByPlaceholderText, getByTitle } = customRender(
      <TaxIncomeSectionCard
        {...defaultProps}
        colorScheme="amber"
        records={[mockRecord, expenseWithReceipt]}
      />,
    );

    // Click View receipt button
    const viewReceiptBtn = getByText("View");
    fireEvent.click(viewReceiptBtn);
    expect(defaultProps.onViewReceipt).toHaveBeenCalledWith(expenseWithReceipt);

    // Click Copy from previous tax year
    fireEvent.click(getByText(/Copy from 2023\/24/i));
    expect(defaultProps.onOpenCopyModal).toHaveBeenCalledWith("self-employed");

    // Click Add Expense
    fireEvent.click(getByText(/Add Expense/i));
    expect(defaultProps.onOpenAddModal).toHaveBeenCalledWith("self-employed", "expense");

    // Open Inline Quick-Add form and submit
    fireEvent.click(getByText(/Inline Quick-Add/i));
    const nameInput = getByPlaceholderText(/e\.g\. flat rent/i);
    fireEvent.change(nameInput, { target: { value: "Domain Renewal" } });
    const amountInput = getByPlaceholderText(/Amount/i);
    fireEvent.change(amountInput, { target: { value: "45" } });

    const quickAddForm = amountInput.closest("form");
    if (quickAddForm) {
      fireEvent.submit(quickAddForm);
    }
    expect(defaultProps.onQuickAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "self-employed",
        type: "income",
        name: "Domain Renewal",
        amount: 45,
        frequency: "monthly",
      }),
    );
  });
});
