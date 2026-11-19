import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSubmit = vi.hoisted(() => vi.fn());
/** What the route action answered; set it and render again to deliver the answer. */
const answer = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock("react-router", () => ({
  useFetcher: () => ({ submit: mockSubmit, state: "idle", data: answer.data }),
}));

import { AddSavingsAccountDialog, ISA_BECOMES_SOLE_NOTICE } from "./AddSavingsAccountDialog";

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
    expect(screen.getByLabelText(/Kind of account/)).toBeDefined();
    expect(screen.queryByLabelText("Account type")).toBeNull();
    expect(screen.getByLabelText("Current balance")).toBeDefined();
    expect(screen.getByLabelText("Interest rate (AER)")).toBeDefined();
    expect(screen.getByLabelText("Saved each month")).toBeDefined();
  });

  it("explains Saved each month in an info icon the field names, with no inline hint", () => {
    render(<AddSavingsAccountDialog isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "About Saved each month" })).toBeDefined();
    expect(screen.getByLabelText("Saved each month").getAttribute("aria-describedby")).toBe(
      "savings-account-monthly-info",
    );
    expect(
      screen.queryByText("What you put into this account each month.", { selector: "p" }),
    ).toBeNull();
    // A plain savings rate has no InfoTip and no hint.
    expect(screen.queryByRole("button", { name: /^About Estimated annual return/ })).toBeNull();
    expect(
      screen.getByLabelText("Interest rate (AER)").getAttribute("aria-describedby"),
    ).toBeNull();
  });

  it("styles Delete account as a subtle danger button", () => {
    render(
      <AddSavingsAccountDialog
        accountToEdit={{ id: "a1", name: "Easy access", type: "Savings", balance: "100" } as never}
        isOpen={true}
        onClose={vi.fn()}
        onDeleteRequest={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Delete account" }).getAttribute("data-variant"),
    ).toBe("dangerSubtle");
  });

  it("keeps Add account enabled and names what is missing on press (RC-12, P28)", () => {
    render(<AddSavingsAccountDialog isOpen={true} onClose={vi.fn()} />);
    const add = screen.getByRole("button", { name: "Add account" }) as HTMLButtonElement;
    expect(add.disabled).toBe(false);
    fireEvent.click(add);
    expect(screen.getByText("Enter a name for the account.")).toBeDefined();
    expect(screen.getByText("Choose the kind of account.")).toBeDefined();
    expect(mockSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: "Marcus" } });
    fireEvent.change(screen.getByLabelText(/Kind of account/), {
      target: { value: "Saving:easy_access" },
    });
    fireEvent.click(add);
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it("puts Add account full width above Cancel on a phone (RC-12)", () => {
    render(<AddSavingsAccountDialog isOpen={true} onClose={vi.fn()} />);
    const add = screen.getByRole("button", { name: "Add account" });
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(add.parentElement).toBe(cancel.parentElement);
    expect(add.parentElement?.className).toContain("flex-d_column-reverse");
    // Cancel first in the DOM, so column-reverse puts the primary on top.
    expect(cancel.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses a placeholder short enough for a 320px field (P44)", () => {
    render(<AddSavingsAccountDialog isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText(/Account name/).getAttribute("placeholder")).toBe(
      "For example, Cash ISA",
    );
  });

  it("names each kind once, grouped as savings, ISAs and investments", () => {
    render(<AddSavingsAccountDialog isOpen={true} onClose={vi.fn()} />);
    const select = screen.getByLabelText(/Kind of account/) as HTMLSelectElement;
    const groups = [...select.querySelectorAll("optgroup")].map((g) => ({
      label: g.label,
      kinds: [...g.querySelectorAll("option")].map((o) => o.text),
    }));
    expect(groups).toEqual([
      {
        label: "Savings",
        kinds: [
          "Easy access savings",
          "Notice savings",
          "Regular saver",
          "Fixed term savings",
          "General savings",
          "Other savings account",
        ],
      },
      { label: "ISAs", kinds: ["Cash ISA", "Lifetime ISA (LISA)", "Stocks and Shares ISA"] },
      { label: "Investments", kinds: ["General investment account", "Other investment"] },
    ]);
  });

  it("stores a Stocks and Shares ISA as an Investment and labels its rate as an estimate", () => {
    render(<AddSavingsAccountDialog isOpen={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: "Vanguard" } });
    fireEvent.change(screen.getByLabelText(/Kind of account/), {
      target: { value: "Investment:stocks_and_shares_isa" },
    });
    const rate = screen.getByLabelText("Estimated annual return (%)");
    // The risk line stays visible; the explanation sits behind the "i" (owner item 23).
    expect(screen.getByText("Investment returns can go down as well as up.")).toBeDefined();
    expect(screen.getByRole("button", { name: "About Estimated annual return" })).toBeDefined();
    expect(rate.getAttribute("aria-describedby")?.split(" ")).toContain(
      "savings-account-return-info",
    );
    expect(document.getElementById("savings-account-return-info")?.textContent).toBe(
      "An estimate used for projections.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    expect(mockSubmit.mock.calls[0]?.[0]).toMatchObject({
      type: "Investment",
      accountSubtype: "stocks_and_shares_isa",
    });
  });

  it("submits the create intent, leaving an empty rate and monthly amount unset, and closes once it is saved", () => {
    const onClose = vi.fn();
    const dialog = () => <AddSavingsAccountDialog isOpen={true} onClose={onClose} />;
    const { rerender } = render(dialog());
    fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: " Marcus " } });
    fireEvent.change(screen.getByLabelText(/Kind of account/), { target: { value: "Saving:" } });
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

  it("never guesses a kind for a new account", () => {
    render(<AddSavingsAccountDialog isOpen={true} onClose={vi.fn()} />);
    expect((screen.getByLabelText(/Kind of account/) as HTMLSelectElement).value).toBe("");
  });

  it("keeps an edited account without a subtype as its type's Other kind, even when its name says ISA", () => {
    render(
      <AddSavingsAccountDialog
        accountToEdit={{ id: "a1", name: "Cash ISA", type: "Saving", balance: 100 } as never}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    expect((screen.getByLabelText(/Kind of account/) as HTMLSelectElement).value).toBe("Saving:");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    // Unchanged, so the stored type and subtype are left as saved: neither is sent.
    const sent = mockSubmit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sent).not.toHaveProperty("type");
    expect(sent).not.toHaveProperty("accountSubtype");
  });

  it.each([
    ["Saving", "easy_access"],
    ["Saving", "cash_isa"],
    ["Saving", null],
    ["Investment", "stocks_and_shares_isa"],
    ["Investment", null],
    // A subtype that does not belong to its type shows as the type's Other kind.
    ["Saving", "general_investment"],
    ["Investment", "cash_isa"],
    // A subtype the select has no kind for.
    ["Saving", "junior_isa"],
  ])(
    "never changes a saved %s / %s account's type or subtype unless the kind is changed",
    (type, subtype) => {
      render(
        <AddSavingsAccountDialog
          accountToEdit={
            { id: "k1", name: "Pot", type, accountSubtype: subtype, balance: 10 } as never
          }
          isOpen={true}
          onClose={vi.fn()}
        />,
      );
      fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: "Renamed" } });
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      const sent = mockSubmit.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(sent).not.toHaveProperty("type");
      expect(sent).not.toHaveProperty("accountSubtype");
      expect(sent.name).toBe("Renamed");
    },
  );

  it("sends the new type and subtype when the kind is changed", () => {
    render(
      <AddSavingsAccountDialog
        accountToEdit={
          {
            id: "k2",
            name: "Pot",
            type: "Saving",
            accountSubtype: "general_investment",
            balance: 10,
          } as never
        }
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Kind of account/), {
      target: { value: "Investment:general_investment" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mockSubmit.mock.calls[0]?.[0]).toMatchObject({
      type: "Investment",
      accountSubtype: "general_investment",
    });
  });

  const JOINT_SAVER = {
    id: "j1",
    name: "Joint saver",
    type: "Saving",
    accountSubtype: "easy_access",
    balance: 4000,
    ownership: "joint",
    sharePercent: 50,
  };

  it("leaves a joint account's ownership alone when it stays a non-ISA kind", () => {
    render(
      <AddSavingsAccountDialog
        accountToEdit={JOINT_SAVER as never}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText(ISA_BECOMES_SOLE_NOTICE)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mockSubmit.mock.calls[0]?.[0]).not.toHaveProperty("ownership");
  });

  it("says a joint account saved as an ISA becomes yours only, and sends sole", () => {
    render(
      <AddSavingsAccountDialog
        accountToEdit={JOINT_SAVER as never}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Kind of account/), {
      target: { value: "Saving:cash_isa" },
    });
    expect(screen.getAllByText(ISA_BECOMES_SOLE_NOTICE)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mockSubmit.mock.calls[0]?.[0]).toMatchObject({
      type: "Saving",
      accountSubtype: "cash_isa",
      ownership: "sole",
    });
  });

  it("shows no sole notice for a sole account saved as an ISA", () => {
    render(
      <AddSavingsAccountDialog
        accountToEdit={
          {
            id: "s1",
            name: "Saver",
            type: "Saving",
            accountSubtype: "easy_access",
            balance: 1,
            ownership: "sole",
          } as never
        }
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Kind of account/), {
      target: { value: "Saving:cash_isa" },
    });
    expect(screen.queryByText(ISA_BECOMES_SOLE_NOTICE)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mockSubmit.mock.calls[0]?.[0]).not.toHaveProperty("ownership");
  });

  it("starts an edited Cash ISA from its saved kind", () => {
    render(
      <AddSavingsAccountDialog
        accountToEdit={
          { id: "a2", name: "ISA", type: "Saving", accountSubtype: "cash_isa", balance: 1 } as never
        }
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    expect((screen.getByLabelText(/Kind of account/) as HTMLSelectElement).value).toBe(
      "Saving:cash_isa",
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
      expect.objectContaining({ intent: "updateSavingsAccount", accountId: "acc-1" }),
      { method: "POST", action: "/app/savings" },
    );
    // Nothing money-shaped changed, so nothing money-shaped is sent (SD-1, CH-3).
    const sent = mockSubmit.mock.calls[0]?.[0];
    expect(sent).not.toHaveProperty("balance");
    expect(sent).not.toHaveProperty("interestRate");
    expect(sent).not.toHaveProperty("monthlyContribution");
  });

  describe("a joint account (SD-1, JO-1)", () => {
    // Homeowner's "Easy access savings": £7,600 stored, joint at 40%, so the share is £3,040.
    const JOINT_40 = {
      id: "ea1",
      name: "Easy access savings",
      type: "Saving",
      accountSubtype: "easy_access",
      balance: 7600,
      interestRate: 4,
      ownership: "joint",
      sharePercent: 40,
    };

    it("shows the whole stored balance and says it is the whole", () => {
      render(
        <AddSavingsAccountDialog
          accountToEdit={JOINT_40 as never}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );
      const balance = screen.getByLabelText("Current balance") as HTMLInputElement;
      expect(balance.value.replace(/[^0-9.]/g, "")).toBe("7600");
      expect(screen.getByText("This is the whole balance. Your share is 40% of it.")).toBeDefined();
    });

    it("a rate-only save sends the new rate and no balance", () => {
      render(
        <AddSavingsAccountDialog
          accountToEdit={JOINT_40 as never}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );
      fireEvent.change(screen.getByLabelText("Interest rate (AER)"), { target: { value: "4.1" } });
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      const sent = mockSubmit.mock.calls[0]?.[0];
      expect(sent).toMatchObject({ interestRate: "4.1" });
      expect(sent).not.toHaveProperty("balance");
    });

    it("a changed balance is sent as typed, the whole", () => {
      render(
        <AddSavingsAccountDialog
          accountToEdit={JOINT_40 as never}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );
      fireEvent.change(screen.getByLabelText("Current balance"), { target: { value: "8000" } });
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      expect(mockSubmit.mock.calls[0]?.[0]).toMatchObject({ balance: "8000" });
    });
  });
});
