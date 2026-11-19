import { ToastProvider } from "@repo/ui";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BudgetEntry } from "~/types/budget";
import { BudgetEditor, type BudgetEditorProps } from "./BudgetEditor";

const row = (overrides: Partial<BudgetEntry>): BudgetEntry => ({
  id: "b-1",
  userId: "u1",
  name: "Rent",
  category: "housing",
  amount: 1200,
  frequency: "monthly",
  isIncome: false,
  isPrimaryIncome: false,
  isEssential: true,
  notes: null,
  isDefault: false,
  createdAt: "",
  updatedAt: "",
  ...overrides,
});

const entries = [
  row({}),
  row({ id: "b-2", name: "Salary", category: "income", amount: 3000, isIncome: true }),
  row({ id: "b-3", name: "Gym", category: "expenses", amount: 40, isEssential: false }),
];

const setup = (props: Partial<BudgetEditorProps> = {}, withToast = false) => {
  const handlers = {
    onAdd: vi.fn().mockResolvedValue(undefined),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(true),
  };
  const ui = (
    <BudgetEditor
      categories={["housing", "bills", "expenses", "savings", "income", "pets"]}
      entries={entries}
      {...handlers}
      {...props}
    />
  );
  render(withToast ? <ToastProvider>{ui}</ToastProvider> : ui);
  return handlers;
};

describe("BudgetEditor", () => {
  it("shows Money in first, then categories in the read view's order", () => {
    setup();
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    // Spending ranked by amount (housing £1,200, expenses £40), empty ones at the foot in order.
    expect(headings).toEqual(["Money in", "Housing", "Expenses", "Bills", "Savings", "Pets"]);
    expect(screen.getByTestId("budget-editor-name-b-2")).toBeDefined();
    // Income rows have no essential switch.
    expect(screen.queryByTestId("budget-editor-essential-b-2")).toBeNull();
  });

  it("saves a name on blur when it changed and is not empty", async () => {
    const { onUpdate } = setup();
    const name = screen.getByTestId("budget-editor-name-b-1");
    fireEvent.blur(name);
    expect(onUpdate).not.toHaveBeenCalled();
    fireEvent.change(name, { target: { value: "  " } });
    fireEvent.blur(name);
    expect(onUpdate).not.toHaveBeenCalled();
    expect((name as HTMLInputElement).value).toBe("Rent");
    fireEvent.change(name, { target: { value: "Rent and service charge" } });
    fireEvent.blur(name);
    expect(onUpdate).toHaveBeenCalledWith("b-1", { name: "Rent and service charge" });
  });

  it("saves an amount once on blur, not on each keystroke", () => {
    const { onUpdate } = setup();
    const amount = screen.getByTestId("budget-editor-amount-b-1");
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value: "1" } });
    fireEvent.change(amount, { target: { value: "13" } });
    fireEvent.change(amount, { target: { value: "1350" } });
    expect(onUpdate).not.toHaveBeenCalled();
    fireEvent.blur(amount);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith("b-1", { amount: 1350 });
  });

  it("restores the saved amount when the field is cleared and left, saving nothing", () => {
    const { onUpdate } = setup();
    const amount = screen.getByTestId("budget-editor-amount-b-1") as HTMLInputElement;
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value: "" } });
    fireEvent.blur(amount);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(amount.value).toContain("1,200");
  });

  it("does not save an unchanged amount", () => {
    const { onUpdate } = setup();
    const amount = screen.getByTestId("budget-editor-amount-b-1");
    fireEvent.focus(amount);
    fireEvent.blur(amount);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("saves a frequency change", () => {
    const { onUpdate } = setup();
    fireEvent.change(screen.getByTestId("budget-editor-frequency-b-1"), {
      target: { value: "annual" },
    });
    expect(onUpdate).toHaveBeenCalledWith("b-1", { frequency: "annual" });
  });

  it("saves an entry as joint at 50%, and shows a joint entry's share (E34 C1)", () => {
    const { onUpdate } = setup({
      entries: [
        row({}),
        row({ id: "b-4", name: "Energy", category: "bills", ownership: "joint", sharePercent: 40 }),
      ],
    });
    fireEvent.change(screen.getByTestId("budget-editor-b-1-ownership"), {
      target: { value: "joint" },
    });
    expect(onUpdate).toHaveBeenCalledWith("b-1", { ownership: "joint", sharePercent: 50 });
    expect(screen.getByText("Joint, 40%")).toBeTruthy();
  });

  it("saves the essential switch", () => {
    const { onUpdate } = setup();
    fireEvent.click(screen.getByTestId("budget-editor-essential-b-3"));
    expect(onUpdate).toHaveBeenCalledWith("b-3", { isEssential: true });
  });

  it("opens the add row from its quiet button, adds with the wizard's defaults, then closes it", async () => {
    const { onAdd } = setup();
    expect(screen.queryByTestId("budget-editor-new-name-expenses")).toBeNull();
    fireEvent.click(screen.getByTestId("budget-editor-open-add-expenses"));
    const add = screen.getByTestId("budget-editor-add-expenses") as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("budget-editor-new-name-expenses"), {
      target: { value: "Phone" },
    });
    const newAmount = screen.getByTestId("budget-editor-new-amount-expenses");
    fireEvent.focus(newAmount);
    fireEvent.change(newAmount, { target: { value: "25" } });
    fireEvent.click(add);
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "expenses",
          name: "Phone",
          amount: 25,
          frequency: "monthly",
          isIncome: false,
          isEssential: false,
        }),
      ),
    );
    await waitFor(() => expect(screen.queryByTestId("budget-editor-new-name-expenses")).toBeNull());
    expect(screen.getByTestId("budget-editor-open-add-expenses")).toBeDefined();
  });

  it("adds a new entry at the frequency picked in its add row", async () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByTestId("budget-editor-open-add-bills"));
    fireEvent.change(screen.getByTestId("budget-editor-new-name-bills"), {
      target: { value: "Car insurance" },
    });
    const frequency = screen.getByLabelText(
      "How often for new entry in Bills",
    ) as HTMLSelectElement;
    expect(frequency.value).toBe("monthly");
    fireEvent.change(frequency, { target: { value: "annual" } });
    fireEvent.click(screen.getByTestId("budget-editor-add-bills"));
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ category: "bills", name: "Car insurance", frequency: "annual" }),
      ),
    );
  });

  it("adds income as income, and other spending as essential", async () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByTestId("budget-editor-open-add-income"));
    fireEvent.change(screen.getByTestId("budget-editor-new-name-income"), {
      target: { value: "Child Benefit" },
    });
    fireEvent.click(screen.getByTestId("budget-editor-add-income"));
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ category: "income", isIncome: true, amount: 0 }),
      ),
    );
    fireEvent.click(screen.getByTestId("budget-editor-open-add-bills"));
    fireEvent.change(screen.getByTestId("budget-editor-new-name-bills"), {
      target: { value: "Water" },
    });
    fireEvent.click(screen.getByTestId("budget-editor-add-bills"));
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ category: "bills", isIncome: false, isEssential: true }),
      ),
    );
  });

  it("gives the add row the same fields as a saved row: Essential and sole or joint (item 26)", async () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByTestId("budget-editor-open-add-bills"));
    fireEvent.change(screen.getByTestId("budget-editor-new-name-bills"), {
      target: { value: "Water" },
    });
    const essential = screen.getByTestId("budget-editor-new-essential-bills") as HTMLInputElement;
    expect(essential.checked).toBe(true);
    fireEvent.click(essential);
    fireEvent.change(screen.getByTestId("budget-editor-new-bills-ownership"), {
      target: { value: "joint" },
    });
    fireEvent.click(screen.getByTestId("budget-editor-add-bills"));
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "bills",
          name: "Water",
          isEssential: false,
          ownership: "joint",
          sharePercent: 50,
        }),
      ),
    );
  });

  it("starts a new savings entry with Essential off, and income with no switch (item 28)", async () => {
    const { onAdd } = setup();
    fireEvent.click(screen.getByTestId("budget-editor-open-add-savings"));
    expect(
      (screen.getByTestId("budget-editor-new-essential-savings") as HTMLInputElement).checked,
    ).toBe(false);
    fireEvent.change(screen.getByTestId("budget-editor-new-name-savings"), {
      target: { value: "Holiday fund" },
    });
    fireEvent.click(screen.getByTestId("budget-editor-add-savings"));
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ category: "savings", isEssential: false, ownership: "sole" }),
      ),
    );
    fireEvent.click(screen.getByTestId("budget-editor-open-add-income"));
    expect(screen.queryByTestId("budget-editor-new-essential-income")).toBeNull();
  });

  it("offers the Essential switch on a saved savings row (item 28)", () => {
    const { onUpdate } = setup({
      entries: [
        ...entries,
        row({ id: "s-1", name: "ISA", category: "savings", amount: 200, isEssential: false }),
      ],
    });
    const toggle = screen.getByTestId("budget-editor-essential-s-1") as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);
    expect(onUpdate).toHaveBeenCalledWith("s-1", { isEssential: true });
  });

  it("deletes with the subtle danger button (item 25)", () => {
    setup();
    expect(screen.getByTestId("budget-editor-remove-b-1").className).toContain("danger");
  });

  it("has a Finish editing button at the foot when the page gives one (item 29)", () => {
    const onFinishEditing = vi.fn();
    setup({ onFinishEditing });
    fireEvent.click(screen.getByRole("button", { name: "Finish editing" }));
    expect(onFinishEditing).toHaveBeenCalled();
  });

  describe("linked rows (items 7 and 33b)", () => {
    const takeHome = row({
      id: "linked:take-home",
      name: "Take-home pay",
      category: "income",
      amount: 2400,
      isIncome: true,
      linked: "take_home",
    });
    const rent = row({ id: "linked:housing", name: "Rent", amount: 950, linked: "housing" });

    it("shows the take-home from Profile, and typing over it saves the person's own entry", async () => {
      const { onAdd } = setup({
        entries: [row({})],
        linkedEntries: [takeHome],
      });
      expect(screen.getByTestId("budget-editor-source-linked-take-home").textContent).toBe(
        "From your salary in Profile. A figure you type here is used instead.",
      );
      const amount = screen.getByLabelText("Amount for Take-home pay") as HTMLInputElement;
      expect(amount.value).toBe("2,400");
      expect(screen.queryByLabelText("Delete Take-home pay")).toBeNull();
      fireEvent.focus(amount);
      fireEvent.change(amount, { target: { value: "2500" } });
      fireEvent.blur(amount);
      await waitFor(() =>
        expect(onAdd).toHaveBeenCalledWith(
          expect.objectContaining({ name: "Take-home pay", amount: 2500, isIncome: true }),
          // It stands in for the linked line, so the page must not also keep that line.
          { replacesLinkedLine: true },
        ),
      );
    });

    it("offers the take-home for an income row and replaces the row the person picks", async () => {
      const { onUpdate } = setup({
        linkOffers: [
          {
            link: "take_home",
            monthly: 2400,
            kind: null,
            paymentEstimated: false,
            rowIds: ["b-2"],
          },
        ],
      });
      const use = screen.getByRole("button", {
        name: "Use your take-home pay of £2,400 in place of Salary",
      });
      expect(use.textContent).toBe("Use your take-home pay of £2,400");
      // Only the offered row gets the button.
      expect(screen.queryByTestId("budget-editor-use-link-b-3")).toBeNull();
      fireEvent.click(use);
      // One stored value: the row keeps its place at £0 and the take-home is read in its place.
      await waitFor(() =>
        expect(onUpdate).toHaveBeenCalledWith("b-2", { amount: 0, linkKind: "take_home" }),
      );
    });

    it("names the saved housing figure when it offers to replace a housing row", () => {
      setup({
        linkOffers: [
          {
            link: "housing",
            monthly: 950,
            kind: "mortgage",
            paymentEstimated: false,
            rowIds: ["b-1"],
          },
        ],
      });
      expect(screen.getByTestId("budget-editor-use-link-b-1").textContent).toBe(
        "Use your saved mortgage payment of £950",
      );
    });

    it("typing over a take-home that replaced a row saves the figure back on that row", async () => {
      const chosen = row({
        id: "pay",
        name: "Paycheck",
        category: "income",
        amount: 0,
        isIncome: true,
        linkKind: "take_home",
      });
      const { onAdd, onUpdate } = setup({
        entries: [chosen],
        linkedEntries: [takeHome],
        shadowedIds: ["pay"],
      });
      const amount = screen.getByLabelText("Amount for Take-home pay");
      fireEvent.focus(amount);
      fireEvent.change(amount, { target: { value: "2500" } });
      fireEvent.blur(amount);
      await waitFor(() =>
        expect(onUpdate).toHaveBeenCalledWith("pay", { amount: 2500, linkKind: null }),
      );
      expect(onAdd).not.toHaveBeenCalled();
    });

    it("saves a rent typed on the linked housing row to the housing details", async () => {
      const onSaveHousing = vi.fn().mockResolvedValue(undefined);
      const { onAdd, onUpdate } = setup({
        entries: [row({ id: "old-rent", name: "Rent", amount: 900 })],
        linkedEntries: [rent],
        shadowedIds: ["old-rent"],
        housingStatus: "renting",
        onSaveHousing,
      });
      // The saved row the linked one stands in for is not listed: no duplicate.
      expect(screen.queryByTestId("budget-editor-row-old-rent")).toBeNull();
      const amount = screen.getByLabelText("Amount for Rent");
      fireEvent.focus(amount);
      fireEvent.change(amount, { target: { value: "1000" } });
      fireEvent.blur(amount);
      await waitFor(() => expect(onSaveHousing).toHaveBeenCalledWith(1000));
      expect(onAdd).not.toHaveBeenCalled();
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("shows a mortgage payment as read only, from the mortgage details", () => {
      setup({
        entries: [],
        linkedEntries: [{ ...rent, name: "Mortgage payment" }],
        housingStatus: "mortgage",
      });
      expect(screen.queryByLabelText("Amount for Mortgage payment")).toBeNull();
      expect(screen.getByTestId("budget-editor-source-linked-housing").textContent).toBe(
        "Your own cost, from your mortgage details.",
      );
    });
  });

  describe("savings and debt lines linked to an account (audit slice 5)", () => {
    const accounts = [
      { id: "acc-saver", name: "Easy saver", type: "Saving" },
      { id: "acc-loan", name: "Car loan", type: "Loan" },
    ];
    const stored = row({
      id: "save",
      name: "Saving each month",
      category: "savings",
      amount: 0,
      isEssential: false,
      linkKind: "savings",
      linkAccountId: "acc-saver",
    });
    const line = (over: Partial<BudgetEntry> = {}) =>
      row({
        id: "linked:savings:save",
        name: "Saving each month",
        category: "savings",
        amount: 200,
        isEssential: false,
        linked: "savings",
        linkedRowId: "save",
        linkAccountId: "acc-saver",
        ...over,
      });

    it("shows the account's figure with where it comes from, and no amount field", () => {
      setup({
        entries: [stored],
        shadowedIds: ["save"],
        linkedEntries: [line()],
        linkableAccounts: accounts,
      });
      expect(screen.queryByLabelText("Amount for Saving each month")).toBeNull();
      expect(screen.getByTestId("budget-editor-figure-linked-savings-save").textContent).toContain(
        "£200",
      );
      expect(screen.getByTestId("budget-editor-source-linked-savings-save").textContent).toContain(
        "Your share of the monthly saving on Easy saver, from the Savings page.",
      );
    });

    it("says Not set, with where to add the amount, when the account has none saved", () => {
      setup({
        entries: [stored],
        shadowedIds: ["save"],
        linkedEntries: [line({ amount: 0, notSet: true })],
        linkableAccounts: accounts,
      });
      const figure = screen.getByTestId("budget-editor-figure-linked-savings-save");
      expect(figure.textContent).toContain("Not set");
      expect(figure.textContent).not.toContain("£0");
      expect(within(figure).getByText("Add the monthly saving")).toBeDefined();
    });

    it("says the account was removed, with no link, when it is gone", () => {
      setup({
        entries: [{ ...stored, linkAccountId: null }],
        shadowedIds: ["save"],
        linkedEntries: [line({ amount: 0, notSet: true, linkAccountId: null })],
        linkableAccounts: accounts,
      });
      const figure = screen.getByTestId("budget-editor-figure-linked-savings-save");
      expect(figure.textContent).toContain("Not set");
      expect(within(figure).queryByText("Add the monthly saving")).toBeNull();
      expect(screen.getByTestId("budget-editor-source-linked-savings-save").textContent).toContain(
        "The account this line used was removed or changed.",
      );
    });

    it("unlinks with the figure it showed, dropping the account", async () => {
      const { onUpdate } = setup({
        entries: [stored],
        shadowedIds: ["save"],
        linkedEntries: [line()],
        linkableAccounts: accounts,
      });
      fireEvent.click(screen.getByTestId("budget-editor-unlink-linked-savings-save"));
      await waitFor(() =>
        expect(onUpdate).toHaveBeenCalledWith("save", {
          linkKind: null,
          linkAccountId: null,
          amount: 200,
          frequency: "monthly",
          ownership: "sole",
          sharePercent: null,
        }),
      );
    });

    it("deletes the stored line after asking", async () => {
      const { onDelete } = setup({
        entries: [stored],
        shadowedIds: ["save"],
        linkedEntries: [line()],
        linkableAccounts: accounts,
      });
      fireEvent.click(screen.getByRole("button", { name: "Delete Saving each month" }));
      fireEvent.click(await screen.findByRole("button", { name: "Delete entry" }));
      await waitFor(() => expect(onDelete).toHaveBeenCalledWith("save"));
    });

    it("offers a one-tap link on an entry that matches an account, moving it to Debt", async () => {
      const copy = row({ id: "copy", name: "Car loan payment", category: "bills", amount: 180 });
      const { onUpdate } = setup({
        entries: [copy],
        linkableAccounts: accounts,
        accountLinkOffers: [
          {
            rowId: "copy",
            rowName: "Car loan payment",
            rowCategory: "bills",
            link: "debt",
            accountId: "acc-loan",
            accountName: "Car loan",
            monthly: 180,
          },
        ],
      });
      fireEvent.click(screen.getByRole("button", { name: "Link Car loan payment to Car loan" }));
      await waitFor(() =>
        expect(onUpdate).toHaveBeenCalledWith("copy", {
          amount: 0,
          category: "debt",
          linkKind: "debt",
          linkAccountId: "acc-loan",
        }),
      );
    });
  });

  describe("linked lines the person chose (decision 1)", () => {
    const chosenPay = row({
      id: "pay",
      name: "Paycheck",
      category: "income",
      amount: 0,
      isIncome: true,
      linkKind: "take_home",
    });
    const chosenRent = row({ id: "rent", name: "Our rent", amount: 0, linkKind: "housing" });

    it("shows a take-home that is not set as Not set with a link to add the salary, never £0", () => {
      setup({
        entries: [chosenPay],
        shadowedIds: ["pay"],
        linkedEntries: [
          row({
            id: "linked:take-home",
            name: "Take-home pay",
            category: "income",
            amount: 0,
            isIncome: true,
            linked: "take_home",
            linkedRowId: "pay",
            notSet: true,
          }),
        ],
      });
      expect(screen.queryByLabelText("Amount for Take-home pay")).toBeNull();
      const figure = screen.getByTestId("budget-editor-figure-linked-take-home");
      expect(figure.textContent).toContain("Not set");
      expect(figure.textContent).not.toContain("£0");
      // The global test setup renders links as their text; notSetActionFor's test checks the href.
      expect(within(figure).getByText("Add your salary")).toBeDefined();
    });

    it("unlinks a take-home line, keeping the figure it showed as the person's own", async () => {
      const { onUpdate } = setup({
        entries: [chosenPay],
        shadowedIds: ["pay"],
        linkedEntries: [
          row({
            id: "linked:take-home",
            name: "Take-home pay",
            category: "income",
            amount: 2400,
            isIncome: true,
            linked: "take_home",
            linkedRowId: "pay",
          }),
        ],
      });
      fireEvent.click(screen.getByRole("button", { name: "Type my own figure" }));
      await waitFor(() =>
        expect(onUpdate).toHaveBeenCalledWith("pay", {
          linkKind: null,
          linkAccountId: null,
          amount: 2400,
          frequency: "monthly",
          ownership: "sole",
          sharePercent: null,
        }),
      );
    });

    it("unlinks a housing line that is not set with no figure, keeping its share", async () => {
      const { onUpdate } = setup({
        entries: [chosenRent],
        shadowedIds: ["rent"],
        housingStatus: "renting",
        linkedEntries: [
          row({
            id: "linked:housing",
            name: "Our rent",
            amount: 0,
            linked: "housing",
            linkedRowId: "rent",
            notSet: true,
            ownership: "joint",
            sharePercent: 50,
          }),
        ],
      });
      // A rent can be typed here to save it to the housing details: the field starts empty.
      expect((screen.getByLabelText("Amount for Our rent") as HTMLInputElement).value).toBe("");
      fireEvent.click(screen.getByRole("button", { name: "Type my own figure" }));
      await waitFor(() =>
        expect(onUpdate).toHaveBeenCalledWith("rent", {
          linkKind: null,
          linkAccountId: null,
          amount: 0,
          frequency: "monthly",
          ownership: "joint",
          sharePercent: 50,
        }),
      );
    });

    it("turns a housing row linked to the saved rent back into the person's own row", async () => {
      // The housing row is linked to the saved rent of £950, the person's own cost. The line
      // carries that row's id: "Type my own figure" writes £950 to it, an ordinary sole row again.
      const emptyRent = row({ id: "rent", name: "Rent", amount: 0, linkKind: "housing" });
      const { onUpdate } = setup({
        entries: [emptyRent],
        shadowedIds: ["rent"],
        housingStatus: "renting",
        linkedEntries: [
          row({
            id: "linked:housing",
            name: "Rent",
            amount: 950,
            linked: "housing",
            linkedRowId: "rent",
          }),
        ],
      });
      expect(screen.getByTestId("budget-editor-source-linked-housing").textContent).toContain(
        "Your own cost, from your housing details",
      );
      fireEvent.click(screen.getByRole("button", { name: "Type my own figure" }));
      await waitFor(() =>
        expect(onUpdate).toHaveBeenCalledWith("rent", {
          linkKind: null,
          linkAccountId: null,
          amount: 950,
          frequency: "monthly",
          ownership: "sole",
          sharePercent: null,
        }),
      );
    });

    it("offers no unlink on a line the engine added on its own", () => {
      setup({
        entries: [],
        linkedEntries: [
          row({ id: "linked:housing", name: "Rent", amount: 950, linked: "housing" }),
        ],
        housingStatus: "renting",
      });
      expect(screen.queryByRole("button", { name: "Type my own figure" })).toBeNull();
    });
  });

  it("keeps the typed add row when adding fails", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("no"));
    setup({ onAdd });
    fireEvent.click(screen.getByTestId("budget-editor-open-add-bills"));
    fireEvent.change(screen.getByTestId("budget-editor-new-name-bills"), {
      target: { value: "Water" },
    });
    fireEvent.click(screen.getByTestId("budget-editor-add-bills"));
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect((screen.getByTestId("budget-editor-new-name-bills") as HTMLInputElement).value).toBe(
        "Water",
      ),
    );
  });

  it("asks before removing, naming the entry, then deletes", async () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Delete Rent" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Delete Rent?")).toBeDefined();
    expect(dialog.textContent).toContain("£1,200");
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete entry" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("b-1"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("cancelling the remove deletes nothing", async () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Delete Gym" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("shows one quiet toast per save and remove, none for an add", async () => {
    setup({}, true);
    fireEvent.change(screen.getByTestId("budget-editor-frequency-b-1"), {
      target: { value: "weekly" },
    });
    expect(await screen.findByText("Saved")).toBeDefined();

    fireEvent.click(screen.getByTestId("budget-editor-open-add-bills"));
    fireEvent.change(screen.getByTestId("budget-editor-new-name-bills"), {
      target: { value: "Water" },
    });
    fireEvent.click(screen.getByTestId("budget-editor-add-bills"));
    // The new row is the confirmation: no "Entry added" message.
    await waitFor(() => expect(screen.getByTestId("budget-editor-open-add-bills")).toBeDefined());
    expect(screen.queryByText("Entry added")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Delete Rent" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete entry" }));
    expect(await screen.findByText("Entry deleted")).toBeDefined();
  });

  it("shows no toast when a save fails", async () => {
    setup({ onUpdate: vi.fn().mockRejectedValue(new Error("no")) }, true);
    fireEvent.change(screen.getByTestId("budget-editor-frequency-b-1"), {
      target: { value: "weekly" },
    });
    await waitFor(() => expect(screen.queryByText("Saved")).toBeNull());
  });

  it("names the openers, gives examples in the add rows and says when a section is empty", () => {
    setup();
    expect(screen.getByTestId("budget-editor-open-add-income").textContent).toBe("Add income");
    expect(screen.getByTestId("budget-editor-open-add-bills").textContent).toBe("Add to bills");
    fireEvent.click(screen.getByTestId("budget-editor-open-add-income"));
    expect(
      (screen.getByTestId("budget-editor-new-name-income") as HTMLInputElement).placeholder,
    ).toBe("For example, Child Benefit");
    fireEvent.click(screen.getByTestId("budget-editor-open-add-pets"));
    const petsName = screen.getByLabelText("New entry name in Pets") as HTMLInputElement;
    expect(petsName.placeholder).toBe("Name");
    expect(screen.getAllByText("No entries added").length).toBeGreaterThan(0);
    const cancel = screen.getByTestId("budget-editor-cancel-add-pets");
    expect(cancel.id).toBe("budget-editor-cancel-add-pets");
    const remove = screen.getByTestId("budget-editor-remove-b-1");
    expect(remove.getAttribute("title")).toBe("Delete Rent");
  });

  it("returns focus to the opener after a Cancel", () => {
    setup();
    fireEvent.click(screen.getByTestId("budget-editor-open-add-bills"));
    expect(document.activeElement).toBe(screen.getByTestId("budget-editor-new-name-bills"));
    fireEvent.click(screen.getByTestId("budget-editor-cancel-add-bills"));
    expect(document.activeElement).toBe(screen.getByTestId("budget-editor-open-add-bills"));
  });

  it("returns focus to the opener after a successful Add", async () => {
    setup();
    fireEvent.click(screen.getByTestId("budget-editor-open-add-bills"));
    fireEvent.change(screen.getByTestId("budget-editor-new-name-bills"), {
      target: { value: "Water" },
    });
    fireEvent.click(screen.getByTestId("budget-editor-add-bills"));
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId("budget-editor-open-add-bills")),
    );
  });

  it("after a delete, moves focus to the next row's name, or to the section heading", async () => {
    const twoRows = [row({}), row({ id: "b-4", name: "Service charge" }), ...entries.slice(1)];
    const onDelete = vi.fn().mockResolvedValue(true);
    const { rerender } = render(
      <BudgetEditor
        categories={["housing", "income"]}
        entries={twoRows}
        onAdd={vi.fn()}
        onDelete={onDelete}
        onUpdate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete Rent" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete entry" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("b-1"));
    const remaining = twoRows.filter((e) => e.id !== "b-1");
    rerender(
      <BudgetEditor
        categories={["housing", "income"]}
        entries={remaining}
        onAdd={vi.fn()}
        onDelete={onDelete}
        onUpdate={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId("budget-editor-name-b-4")),
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Service charge" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete entry" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("b-4"));
    rerender(
      <BudgetEditor
        categories={["housing", "income"]}
        entries={remaining.filter((e) => e.id !== "b-4")}
        onAdd={vi.fn()}
        onDelete={onDelete}
        onUpdate={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { level: 3, name: "Housing" }),
      ),
    );
  });

  it("shows unflagged entries in the income category under Money in", () => {
    setup({
      entries: [row({ id: "b-9", name: "Pension", category: "income", isIncome: false })],
    });
    const moneyIn = screen.getByRole("heading", { level: 3, name: "Money in" }).closest("section");
    expect(moneyIn && within(moneyIn).getByTestId("budget-editor-name-b-9")).toBeTruthy();
    expect(screen.queryByTestId("budget-editor-essential-b-9")).toBeNull();
  });

  it("keeps a custom category that holds only income from looking empty", () => {
    const onDeleteCategory = vi.fn();
    setup({
      categories: ["housing", "side-work", "pets"],
      entries: [row({ id: "s", category: "side-work", name: "Tutoring", isIncome: true })],
      onDeleteCategory,
      removableCategories: ["side-work", "pets"],
    });
    expect(screen.queryByTestId("budget-editor-remove-category-side-work")).toBeNull();
    const removePets = screen.getByTestId("budget-editor-remove-category-pets");
    expect(removePets.id).toBe("budget-editor-remove-category-pets");
    fireEvent.click(removePets);
    expect(onDeleteCategory).toHaveBeenCalledWith("pets");
  });
});
