import type { DebtItem } from "@flump/finance-engine";
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { DebtAccountsList } from "./DebtAccountsList";

const baseProps = { onAddDebt: vi.fn(), onDeleteDebt: vi.fn(), onUpdateDebt: vi.fn() };

const debt = (over: Partial<DebtItem> & { id: string }): DebtItem => ({
  name: "Card",
  balance: 1000,
  apr: 20,
  minimumPayment: 25,
  type: "credit_card",
  ...over,
});

describe("DebtAccountsList", () => {
  it("shows Not set with an Add APR affordance where the APR is unknown, and keeps 0% as 0%", () => {
    customRender(
      <DebtAccountsList
        {...baseProps}
        debts={[
          debt({ id: "a", name: "Mystery card", apr: 0, aprKnown: false }),
          debt({ id: "b", name: "Zero card", apr: 0, aprKnown: true }),
        ]}
      />,
    );
    expect(screen.getAllByText("Not set")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Add APR for Mystery card" })).toBeDefined();
    expect(screen.getAllByText("0%")).toHaveLength(1);
  });

  it("opens the edit dialog from Add APR", () => {
    customRender(
      <DebtAccountsList {...baseProps} debts={[debt({ id: "a", apr: 0, aprKnown: false })]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add APR for Card" }));
    expect(screen.getByRole("dialog", { name: "Edit debt" })).toBeDefined();
  });

  it("flags estimated minimum payments", () => {
    customRender(
      <DebtAccountsList
        {...baseProps}
        debts={[
          debt({ id: "a", minimumPaymentEstimated: true }),
          debt({ id: "b", name: "Loan", minimumPaymentEstimated: false, type: "loan" }),
        ]}
      />,
    );
    expect(screen.getAllByText("estimated")).toHaveLength(1);
  });

  it("lets a user clear the APR via an Edit dialog, sending only the changed fields", () => {
    const onUpdateDebt = vi.fn();
    customRender(
      <DebtAccountsList
        {...baseProps}
        debts={[debt({ id: "a", apr: 21.9, aprKnown: true })]}
        onUpdateDebt={onUpdateDebt}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Card" }));
    expect(screen.queryByLabelText(/^Balance you owe/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/^APR/), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onUpdateDebt).toHaveBeenCalledWith("a", { apr: 0, aprKnown: false });
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });

  it("calls the add and delete callbacks", () => {
    const onAddDebt = vi.fn();
    const onDeleteDebt = vi.fn();
    customRender(
      <DebtAccountsList
        {...baseProps}
        debts={[debt({ id: "a" })]}
        onAddDebt={onAddDebt}
        onDeleteDebt={onDeleteDebt}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Add debt/ }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Card" }));
    expect(onAddDebt).toHaveBeenCalled();
    expect(onDeleteDebt).toHaveBeenCalledWith("a");
  });

  it("keeps rows past the eighth behind a drawer", () => {
    const many = Array.from({ length: 10 }, (_, i) => debt({ id: `d${i}`, name: `Debt ${i}` }));
    customRender(<DebtAccountsList {...baseProps} debts={many} />);
    expect(screen.getByRole("table", { name: "Liability accounts" })).toBeDefined();
    expect(
      within(screen.getByRole("table", { name: "Liability accounts" })).getAllByRole("row"),
    ).toHaveLength(9);
    expect(screen.getByText("More debts")).toBeDefined();
  });

  it("uses a level 2 heading and a plain empty state", () => {
    customRender(<DebtAccountsList {...baseProps} debts={[]} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Active liability accounts" }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /Add debt/ })).toBeDefined();
    expect(screen.getByText("No active debts recorded.")).toBeDefined();
  });
});
