import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSubmit = vi.hoisted(() => vi.fn());

vi.mock("react-router", () => ({
  useFetcher: () => ({ submit: mockSubmit, state: "idle" }),
}));

import { AddSavingsAccountDialog } from "./AddSavingsAccountDialog";

describe("AddSavingsAccountDialog", () => {
  beforeEach(() => mockSubmit.mockClear());

  it("renders the form fields when open", () => {
    render(<AddSavingsAccountDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Add a savings account")).toBeDefined();
    expect(screen.getByLabelText(/Account name/)).toBeDefined();
    expect(screen.getByLabelText("Account type")).toBeDefined();
    expect(screen.getByLabelText("Current balance")).toBeDefined();
    expect(screen.getByLabelText("Interest rate (AER, %)")).toBeDefined();
    expect(screen.getByLabelText("Saved each month")).toBeDefined();
  });

  it("keeps Add account disabled until the account has a name", () => {
    render(<AddSavingsAccountDialog isOpen={true} onClose={vi.fn()} />);
    const add = screen.getByRole("button", { name: "Add account" }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: "Marcus" } });
    expect(add.disabled).toBe(false);
  });

  it("submits the create intent with the unchanged payload and closes", () => {
    const onClose = vi.fn();
    render(<AddSavingsAccountDialog isOpen={true} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: " Marcus " } });
    fireEvent.change(screen.getByLabelText("Current balance"), { target: { value: "1200" } });
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    expect(mockSubmit).toHaveBeenCalledWith(
      {
        intent: "createSavingsAccount",
        accountId: "",
        name: "Marcus",
        type: "Saving",
        balance: "1200",
        interestRate: "4.5",
        monthlyContribution: "100",
      },
      { method: "POST", action: "/app/savings" },
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("starts from the account being edited and submits the update intent", () => {
    render(
      <AddSavingsAccountDialog
        accountToEdit={
          {
            id: "acc-1",
            name: "Vanguard ISA",
            type: "Investment",
            balance: 15000,
            interestRate: 7,
            monthlyContribution: 300,
          } as never
        }
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Edit savings account")).toBeDefined();
    expect((screen.getByLabelText(/Account name/) as HTMLInputElement).value).toBe("Vanguard ISA");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "updateSavingsAccount",
        accountId: "acc-1",
        type: "Investment",
        balance: "15000",
        interestRate: "7",
        monthlyContribution: "300",
      }),
      { method: "POST", action: "/app/savings" },
    );
  });
});
