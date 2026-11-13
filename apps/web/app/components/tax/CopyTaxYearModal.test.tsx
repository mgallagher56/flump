import type { TaxRecord } from "@flump/finance-engine";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
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

const Harness = ({ modalProps }: { modalProps: CopyTaxYearModalProps }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open copy
      </button>
      <CopyTaxYearModal {...modalProps} open={open} onClose={() => setOpen(false)} />
    </>
  );
};

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

    expect(getByText("Copy figures and populate tax year")).toBeDefined();
    expect(getByText("Source year")).toBeDefined();
    expect(getByText("Target year")).toBeDefined();
    expect(getByDisplayValue("Property Flat A Rent")).toBeDefined();
    expect(getByText(/Copy.*records/i)).toBeDefined();
  });

  test("allows applying percentage adjustment and submitting copy", () => {
    const { getByText } = customRender(<CopyTaxYearModal {...defaultProps} />);

    // Click +5% button
    const plus5Btn = getByText("+5%");
    fireEvent.click(plus5Btn);

    // Click Copy Records
    const copyBtn = getByText(/Copy.*records/i);
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

  test("is a modal dialog with an accessible name and description", () => {
    customRender(<CopyTaxYearModal {...defaultProps} />);
    const dialog = screen.getByRole("dialog", { name: "Copy figures and populate tax year" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
  });

  test("closes on Escape and via the labelled close button", () => {
    const onClose = vi.fn();
    customRender(<CopyTaxYearModal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test("keeps the wide records table inside a horizontal scroll wrapper", () => {
    customRender(<CopyTaxYearModal {...defaultProps} />);
    const region = screen.getByRole("region", { name: "Records to copy" });
    expect(region.getAttribute("tabindex")).toBe("0");
    const table = region.querySelector("table");
    expect(table).not.toBeNull();
    expect((table as HTMLElement).style.minWidth).toBe("500px");
  });

  test("traps focus inside and returns it to the trigger on close", async () => {
    customRender(<Harness modalProps={defaultProps} />);
    const trigger = screen.getByRole("button", { name: "open copy" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.querySelectorAll("[data-radix-focus-guard]").length).toBeGreaterThan(0);
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
