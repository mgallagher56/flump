import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DebtAccountsList from "./DebtAccountsList";

const baseProps = { onAddDebt: vi.fn(), onDeleteDebt: vi.fn(), onUpdateDebt: vi.fn() };

describe("DebtAccountsList", () => {
  it("shows 'APR not set' where the APR is unknown and keeps 0% as 0%", () => {
    render(
      <DebtAccountsList
        {...baseProps}
        debts={[
          {
            id: "a",
            name: "Mystery card",
            balance: 1000,
            apr: 0,
            aprKnown: false,
            minimumPayment: 25,
            type: "credit_card",
          },
          {
            id: "b",
            name: "Zero card",
            balance: 1000,
            apr: 0,
            aprKnown: true,
            minimumPayment: 25,
            type: "credit_card",
          },
        ]}
      />,
    );
    expect(screen.getAllByText("APR not set")).toHaveLength(1);
    expect(screen.getByText("0%")).toBeDefined();
    expect(screen.queryByText("19.9%")).toBeNull();
  });

  it("flags estimated minimum payments", () => {
    render(
      <DebtAccountsList
        {...baseProps}
        debts={[
          {
            id: "a",
            name: "Card",
            balance: 1000,
            apr: 20,
            minimumPayment: 25,
            minimumPaymentEstimated: true,
            type: "credit_card",
          },
          {
            id: "b",
            name: "Loan",
            balance: 1000,
            apr: 5,
            minimumPayment: 90,
            minimumPaymentEstimated: false,
            type: "loan",
          },
        ]}
      />,
    );
    expect(screen.getAllByText("estimated")).toHaveLength(1);
  });

  it("lets a user clear the APR via an Edit dialog, sending only the changed fields", () => {
    const onUpdateDebt = vi.fn();
    render(
      <DebtAccountsList
        {...baseProps}
        debts={[
          {
            id: "a",
            name: "Card",
            balance: 1000,
            apr: 21.9,
            aprKnown: true,
            minimumPayment: 25,
            type: "credit_card",
          },
        ]}
        onUpdateDebt={onUpdateDebt}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Card" }));
    expect(screen.queryByLabelText("Outstanding balance (£)")).toBeNull();
    fireEvent.change(screen.getByLabelText("APR (%)"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onUpdateDebt).toHaveBeenCalledWith("a", { apr: 0, aprKnown: false });
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });

  it("uses sentence-case copy without celebratory emoji in the empty state", () => {
    render(<DebtAccountsList {...baseProps} debts={[]} />);
    expect(screen.getByText("Active liability accounts")).toBeDefined();
    expect(screen.getByRole("button", { name: /Add debt/ })).toBeDefined();
    expect(screen.getByText("No active debts recorded.")).toBeDefined();
  });
});
