import type { TaxRecord } from "@repo/common";
import { fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { CopyTaxYearModal, type CopyTaxYearModalProps } from "./CopyTaxYearModal";

const mockSubmit = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual<any>("react-router");
  return {
    ...actual,
    useFetcher: () => ({
      submit: mockSubmit,
      state: "idle",
      data: null,
    }),
  };
});

describe("<CopyTaxYearModal />", () => {
  const mockRecords: TaxRecord[] = [
    {
      id: "rec-1",
      userId: "user-1",
      name: "Property Flat A Rent",
      type: "income",
      source: "rental",
      amount: 1400,
      frequency: "monthly",
      date: "2024-04-06",
      endDate: null,
      category: "rental",
      notes: null,
      receiptFilename: null,
      receiptMimeType: null,
      receiptData: null,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ];

  const defaultProps: CopyTaxYearModalProps = {
    open: true,
    onClose: vi.fn(),
    records: mockRecords,
    availableYears: ["2023/24", "2024/25", "2025/26"],
    initialSourceYear: "2024/25",
    initialTargetYear: "2025/26",
  };

  test("renders modal and candidate records", () => {
    const { getByText, getByDisplayValue } = customRender(<CopyTaxYearModal {...defaultProps} />);

    expect(getByText("Copy Figures & Populate Tax Year")).toBeDefined();
    expect(getByText("Source Year")).toBeDefined();
    expect(getByText("Target Year")).toBeDefined();
    expect(getByDisplayValue("Property Flat A Rent")).toBeDefined();
    expect(getByText(/Copy.*Records/i)).toBeDefined();
  });

  test("allows applying percentage adjustment and submitting copy", () => {
    const { getByText } = customRender(<CopyTaxYearModal {...defaultProps} />);

    // Click +5% button
    const plus5Btn = getByText("+5%");
    fireEvent.click(plus5Btn);

    // Click Copy Records
    const copyBtn = getByText(/Copy.*Records/i);
    fireEvent.click(copyBtn);

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "bulk-create-transactions",
      }),
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  test("handles close when cancelled", () => {
    const { getByText } = customRender(<CopyTaxYearModal {...defaultProps} />);

    const cancelBtn = getByText("Cancel");
    fireEvent.click(cancelBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
