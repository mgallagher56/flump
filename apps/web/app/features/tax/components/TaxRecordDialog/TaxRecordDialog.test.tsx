import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { RECORD_DATE_RANGE_ERROR, TaxRecordDialog, type TaxRecordDraft } from "./TaxRecordDialog";

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

describe("TaxRecordDialog finance costs brought forward", () => {
  it("offers the category for rental expenses and says what to enter and where it comes from", () => {
    const { dialog } = setup(
      { ...draft, type: "expense", category: "finance_costs_brought_forward" },
      "edit",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Category and notes" }));
    const category = within(dialog).getByLabelText("Category") as HTMLSelectElement;
    expect(category.value).toBe("finance_costs_brought_forward");
    expect(
      within(dialog).getByText(
        "Enter the unused residential finance costs from last year's tax return or calculation.",
      ),
    ).toBeDefined();
  });

  it("shows no such sentence for other categories", () => {
    const { dialog } = setup(
      { ...draft, type: "expense", category: "repairs_maintenance" },
      "edit",
    );
    expect(within(dialog).queryByText(/unused residential finance costs/)).toBeNull();
  });
});

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

  it("rejects a date outside the supported tax years, so no record is saved out of sight", () => {
    expect(RECORD_DATE_RANGE_ERROR).toBe("Enter a date between 6 April 2020 and 5 April 2027.");
    const { dialog, onSave } = setup({ ...draft, name: "Rent", amount: 900, date: "2019-05-01" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add record" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(within(dialog).getByText(RECORD_DATE_RANGE_ERROR)).toBeDefined();

    fireEvent.click(within(dialog).getByRole("button", { name: /^First payment/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Choose year/ }));
    fireEvent.click(screen.getByRole("button", { name: "2027" }));
    fireEvent.click(screen.getByRole("button", { name: /^Choose month/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apr" }));
    expect((screen.getByRole("button", { name: "6 Apr 2027" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "5 Apr 2027" }));

    fireEvent.click(within(dialog).getByRole("button", { name: "Add record" }));
    expect(onSave).toHaveBeenCalledTimes(1);
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

  it("asks for the amount before the income source and type (R2-8)", () => {
    const { dialog } = setup();
    const fields = [...dialog.querySelectorAll("input, select")].map(
      (el) => el.getAttribute("id") ?? "",
    );
    const amount = within(dialog).getByLabelText(/^Amount/).id;
    const source = within(dialog).getByLabelText("Income source").id;
    expect(fields.indexOf(amount)).toBeLessThan(fields.indexOf(source));
    expect(fields.indexOf(amount)).toBe(1);
  });

  it("keeps category and notes under a toggle named for them and still saves the category", () => {
    const { dialog, onSave } = setup({ ...draft, name: "Rent", amount: 900 });
    const toggle = within(dialog).getByRole("button", { name: "Category and notes" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    const category = within(dialog).getByLabelText("Category") as HTMLSelectElement;
    expect(within(dialog).getByLabelText(/^Notes/)).toBeDefined();
    fireEvent.change(within(dialog).getByLabelText("Income source"), {
      target: { value: "self-employed" },
    });
    fireEvent.change(within(dialog).getByLabelText("Type"), { target: { value: "expense" } });
    fireEvent.change(category, { target: { value: "legal_finance_fees" } });
    expect(
      within(dialog).getByRole("option", { name: "Accountant, legal and bank fees" }),
    ).toBeDefined();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add record" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ category: "legal_finance_fees", source: "self-employed" }),
    );
  });

  it("opens Category and notes when an edited record already has notes", () => {
    const { dialog } = setup({ ...draft, name: "Rent", amount: 900, notes: "Flat 2" }, "edit");
    expect(
      within(dialog)
        .getByRole("button", { name: "Category and notes" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect((within(dialog).getByLabelText(/^Notes/) as HTMLInputElement).value).toBe("Flat 2");
  });

  it("keeps the actions in a sticky footer", () => {
    const { dialog } = setup();
    const footer = within(dialog).getByRole("button", { name: "Add record" }).parentElement;
    expect(footer?.className).toContain("pos_sticky");
  });

  it("lets each field row shrink to the dialog, so it fits a 320px screen (P79)", () => {
    const { dialog } = setup();
    const form = dialog.querySelector("form") as HTMLFormElement;
    expect(form.className).toContain("min-w_0");
    const row = within(dialog)
      .getByLabelText(/^Amount/)
      .closest('[class*="grid-tc"]');
    expect(row?.className).toContain("grid-tc_minmax(0,_1fr)");
  });

  it("offers no salary category on a new PAYE record, and calls the type Expense", () => {
    const { dialog } = setup({ ...draft, source: "paye", category: "paye_bonus" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Category and notes" }));
    const options = within(within(dialog).getByLabelText("Category")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Bonus and overtime",
      "Taxable benefits (P11D)",
    ]);
    expect(within(dialog).getByRole("option", { name: "Expense" })).toBeDefined();
    expect(within(dialog).queryByRole("option", { name: "Cost" })).toBeNull();
  });

  it("keeps the salary category on a saved salary record, so it can still be edited", () => {
    const { dialog, onSave } = setup(
      { ...draft, name: "Payslip", amount: 3000, source: "paye", category: "paye_salary" },
      "edit",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Category and notes" }));
    const category = within(dialog).getByLabelText("Category") as HTMLSelectElement;
    expect(category.value).toBe("paye_salary");
    expect(within(category).getByRole("option", { name: "Salary" })).toBeDefined();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ category: "paye_salary" }));
  });
});

describe("TaxRecordDialog with a category no list holds", () => {
  // A row saved before the contract checked categories, for example "Rent".
  const legacy: TaxRecordDraft = { ...draft, name: "Flat rent", amount: 1150, category: "Rent" };

  it("opens Category and notes and asks for a category, without picking one silently", () => {
    const { dialog } = setup(legacy, "edit");
    const category = within(dialog).getByLabelText("Category") as HTMLSelectElement;
    expect(category.value).toBe("Rent");
    expect(within(dialog).getByRole("option", { name: "Choose a category" })).toBeDefined();
  });

  it("blocks saving with the error on the category field only", () => {
    const { dialog, onSave } = setup(legacy, "edit");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Choose a category from the list.")).toBeDefined();
    expect(within(dialog).queryByText("Enter a name for this record.")).toBeNull();
  });

  it("saves once a listed category is chosen", () => {
    const { dialog, onSave } = setup(legacy, "edit");
    fireEvent.change(within(dialog).getByLabelText("Category"), {
      target: { value: "rental_income" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ category: "rental_income" }));
  });
});

describe("TaxRecordDialog linked account (slice 7)", () => {
  const accounts = [
    { id: "p1", name: "Flat 2", type: "Property", accountSubtype: "rental" },
    { id: "h1", name: "Home", type: "Property", accountSubtype: "home" },
    { id: "m1", name: "Flat 2 mortgage", type: "Mortgage", accountSubtype: "btl_mortgage" },
    { id: "s1", name: "Easy access", type: "Saving" },
  ];
  const withAccounts = (initial: TaxRecordDraft, mode: "add" | "edit" = "add") => {
    const onSave = vi.fn();
    render(
      <TaxRecordDialog
        open
        accounts={accounts}
        mode={mode}
        initial={initial}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );
    return { onSave, dialog: screen.getByRole("dialog") };
  };
  const filled = { ...draft, name: "Rent", amount: 1000 };

  it("lists rental properties and mortgages for a rental record, plus Not linked", () => {
    const { dialog } = withAccounts(filled);
    const select = within(dialog).getByLabelText("Linked account") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual([
      "Not linked",
      "Flat 2",
      "Flat 2 mortgage",
    ]);
    expect(select.value).toBe("");
  });

  it("sends the chosen account with the record", () => {
    const { dialog, onSave } = withAccounts(filled);
    fireEvent.change(within(dialog).getByLabelText("Linked account"), {
      target: { value: "p1" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add record" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ accountId: "p1" }));
  });

  it("keeps the saved link when editing", () => {
    const { dialog, onSave } = withAccounts({ ...filled, accountId: "m1" }, "edit");
    expect((within(dialog).getByLabelText("Linked account") as HTMLSelectElement).value).toBe("m1");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ accountId: "m1" }));
  });

  it("clears a link that no longer fits when the source changes", () => {
    const { dialog, onSave } = withAccounts({ ...filled, accountId: "p1" });
    fireEvent.change(within(dialog).getByLabelText("Income source"), {
      target: { value: "savings" },
    });
    const select = within(dialog).getByLabelText("Linked account") as HTMLSelectElement;
    expect(select.value).toBe("");
    expect([...select.options].map((o) => o.textContent)).toEqual(["Not linked", "Easy access"]);
    fireEvent.change(within(dialog).getByLabelText("Income source"), {
      target: { value: "self-employed" },
    });
    expect(within(dialog).queryByLabelText("Linked account")).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Add record" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ accountId: null }));
  });
});

/** The dialog as the page uses it: a fresh blank record after each "Add and start another". */
const Harness = ({ onSave }: { onSave: (d: TaxRecordDraft) => void }) => {
  const [initial, setInitial] = useState(draft);
  const [savedName, setSavedName] = useState<string | null>(null);
  return (
    <TaxRecordDialog
      initial={initial}
      mode="add"
      onOpenChange={() => undefined}
      onSave={onSave}
      onSaveAndAddAnother={(d) => {
        onSave(d);
        // As the page does once the save lands: a blank record with the same source and type.
        setInitial({ ...draft, source: d.source, type: d.type, date: d.date });
        setSavedName(d.name);
      }}
      open
      savedName={savedName}
    />
  );
};

describe("TaxRecordDialog add and start another (E38 S2)", () => {
  it("saves, says what was added, clears the form and puts the focus on Name", async () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/^Name/), "Flat rent");
    await userEvent.type(within(dialog).getByLabelText(/^Amount/), "900");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add and start another" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Flat rent", amount: 900 }),
    );
    expect(within(dialog).getByRole("status").textContent).toBe(
      "Flat rent added. Add the next record.",
    );
    const name = within(dialog).getByLabelText(/^Name/) as HTMLInputElement;
    expect(name.value).toBe("");
    expect(document.activeElement).toBe(name);
    expect((within(dialog).getByLabelText("Income source") as HTMLSelectElement).value).toBe(
      "rental",
    );
  });

  it("checks the record first: an empty one is not saved and shows its errors", async () => {
    const onSave = vi.fn();
    render(<Harness onSave={onSave} />);
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add and start another" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Enter a name for this record.")).toBeDefined();
  });

  it("waits while a save is on its way, so a second press cannot add the record twice", async () => {
    const onSave = vi.fn();
    const onAnother = vi.fn();
    render(
      <TaxRecordDialog
        initial={{ ...draft, name: "Flat rent", amount: 900 }}
        mode="add"
        onOpenChange={() => undefined}
        onSave={onSave}
        onSaveAndAddAnother={onAnother}
        open
        pending
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Add and start another" }));
    await userEvent.click(screen.getByRole("button", { name: "Add record" }));
    expect(onAnother).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("is not offered when editing", () => {
    render(
      <TaxRecordDialog
        initial={{ ...draft, name: "Flat rent", amount: 900 }}
        mode="edit"
        onOpenChange={() => undefined}
        onSave={vi.fn()}
        onSaveAndAddAnother={vi.fn()}
        open
      />,
    );
    expect(screen.queryByRole("button", { name: "Add and start another" })).toBeNull();
  });
});
