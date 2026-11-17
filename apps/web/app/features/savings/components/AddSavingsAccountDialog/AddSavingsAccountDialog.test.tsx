import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSubmit = vi.hoisted(() => vi.fn());
/** What the route action answered; set it and render again to deliver the answer. */
const answer = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock("react-router", () => ({
  useFetcher: () => ({ submit: mockSubmit, state: "idle", data: answer.data }),
}));

import { AddSavingsAccountDialog } from "./AddSavingsAccountDialog";

const CONFLICT =
  "We did not save this because it was changed somewhere else. The latest version is now loaded. Check it and save again.";

describe("AddSavingsAccountDialog", () => {
  beforeEach(() => {
    mockSubmit.mockClear();
    answer.data = undefined;
  });

  it("renders the form fields when open", () => {
    render(<AddSavingsAccountDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Add a savings account")).toBeDefined();
    expect(screen.getByLabelText(/Account name/)).toBeDefined();
    expect(screen.getByLabelText("Account type")).toBeDefined();
    expect(screen.getByLabelText("Current balance")).toBeDefined();
    expect(screen.getByLabelText("Interest rate (AER)")).toBeDefined();
    expect(screen.getByLabelText("Saved each month")).toBeDefined();
  });

  it("keeps Add account disabled until the account has a name", () => {
    render(<AddSavingsAccountDialog isOpen={true} onClose={vi.fn()} />);
    const add = screen.getByRole("button", { name: "Add account" }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: "Marcus" } });
    expect(add.disabled).toBe(false);
  });

  it("submits the create intent, leaving an empty rate and monthly amount unset, and closes once it is saved", () => {
    const onClose = vi.fn();
    const dialog = () => <AddSavingsAccountDialog isOpen={true} onClose={onClose} />;
    const { rerender } = render(dialog());
    fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: " Marcus " } });
    fireEvent.change(screen.getByLabelText("Current balance"), { target: { value: "1200" } });
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    expect(mockSubmit).toHaveBeenCalledWith(
      {
        intent: "createSavingsAccount",
        accountId: "",
        name: "Marcus",
        type: "Saving",
        accountSubtype: "",
        balance: "1200",
        interestRate: "",
        monthlyContribution: "",
      },
      { method: "POST", action: "/app/savings" },
    );
    // Open until the action answers, so a refused save keeps what was typed.
    expect(onClose).not.toHaveBeenCalled();
    answer.data = { success: true };
    rerender(dialog());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("offers non-ISA kinds of savings, never guesses one, and labels an Investment rate as an estimate", () => {
    render(<AddSavingsAccountDialog isOpen={true} onClose={vi.fn()} />);
    const subtype = screen.getByLabelText("Kind of account (optional)") as HTMLSelectElement;
    expect(subtype.value).toBe("");
    const labels = [...subtype.options].map((o) => o.text);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Easy access savings",
        "Notice savings",
        "Regular saver",
        "Fixed term savings",
        "General savings",
        "Cash ISA",
      ]),
    );
    expect(labels).not.toContain("Stocks and Shares ISA");

    expect(screen.getByLabelText("Interest rate (AER)")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "Investment" } });
    expect(screen.getByLabelText("Estimated annual return (%)")).toBeDefined();
    const investmentLabels = [
      ...(screen.getByLabelText("Kind of account (optional)") as HTMLSelectElement).options,
    ].map((o) => o.text);
    expect(investmentLabels).toContain("Stocks and Shares ISA");
  });

  it("keeps an edited account without a subtype unset, even when its name says ISA", () => {
    render(
      <AddSavingsAccountDialog
        accountToEdit={{ id: "a1", name: "Cash ISA", type: "Saving", balance: 100 } as never}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    expect((screen.getByLabelText("Kind of account (optional)") as HTMLSelectElement).value).toBe(
      "",
    );
  });

  it("sends the saved account's version, and after a 412 stays open with the message and what was typed", () => {
    const onClose = vi.fn();
    const account = {
      id: "acc-1",
      name: "Vanguard ISA",
      type: "Investment",
      balance: 15000,
      updatedAt: "2026-11-14T09:30:00.123Z",
    };
    const dialog = (accountToEdit: typeof account) => (
      <AddSavingsAccountDialog
        accountToEdit={accountToEdit as never}
        isOpen={true}
        onClose={onClose}
      />
    );
    const { rerender } = render(dialog(account));
    fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: "Renamed ISA" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mockSubmit.mock.calls[0]?.[0]).toMatchObject({
      intent: "updateSavingsAccount",
      accountId: "acc-1",
      name: "Renamed ISA",
      version: "2026-11-14T09:30:00.123Z",
    });

    // The account changed somewhere else: the action answers 412 and the loader runs again.
    answer.data = { success: false, conflict: true, error: CONFLICT };
    const latest = { ...account, balance: 15200, updatedAt: "2026-11-15T10:00:00.000Z" };
    rerender(dialog(latest));
    expect(screen.getByRole("alert").textContent).toContain(CONFLICT);
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/Account name/) as HTMLInputElement).value).toBe("Renamed ISA");

    // Saving again sends the latest version.
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mockSubmit.mock.calls[1]?.[0]).toMatchObject({
      name: "Renamed ISA",
      version: "2026-11-15T10:00:00.000Z",
    });
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
