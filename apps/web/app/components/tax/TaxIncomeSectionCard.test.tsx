import type { TaxRecord } from "@repo/common";
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
});
