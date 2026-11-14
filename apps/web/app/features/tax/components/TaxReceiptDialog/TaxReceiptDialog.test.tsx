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
    const open = screen.getByRole("link", { name: "Open" });
    expect(open.getAttribute("target")).toBe("_blank");
    expect(open.getAttribute("href")).toBe("/app/tax/receipts/r4");
  });

  it("shows a file tile with the name when the image cannot be shown", () => {
    render(
      <TaxReceiptDialog
        record={{ ...pdf, receiptMimeType: "image/png", receiptFilename: "laptop.png" }}
        onClose={vi.fn()}
      />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Receipt for Laptop" }));
    expect(screen.queryByRole("img", { name: "Receipt for Laptop" })).toBeNull();
    expect(screen.getByText("No preview for this file")).toBeDefined();
    expect(screen.getByText("laptop.png")).toBeDefined();
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
