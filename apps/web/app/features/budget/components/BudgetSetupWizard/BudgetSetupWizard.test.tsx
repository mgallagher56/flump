import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BudgetEntry } from "~/types/budget";
import { BudgetSetupWizard } from "./BudgetSetupWizard";

const mockEntries: BudgetEntry[] = [
  {
    id: "entry-1",
    userId: "user-1",
    category: "income",
    name: "Salary",
    amount: 3000,
    frequency: "monthly",
    isIncome: true,
    isPrimaryIncome: true,
    isEssential: true,
    notes: null,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "entry-2",
    userId: "user-1",
    category: "housing",
    name: "Rent",
    amount: 1000,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    notes: null,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("BudgetSetupWizard: take-home from the profile (owner item 7)", () => {
  const goToIncome = () => {
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }));
  };
  const props = {
    onAddEntry: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    onComplete: vi.fn(),
    onDeleteEntry: vi.fn().mockResolvedValue(undefined),
    onUpdateEntry: vi.fn().mockResolvedValue(undefined),
  };

  it("says the take-home is already in the budget, with no copy button", async () => {
    render(<BudgetSetupWizard {...props} entries={[mockEntries[1]]} monthlyTakeHome={2400} />);
    goToIncome();
    const note = await screen.findByTestId("wizard-linked-take-home");
    expect(note.textContent).toBe(
      "Your take-home pay of £2,400 a month is already in your budget, worked out from your salary in Profile. To use a different figure, add a pay entry below.",
    );
    expect(screen.queryByRole("button", { name: /^Use / })).toBeNull();
  });

  it("says when the person's own pay entry is used instead", async () => {
    render(<BudgetSetupWizard {...props} entries={mockEntries} monthlyTakeHome={2400} />);
    goToIncome();
    expect((await screen.findByTestId("wizard-linked-take-home")).textContent).toContain(
      "Your own pay entry is used in place of the take-home pay",
    );
  });
});

describe("BudgetSetupWizard", () => {
  it("renders the welcome step and advances to income step", async () => {
    const onUpdateEntry = vi.fn().mockResolvedValue(undefined);
    const onAddEntry = vi.fn().mockResolvedValue(undefined);
    const onDeleteEntry = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(
      <BudgetSetupWizard
        entries={mockEntries}
        monthlyTakeHome={3000}
        onAddEntry={onAddEntry}
        onCancel={onCancel}
        onComplete={onComplete}
        onDeleteEntry={onDeleteEntry}
        onUpdateEntry={onUpdateEntry}
      />,
    );

    expect(screen.getByText("Set up your budget")).toBeDefined();

    // Click Next to go to Defaults step
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText(/start with common entries/i)).toBeDefined();

    // Click Start blank to go to Income step
    fireEvent.click(screen.getByRole("button", { name: /start blank/i }));

    expect(await screen.findByText("Salary")).toBeDefined();
    expect(screen.getByText("Add income entry")).toBeDefined();
  });

  it("edit mode starts at Income with the saved entries, with no welcome or example figures", async () => {
    const onCancel = vi.fn();
    const onComplete = vi.fn();
    render(
      <BudgetSetupWizard
        entries={mockEntries}
        mode="edit"
        monthlyTakeHome={3000}
        onAddEntry={vi.fn().mockResolvedValue(undefined)}
        onCancel={onCancel}
        onComplete={onComplete}
        onDeleteEntry={vi.fn().mockResolvedValue(undefined)}
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText("Edit your budget")).toBeDefined();
    expect(screen.getByText("Step 1 of 6")).toBeDefined();
    expect(screen.queryByText("Set up your budget")).toBeNull();
    expect(screen.queryByText("Defaults")).toBeNull();
    expect(screen.getByRole("heading", { name: "Income" })).toBeDefined();
    expect(screen.getByText("Salary")).toBeDefined();

    // Back from the first step cancels, it never reaches the welcome or example figures.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      await screen.findByText(`Step ${i + 2} of 6`);
    }
    fireEvent.click(screen.getByRole("button", { name: "Finish editing" }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("allows removing an item", async () => {
    const onUpdateEntry = vi.fn().mockResolvedValue(undefined);
    const onAddEntry = vi.fn().mockResolvedValue(undefined);
    const onDeleteEntry = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(
      <BudgetSetupWizard
        entries={mockEntries}
        monthlyTakeHome={3000}
        onAddEntry={onAddEntry}
        onCancel={onCancel}
        onComplete={onComplete}
        onDeleteEntry={onDeleteEntry}
        onUpdateEntry={onUpdateEntry}
      />,
    );

    // Advance through Defaults to Income step
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(await screen.findByRole("button", { name: /start blank/i }));
    await screen.findByText("Salary");

    // Click the delete button for Salary
    const confirmSpy = vi.fn();
    vi.stubGlobal("confirm", confirmSpy);
    const deleteButton = screen.getByTitle("Remove Salary");
    fireEvent.click(deleteButton);

    // Asks first: nothing is deleted until confirmed
    expect(screen.getByRole("alertdialog", { name: "Delete Salary?" })).toBeDefined();
    expect(onDeleteEntry).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete entry" }));

    await waitFor(() => {
      expect(onDeleteEntry).toHaveBeenCalledWith("entry-1");
    });
    expect(onDeleteEntry).toHaveBeenCalledTimes(1);
  });

  it("cancelling the remove confirm does not delete", async () => {
    const onDeleteEntry = vi.fn().mockResolvedValue(undefined);
    render(
      <BudgetSetupWizard
        entries={mockEntries}
        monthlyTakeHome={3000}
        onAddEntry={vi.fn()}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
        onDeleteEntry={onDeleteEntry}
        onUpdateEntry={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(await screen.findByRole("button", { name: /start blank/i }));
    await screen.findByText("Salary");
    fireEvent.click(screen.getByTitle("Remove Salary"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDeleteEntry).not.toHaveBeenCalled();
  });

  it("allows adding a new item", async () => {
    const onUpdateEntry = vi.fn().mockResolvedValue(undefined);
    const onAddEntry = vi.fn().mockResolvedValue(undefined);
    const onDeleteEntry = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    render(
      <BudgetSetupWizard
        entries={mockEntries}
        monthlyTakeHome={3000}
        onAddEntry={onAddEntry}
        onCancel={onCancel}
        onComplete={onComplete}
        onDeleteEntry={onDeleteEntry}
        onUpdateEntry={onUpdateEntry}
      />,
    );

    // Advance through Defaults to Income step
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(await screen.findByRole("button", { name: /start blank/i }));
    await screen.findByText("Salary");

    // Click Add entry button
    fireEvent.click(screen.getByText("Add income entry"));

    // Fill in new item form
    const nameInput = screen.getByLabelText("Name");
    fireEvent.change(nameInput, { target: { value: "Freelance" } });

    const amountInput = screen.getByLabelText("Amount a month");
    fireEvent.change(amountInput, { target: { value: "500" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));

    await waitFor(() => {
      expect(onAddEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "income",
          name: "Freelance",
          amount: 500,
          isIncome: true,
        }),
      );
    });
  });

  it("adds common entries (names only, £0) from the defaults step", async () => {
    const onAddEntry = vi.fn().mockResolvedValue(undefined);

    render(
      <BudgetSetupWizard
        entries={[]}
        monthlyTakeHome={2500}
        onAddEntry={onAddEntry}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
        onDeleteEntry={vi.fn()}
        onUpdateEntry={vi.fn()}
      />,
    );

    // Advance to Defaults step
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    const useDefaultsBtn = await screen.findByRole("button", {
      name: /add common entries/i,
    });
    fireEvent.click(useDefaultsBtn);

    await waitFor(() => {
      expect(onAddEntry).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Rent / Mortgage", amount: 0 }),
      );
    });
  });

  const savedEntry = (name: string, category: string) => ({
    id: `s-${name}`,
    userId: "u",
    name,
    category,
    amount: 0,
    frequency: "monthly" as const,
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
    notes: null,
    createdAt: "2026-11-15",
    updatedAt: "2026-11-15",
  });

  it("never adds a common entry the budget already has (the page's button added it first)", async () => {
    const onAddEntry = vi.fn().mockResolvedValue(undefined);
    render(
      <BudgetSetupWizard
        entries={[savedEntry("Rent / Mortgage", "housing"), savedEntry("Council Tax", "bills")]}
        monthlyTakeHome={2500}
        onAddEntry={onAddEntry}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
        onDeleteEntry={vi.fn()}
        onUpdateEntry={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(await screen.findByRole("button", { name: /add common entries/i }));
    await waitFor(() => expect(onAddEntry).toHaveBeenCalledTimes(4));
    const names = onAddEntry.mock.calls.map(([e]) => e.name);
    expect(names).not.toContain("Rent / Mortgage");
    expect(names).not.toContain("Council Tax");
  });

  it("adds nothing the second time, when the first time's entries are already there", async () => {
    const onAddEntry = vi.fn().mockResolvedValue(undefined);
    const props = {
      monthlyTakeHome: 2500,
      onAddEntry,
      onCancel: vi.fn(),
      onComplete: vi.fn(),
      onDeleteEntry: vi.fn(),
      onUpdateEntry: vi.fn(),
    };
    const { rerender } = render(<BudgetSetupWizard entries={[]} {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(await screen.findByRole("button", { name: /add common entries/i }));
    await waitFor(() => expect(onAddEntry).toHaveBeenCalledTimes(6));
    const added = onAddEntry.mock.calls.map(([e]) => savedEntry(e.name, e.category));
    // Back to the defaults step with the six now saved, and click again.
    rerender(<BudgetSetupWizard entries={added} {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    fireEvent.click(await screen.findByRole("button", { name: /add common entries/i }));
    await new Promise((r) => setTimeout(r, 50));
    expect(onAddEntry).toHaveBeenCalledTimes(6);
  });

  it("counts synonyms as the same entry (old seed rows and the page's names)", async () => {
    const onAddEntry = vi.fn().mockResolvedValue(undefined);
    render(
      <BudgetSetupWizard
        entries={[
          savedEntry("Rent", "housing"),
          savedEntry("Gas", "bills"),
          savedEntry("Electricity", "bills"),
          savedEntry("Phone and broadband", "bills"),
          savedEntry("Food shop", "expenses"),
        ]}
        monthlyTakeHome={2500}
        onAddEntry={onAddEntry}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
        onDeleteEntry={vi.fn()}
        onUpdateEntry={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(await screen.findByRole("button", { name: /add common entries/i }));
    await waitFor(() => expect(onAddEntry).toHaveBeenCalledTimes(2));
    expect(onAddEntry.mock.calls.map(([e]) => e.name)).toEqual(["Council Tax", "Water"]);
  });

  it("a double click adds each common entry once", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const onAddEntry = vi.fn().mockImplementation(() => gate);
    render(
      <BudgetSetupWizard
        entries={[]}
        monthlyTakeHome={2500}
        onAddEntry={onAddEntry}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
        onDeleteEntry={vi.fn()}
        onUpdateEntry={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    const button = await screen.findByRole("button", { name: /add common entries/i });
    fireEvent.click(button);
    fireEvent.click(button);
    release();
    await waitFor(() => expect(onAddEntry).toHaveBeenCalledTimes(6));
    await new Promise((r) => setTimeout(r, 50));
    expect(onAddEntry).toHaveBeenCalledTimes(6);
  });

  describe('"add" mode (a budget that already has entries, such as the onboarding seed rows)', () => {
    /** What onboarding saved for a renter: take-home, rent and a lump of other spending. */
    const seeded = () => [
      { ...savedEntry("Monthly Take-Home Income", "income"), amount: 2500, isIncome: true },
      { ...savedEntry("Rent Payment", "housing"), amount: 900 },
      { ...savedEntry("General living and outgoings", "living"), amount: 400 },
    ];
    const renderAdd = (entries: BudgetEntry[]) => {
      const handlers = {
        onAddEntry: vi.fn().mockResolvedValue(undefined),
        onUpdateEntry: vi.fn().mockResolvedValue(undefined),
        onDeleteEntry: vi.fn().mockResolvedValue(undefined),
        onCancel: vi.fn(),
        onComplete: vi.fn(),
      };
      render(
        <BudgetSetupWizard entries={entries} mode="add" monthlyTakeHome={2500} {...handlers} />,
      );
      return handlers;
    };

    it("starts at the common items, with no welcome and no Start blank", () => {
      const { onCancel } = renderAdd(seeded());
      expect(screen.getByRole("heading", { name: "Add common budget items" })).toBeDefined();
      expect(screen.getByText(/Your saved entries stay as they are/)).toBeDefined();
      expect(screen.queryByText("Set up your budget")).toBeNull();
      expect(screen.queryByRole("button", { name: /start blank/i })).toBeNull();
      // Seven steps: the six sections and the summary, without the welcome.
      expect(screen.getByText("Step 1 of 7")).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onCancel).toHaveBeenCalled();
    });

    it("shows the seeded rent as already in the budget and adds only the other five", async () => {
      const handlers = renderAdd(seeded());
      const list = screen.getByRole("list", { name: "Common budget items" });
      expect(list.textContent).toContain("Rent or mortgage: already in your budget");
      expect(list.textContent).not.toContain("Council tax: already");
      fireEvent.click(screen.getByRole("button", { name: "Add these items" }));
      await waitFor(() => expect(handlers.onAddEntry).toHaveBeenCalledTimes(5));
      expect(handlers.onAddEntry.mock.calls.map(([e]) => e.name)).toEqual([
        "Council Tax",
        "Gas & Electricity",
        "Water",
        "Broadband",
        "Groceries",
      ]);
      // Saved entries are kept as they are: nothing is changed or deleted.
      expect(handlers.onUpdateEntry).not.toHaveBeenCalled();
      expect(handlers.onDeleteEntry).not.toHaveBeenCalled();
      // On to Income, where the seeded take-home row is shown as saved.
      expect(await screen.findByText("Monthly Take-Home Income")).toBeDefined();
    });

    it("Next goes on without adding anything or changing a saved entry", async () => {
      const handlers = renderAdd(seeded());
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      expect(await screen.findByText("Monthly Take-Home Income")).toBeDefined();
      expect(handlers.onAddEntry).not.toHaveBeenCalled();
      expect(handlers.onUpdateEntry).not.toHaveBeenCalled();
    });

    it("with every common item saved, says so and offers nothing to add", () => {
      const handlers = renderAdd([
        savedEntry("Rent", "housing"),
        savedEntry("Council tax", "bills"),
        savedEntry("Energy", "bills"),
        savedEntry("Water", "bills"),
        savedEntry("Broadband", "bills"),
        savedEntry("Food shop", "expenses"),
      ]);
      expect(screen.getByText("Your budget already has all of these.")).toBeDefined();
      expect(screen.queryByRole("button", { name: /add (these|this) item/i })).toBeNull();
      expect(handlers.onAddEntry).not.toHaveBeenCalled();
    });

    it("says this item for one missing common item", async () => {
      const handlers = renderAdd([
        savedEntry("Rent", "housing"),
        savedEntry("Council tax", "bills"),
        savedEntry("Energy", "bills"),
        savedEntry("Water", "bills"),
        savedEntry("Broadband", "bills"),
      ]);
      fireEvent.click(screen.getByRole("button", { name: "Add this item" }));
      await waitFor(() => expect(handlers.onAddEntry).toHaveBeenCalledTimes(1));
      expect(handlers.onAddEntry.mock.calls[0]?.[0].name).toBe("Groceries");
    });

    it("ends with Done on the last step", async () => {
      const handlers = renderAdd(seeded());
      for (let i = 0; i < 6; i++) {
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        await screen.findByText(`Step ${i + 2} of 7`);
      }
      expect(screen.queryByRole("button", { name: "Finish editing" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(handlers.onComplete).toHaveBeenCalledTimes(1);
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
