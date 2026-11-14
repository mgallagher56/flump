import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaxRecordDialog, type TaxRecordDraft } from "./TaxRecordDialog";

const draft: TaxRecordDraft = {
  name: "",
  source: "rental",
  type: "income",
  category: "rental_income",
  amount: null,
  date: "2026-04-06",
  frequency: "monthly",
  endDate: "",
  notes: "",
  receiptFilename: null,
  receiptMimeType: null,
  receiptData: null,
  receiptCleared: false,
};

const setup = (initial = draft, mode: "add" | "edit" = "add") => {
  const onSave = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <TaxRecordDialog
      open
      mode={mode}
      initial={initial}
      onOpenChange={onOpenChange}
      onSave={onSave}
    />,
  );
  return { onSave, onOpenChange, dialog: screen.getByRole("dialog") };
};

describe("TaxRecordDialog", () => {
  it("is a titled dialog with labelled fields", () => {
    const { dialog } = setup();
    expect(within(dialog).getByText("Add a record")).toBeDefined();
    expect(within(dialog).getByLabelText(/^Name/)).toBeDefined();
    expect(within(dialog).getByLabelText(/^Amount/)).toBeDefined();
    expect(within(dialog).getByLabelText("Income source")).toBeDefined();
    expect(within(dialog).getByLabelText(/^End date/)).toBeDefined();
  });

  it("blocks saving and explains missing fields", () => {
    const { dialog, onSave } = setup();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add record" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Enter a name for this record.")).toBeDefined();
    expect(within(dialog).getByLabelText(/^Name/).getAttribute("aria-invalid")).toBe("true");
  });

  it("resets the category when the source changes and saves the draft", () => {
    const { dialog, onSave } = setup();
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: "Laptop" } });
    fireEvent.change(within(dialog).getByLabelText("Income source"), {
      target: { value: "self-employed" },
    });
    fireEvent.change(within(dialog).getByLabelText("Type"), { target: { value: "expense" } });
    fireEvent.change(within(dialog).getByLabelText(/^Amount/), { target: { value: "1299" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add record" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Laptop",
        source: "self-employed",
        type: "expense",
        category: "office_costs",
        amount: 1299,
      }),
    );
  });

  it("hides the end date for one-off records", () => {
    const { dialog } = setup({ ...draft, frequency: "one-off" });
    expect(within(dialog).queryByLabelText(/^End date/)).toBeNull();
    expect(within(dialog).getByLabelText(/^Date/)).toBeDefined();
  });

  it("marks a removed stored receipt as cleared", () => {
    const { dialog, onSave } = setup(
      {
        ...draft,
        name: "Boiler",
        amount: 380,
        receiptFilename: "boiler.pdf",
        receiptMimeType: "application/pdf",
      },
      "edit",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove receipt" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ receiptFilename: null, receiptCleared: true }),
    );
  });

  it("cancel closes without saving", () => {
    const { dialog, onSave, onOpenChange } = setup();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSave).not.toHaveBeenCalled();
  });
});
