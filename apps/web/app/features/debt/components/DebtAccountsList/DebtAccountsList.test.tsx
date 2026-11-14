import type { DebtItem } from "@flump/finance-engine";
import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import { DebtAccountsList } from "./DebtAccountsList";

const baseProps = { onDeleteDebt: vi.fn(), onUpdateDebt: vi.fn() };

const debt = (over: Partial<DebtItem> & { id: string }): DebtItem => ({
  name: "Card",
  balance: 1000,
  apr: 20,
  minimumPayment: 25,
  type: "credit_card",
  ...over,
});

describe("DebtAccountsList", () => {
  it("titles the list 'Your debts' and marks each row as a list row", () => {
    const { container } = customRender(
      <DebtAccountsList {...baseProps} debts={[debt({ id: "a" }), debt({ id: "b" })]} />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Your debts" })).toBeDefined();
    expect(container.querySelectorAll("[data-list-row]")).toHaveLength(2);
    expect(container.textContent).not.toMatch(/liability|creditor/i);
  });

  it("shows the balance as the row figure, with the rate and minimum in the row detail", () => {
    customRender(
      <DebtAccountsList
        {...baseProps}
        debts={[debt({ id: "a", balance: 3000, apr: 22.9, minimumPayment: 90 })]}
      />,
    );
    const row = within(screen.getByRole("listitem"));
    expect(row.getByText("£3,000")).toBeDefined();
    expect(row.getByText(/22\.9% APR/)).toBeDefined();
    expect(row.getByText(/£90 a month minimum/)).toBeDefined();
  });

  it("shows a balance stored as a negative amount (#665) as a positive amount owed", () => {
    customRender(<DebtAccountsList {...baseProps} debts={[debt({ id: "a", balance: -4500 })]} />);
    const row = within(screen.getByRole("listitem"));
    expect(row.getByText("£4,500")).toBeDefined();
    expect(row.queryByText(/[-−]£/)).toBeNull();
  });

  it("says 'Rate not added' with no extra button where the APR is unknown, and keeps 0% as 0%", () => {
    customRender(
      <DebtAccountsList
        {...baseProps}
        debts={[
          debt({ id: "a", name: "Mystery card", apr: 0, aprKnown: false }),
          debt({ id: "b", name: "Zero card", apr: 0, aprKnown: true }),
        ]}
      />,
    );
    expect(screen.queryByText("Not set")).toBeNull();
    expect(screen.getByText("Rate not added")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Add the rate/ })).toBeNull();
    expect(screen.getAllByText(/(^|\s)0% APR/)).toHaveLength(1);
  });

  it("opens the edit dialog from Edit for a debt with no rate", () => {
    customRender(
      <DebtAccountsList {...baseProps} debts={[debt({ id: "a", apr: 0, aprKnown: false })]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Card" }));
    expect(screen.getByRole("dialog", { name: "Edit debt" })).toBeDefined();
  });

  it("opens the edit dialog when the page sets editingId", () => {
    const onEditingIdChange = vi.fn();
    customRender(
      <DebtAccountsList
        {...baseProps}
        debts={[debt({ id: "a" })]}
        editingId="a"
        onEditingIdChange={onEditingIdChange}
      />,
    );
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
    expect(screen.getAllByText(/\(estimate\)/)).toHaveLength(1);
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
    fireEvent.change(screen.getByLabelText(/^Interest rate/), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onUpdateDebt).toHaveBeenCalledWith("a", { apr: 0, aprKnown: false });
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });

  it("calls the delete callback", () => {
    const onDeleteDebt = vi.fn();
    customRender(
      <DebtAccountsList {...baseProps} debts={[debt({ id: "a" })]} onDeleteDebt={onDeleteDebt} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete Card" }));
    expect(onDeleteDebt).toHaveBeenCalledWith("a");
  });

  it("keeps rows past the eighth behind a drawer", () => {
    const many = Array.from({ length: 10 }, (_, i) => debt({ id: `d${i}`, name: `Debt ${i}` }));
    customRender(<DebtAccountsList {...baseProps} debts={many} />);
    expect(
      within(screen.getByRole("list", { name: "Your debts" })).getAllByRole("listitem"),
    ).toHaveLength(8);
    expect(screen.getByText("More debts")).toBeDefined();
  });

  it("states an empty list plainly", () => {
    customRender(<DebtAccountsList {...baseProps} debts={[]} />);
    expect(screen.getByText("No debts added")).toBeDefined();
  });
});
