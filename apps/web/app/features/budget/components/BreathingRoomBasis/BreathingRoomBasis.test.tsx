import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BudgetEntry } from "~/types/budget";
import { BreathingRoomBasis } from "./BreathingRoomBasis";

const entry = (overrides: Partial<BudgetEntry>): BudgetEntry => ({
  id: "e1",
  userId: "u1",
  category: "bills",
  name: "Energy",
  amount: 100,
  frequency: "monthly",
  isEssential: true,
  isIncome: false,
  isPrimaryIncome: false,
  isDefault: false,
  notes: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...overrides,
});

const accounts = [
  { id: "cur", name: "Current account", type: "Current" as const, balance: 1200 },
  { id: "sav", name: "Easy saver", type: "Saving" as const, balance: 3000 },
  { id: "isa", name: "Stocks ISA", type: "Investment" as const, balance: 9000 },
];

const open = () =>
  fireEvent.click(screen.getByRole("button", { name: /What Breathing room counts/ }));

describe("BreathingRoomBasis", () => {
  it("is collapsed by default and says what it holds without a figure in its trigger", () => {
    render(
      <BreathingRoomBasis
        accountDetails={[]}
        accounts={accounts}
        entries={[entry({})]}
        onSetEssential={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button", { name: /What Breathing room counts/ });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.textContent).not.toContain("£");
  });

  it("separates accounts and spending into two headed cards, with a sentence on what it is", () => {
    render(
      <BreathingRoomBasis
        accountDetails={[]}
        accounts={accounts}
        entries={[entry({})]}
        onSetEssential={vi.fn()}
      />,
    );
    open();
    expect(screen.getByText(/money in these accounts over the spending switched on/)).toBeDefined();
    const accountsCard = screen.getByRole("region", { name: "Accounts it draws on" });
    expect(within(accountsCard).getByText("Current account")).toBeDefined();
    expect(within(accountsCard).getByText("Easy saver")).toBeDefined();
    // The engine counts current and savings accounts only.
    expect(within(accountsCard).queryByText("Stocks ISA")).toBeNull();
    expect(within(accountsCard).getByText("View or update your savings accounts")).toBeDefined();
    expect(screen.getByRole("region", { name: "Spending it covers" })).toBeDefined();
  });

  it("reads each switch from the entry's Essential flag and writes the flag back", async () => {
    const onSetEssential = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <BreathingRoomBasis
        accountDetails={[]}
        accounts={accounts}
        entries={[entry({ id: "gym", name: "Gym", category: "expenses", isEssential: false })]}
        onSetEssential={onSetEssential}
      />,
    );
    open();
    const toggle = screen.getByRole("switch", { name: /Gym/ }) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);
    await waitFor(() => expect(onSetEssential).toHaveBeenCalledWith("gym", true));
    // The editor's switch changing the same flag shows here too: one stored value.
    rerender(
      <BreathingRoomBasis
        accountDetails={[]}
        accounts={accounts}
        entries={[entry({ id: "gym", name: "Gym", category: "expenses", isEssential: true })]}
        onSetEssential={onSetEssential}
      />,
    );
    expect((screen.getByRole("switch", { name: /Gym/ }) as HTMLInputElement).checked).toBe(true);
  });

  it("lists savings rows too, and holds debt and linked housing rows on", () => {
    render(
      <BreathingRoomBasis
        accountDetails={[]}
        accounts={accounts}
        entries={[
          entry({ id: "s", name: "Holiday fund", category: "savings", isEssential: false }),
          entry({ id: "d", name: "Card payment", category: "debt", isEssential: false }),
          entry({ id: "linked:housing", name: "Rent", category: "housing", linked: "housing" }),
        ]}
        onSetEssential={vi.fn()}
      />,
    );
    open();
    expect((screen.getByRole("switch", { name: /Holiday fund/ }) as HTMLInputElement).checked).toBe(
      false,
    );
    const debt = screen.getByRole("switch", { name: /Card payment/ }) as HTMLInputElement;
    expect(debt.checked).toBe(true);
    expect(debt.disabled).toBe(true);
    const rent = screen.getByRole("switch", { name: /Rent/ }) as HTMLInputElement;
    expect(rent.disabled).toBe(true);
  });

  it("shows a joint account at the person's share once, from the saved whole balance (JO-2)", () => {
    // Saved whole balance £7,600 at a 40% share: 7,600 × 0.40 = £3,040. Rows already at the share
    // would show 3,040 × 0.40 = £1,216.
    render(
      <BreathingRoomBasis
        accountDetails={[]}
        accounts={[
          {
            id: "joint",
            name: "Joint saver",
            type: "Saving" as const,
            balance: 7600,
            ownership: "joint",
            sharePercent: 40,
          },
        ]}
        entries={[entry({})]}
        onSetEssential={vi.fn()}
      />,
    );
    open();
    const accountsCard = screen.getByRole("region", { name: "Accounts it draws on" });
    expect(accountsCard.textContent).toContain("£3,040");
    expect(accountsCard.textContent).not.toContain("£1,216");
  });
});
