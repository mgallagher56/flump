import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { taxRecordsFixture } from "../../__fixtures__/taxRecords";
import { TaxReceiptDialog } from "./TaxReceiptDialog";

const pdf = taxRecordsFixture[3];

describe("TaxReceiptDialog", () => {
  it("offers a PDF as a download from the receipt route", () => {
    render(<TaxReceiptDialog record={pdf} onClose={vi.fn()} />);
    const link = screen.getByRole("link", { name: "Download PDF" });
    expect(link.getAttribute("href")).toBe("/app/tax/receipts/r4");
  });

  it("shows an image inline from the receipt route, never a data URL", () => {
    render(
      <TaxReceiptDialog
        record={{ ...pdf, receiptMimeType: "image/png", receiptFilename: "laptop.png" }}
        onClose={vi.fn()}
      />,
    );
    const img = screen.getByRole("img", { name: "Receipt for Laptop" });
    expect(img.getAttribute("src")).toBe("/app/tax/receipts/r4");
  });

  it("is closed with no record and calls onClose from the Close button", () => {
    const onClose = vi.fn();
    const { rerender } = render(<TaxReceiptDialog record={null} onClose={onClose} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<TaxReceiptDialog record={pdf} onClose={onClose} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Close" }).at(-1) as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });
});
