import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { debtItemToAccountPayload } from "~/features/debt/utils/debtAccountMapping";
import customRender from "~/testUtils/customRender";
import { AddDebtDialog } from "./AddDebtDialog";

const open = () => {
  const onAddDebt = vi.fn();
  const onClose = vi.fn();
  const view = customRender(<AddDebtDialog isOpen onAddDebt={onAddDebt} onClose={onClose} />);
  return { onAddDebt, onClose, ...view };
};

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Add debt" }));
const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } });

describe("AddDebtDialog", () => {
  it("renders nothing while closed", () => {
    customRender(<AddDebtDialog isOpen={false} onAddDebt={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText("Add a debt")).toBeNull();
  });

  it("is a labelled modal that closes on Escape and via its close button", () => {
    const { onClose } = open();
    const dialog = screen.getByRole("dialog", { name: "Add a debt" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText(/Only the name and balance are needed/)).toBeDefined();
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("starts with empty balance, APR and minimum fields", () => {
    open();
    for (const label of ["Balance you owe", "Interest rate", "Minimum payment each month"]) {
      expect((screen.getByLabelText(new RegExp(`^${label}`)) as HTMLInputElement).value).toBe("");
    }
  });

  it("uses the shared Select for the type, a provider-free example and no Delete action", () => {
    open();
    const type = screen.getByLabelText("Type") as HTMLSelectElement;
    expect(type.tagName).toBe("SELECT");
    expect(type.value).toBe("credit_card");
    expect(
      (screen.getByLabelText(/^Name of the debt/) as HTMLInputElement).getAttribute("placeholder"),
    ).toBe("For example, car loan");
    expect(screen.queryByRole("button", { name: "Delete debt" })).toBeNull();
    for (const label of ["Balance you owe", "Minimum payment each month"]) {
      expect(
        (screen.getByLabelText(new RegExp(`^${label}`)) as HTMLInputElement).getAttribute("type"),
      ).not.toBe("number");
    }
  });

  it("submits a full liability", () => {
    const { onAddDebt, onClose } = open();
    fill("Name of the debt", "Holiday card");
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "loan" } });
    fill("Balance you owe", "3500");
    fill("Interest rate", "19.9");
    fill("Minimum payment each month", "90");
    submit();
    expect(onAddDebt).toHaveBeenCalledWith({
      name: "Holiday card",
      balance: 3500,
      apr: 19.9,
      aprKnown: true,
      minimumPayment: 90,
      minimumPaymentEstimated: false,
      type: "loan",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("adds a joint debt with the user's share (SD-8)", () => {
    const { onAddDebt } = open();
    fill("Name of the debt", "Joint loan");
    fill("Balance you owe", "6000");
    fireEvent.change(screen.getByLabelText("Ownership"), { target: { value: "joint" } });
    fireEvent.change(screen.getByLabelText("Your share"), { target: { value: "50" } });
    expect(screen.getByText("This is the whole balance. Your share is 50% of it.")).toBeDefined();
    submit();
    expect(onAddDebt).toHaveBeenCalledWith(
      expect.objectContaining({ balance: 6000, ownership: "joint", sharePercent: 50 }),
    );
  });

  it("needs only a name and balance; blank APR and minimum are flagged unknown", () => {
    const { onAddDebt } = open();
    fill("Name of the debt", "Sofa payments");
    fill("Balance you owe", "250");
    submit();
    expect(onAddDebt).toHaveBeenCalledTimes(1);
    const submitted = onAddDebt.mock.calls[0][0];
    expect(submitted).toMatchObject({
      name: "Sofa payments",
      balance: 250,
      aprKnown: false,
      minimumPaymentEstimated: true,
    });
    expect(debtItemToAccountPayload(submitted)).toMatchObject({
      balance: -250,
      interestRate: null,
      monthlyContribution: null,
    });
  });

  it("treats an explicit 0 APR as a real rate", () => {
    const { onAddDebt } = open();
    fill("Name of the debt", "0% card");
    fill("Balance you owe", "900");
    fill("Interest rate", "0");
    submit();
    const submitted = onAddDebt.mock.calls[0][0];
    expect(submitted.aprKnown).toBe(true);
    expect(debtItemToAccountPayload(submitted).interestRate).toBe(0);
  });

  it("shows inline errors and does not submit without a name or balance", () => {
    const { onAddDebt } = open();
    submit();
    expect(onAddDebt).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a name for this debt.")).toBeDefined();
    expect(screen.getByText("Enter the balance you owe, £0 or more.")).toBeDefined();
    expect(
      (screen.getByLabelText(/^Balance you owe/) as HTMLInputElement).getAttribute("aria-invalid"),
    ).toBe("true");
  });

  it("puts the credit limit and 0% notes behind info icons the fields name in aria-describedby", () => {
    open();
    expect(screen.queryByText(/^Your card or overdraft limit/, { selector: "p" })).toBeNull();
    expect(screen.queryByText(/^When any 0% promotional/, { selector: "p" })).toBeNull();
    expect(screen.getByRole("button", { name: "About Credit limit" })).toBeDefined();
    expect(screen.getByRole("button", { name: "About 0% interest period" })).toBeDefined();

    const limit = screen.getByLabelText(/^Credit limit/);
    const limitNote = document.getElementById("add-debt-credit-limit-info");
    expect(limitNote?.textContent).toBe("Your card or overdraft limit, even if the balance is £0.");
    expect(limit.getAttribute("aria-describedby")?.split(" ")).toContain(
      "add-debt-credit-limit-info",
    );

    const promo = screen.getByRole("button", { name: /^0% interest period ends/ });
    expect(document.getElementById("add-debt-promo-end-info")?.textContent).toBe(
      "When any 0% promotional interest period ends.",
    );
    expect(promo.getAttribute("aria-describedby")?.split(" ")).toContain("add-debt-promo-end-info");
  });

  it("allows £0 balance on a credit card with credit limit and 0% promo end date", () => {
    const { onAddDebt } = open();
    fill("Name of the debt", "0% Balance Transfer");
    fill("Balance you owe", "0");
    fill("Credit limit", "5000");
    // The shared, themed date picker (owner item 20): open it and pick 30 June 2027.
    fireEvent.click(screen.getByRole("button", { name: /^0% interest period ends/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Choose year/ }));
    fireEvent.click(screen.getByRole("button", { name: "2027" }));
    fireEvent.click(screen.getByRole("button", { name: /^Choose month/ }));
    fireEvent.click(screen.getByRole("button", { name: "Jun" }));
    fireEvent.click(screen.getByRole("button", { name: "30 Jun 2027" }));
    submit();
    expect(onAddDebt).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "0% Balance Transfer",
        balance: 0,
        type: "credit_card",
        creditLimitGbp: 5000,
        promoAprExpiryDate: "2027-06-30",
      }),
    );
  });
});

describe("AddDebtDialog in edit mode", () => {
  const debt = {
    id: "d1",
    name: "Everyday card",
    balance: 1000,
    apr: 21.9,
    aprKnown: true,
    minimumPayment: 30,
    minimumPaymentEstimated: false,
    type: "credit_card" as const,
  };
  const renderEdit = (onEditDebt = vi.fn(), onClose = vi.fn(), onDeleteDebt = vi.fn()) => {
    customRender(
      <AddDebtDialog
        debt={debt}
        isOpen
        onAddDebt={vi.fn()}
        onClose={onClose}
        onDeleteDebt={onDeleteDebt}
        onEditDebt={onEditDebt}
      />,
    );
    return { onEditDebt, onClose, onDeleteDebt };
  };

  it("offers Delete debt, which closes the dialog and hands the id to the page", () => {
    const { onClose, onDeleteDebt, onEditDebt } = renderEdit();
    fireEvent.click(screen.getByRole("button", { name: "Delete debt" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDeleteDebt).toHaveBeenCalledWith("d1");
    expect(onEditDebt).not.toHaveBeenCalled();
  });

  it("styles Delete debt as a subtle danger button", () => {
    renderEdit();
    expect(screen.getByRole("button", { name: "Delete debt" }).getAttribute("data-variant")).toBe(
      "dangerSubtle",
    );
  });

  it("keeps each footer button on one line", () => {
    renderEdit();
    for (const name of ["Delete debt", "Cancel", "Save changes"]) {
      expect(screen.getByRole("button", { name }).className).toMatch(
        /white-space_nowrap|ws_nowrap/,
      );
    }
  });

  it("shows the saved balance and sends only the changed fields", () => {
    const { onEditDebt } = renderEdit();
    expect((screen.getByLabelText(/^Balance you owe/) as HTMLInputElement).value).toBe("1,000");
    fill("Interest rate", "");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onEditDebt).toHaveBeenCalledWith("d1", { apr: 0, aprKnown: false });
  });

  it("edits the balance after the debt is added (SD-8), sending it only when changed", () => {
    const { onEditDebt } = renderEdit();
    fireEvent.change(screen.getByLabelText(/^Balance you owe/), { target: { value: "850" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onEditDebt).toHaveBeenCalledWith("d1", { balance: 850 });
  });

  it("edits a joint debt's whole balance, says so, and can make a debt joint", () => {
    const onEditDebt = vi.fn();
    customRender(
      <AddDebtDialog
        debt={{ ...debt, balance: 400, wholeBalance: 1000, ownership: "joint", sharePercent: 40 }}
        isOpen
        onAddDebt={vi.fn()}
        onClose={vi.fn()}
        onEditDebt={onEditDebt}
      />,
    );
    // The row holds the user's 40% (400); the field holds the whole 1,000.
    expect((screen.getByLabelText(/^Balance you owe/) as HTMLInputElement).value).toBe("1,000");
    expect(screen.getByText("This is the whole balance. Your share is 40% of it.")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Your share"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onEditDebt).toHaveBeenCalledWith("d1", { ownership: "joint", sharePercent: 60 });
  });

  it("waits for a save that returns a promise: closes when it lands, stays open with the message when it is refused", async () => {
    const CONFLICT =
      "We did not save this because it was changed somewhere else. The latest version is now loaded. Check it and save again.";
    let settle: (error: string | null) => void = () => undefined;
    const onEditDebt = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          settle = resolve;
        }),
    );
    const { onClose } = renderEdit(onEditDebt);
    fill("Name of the debt", "Renamed card");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onEditDebt).toHaveBeenCalledWith("d1", { name: "Renamed card" });
    expect(onClose).not.toHaveBeenCalled();

    // Refused (the debt changed somewhere else): the message shows and the typed name stays.
    await act(async () => settle(CONFLICT));
    expect(screen.getByRole("alert").textContent).toContain(CONFLICT);
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/^Name of the debt/) as HTMLInputElement).value).toBe(
      "Renamed card",
    );

    // Saving again goes through and only then closes the dialog.
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onEditDebt).toHaveBeenCalledTimes(2);
    await act(async () => settle(null));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when nothing changed, and closes", () => {
    const { onEditDebt, onClose } = renderEdit();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onEditDebt).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  describe("a joint loan (SD-7)", () => {
    // £300 a month stored, joint at 50%: the page shows the share, 300 x 0.5 = £150.
    const jointLoan = {
      id: "loan-1",
      name: "Car loan",
      type: "loan" as const,
      balance: 3000,
      apr: 6,
      aprKnown: true,
      minimumPayment: 150,
      minimumPaymentEstimated: false,
      wholeMinimumPayment: 300,
      ownership: "joint",
      sharePercent: 50,
    };

    it("starts from the whole stored payment and says it is the whole", () => {
      customRender(<AddDebtDialog debt={jointLoan} isOpen onAddDebt={vi.fn()} onClose={vi.fn()} />);
      const minimum = screen.getByLabelText(/^Minimum payment each month/) as HTMLInputElement;
      expect(minimum.value.replace(/[^0-9.]/g, "")).toBe("300");
      expect(
        screen.getByText("This is the whole monthly payment. Your share is 50% of it."),
      ).toBeDefined();
    });

    it("saves a typed £320 as the whole payment, 320", () => {
      const onEditDebt = vi.fn(() => null);
      customRender(
        <AddDebtDialog
          debt={jointLoan}
          isOpen
          onAddDebt={vi.fn()}
          onClose={vi.fn()}
          onEditDebt={onEditDebt}
        />,
      );
      fill("Minimum payment each month", "320");
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      expect(onEditDebt).toHaveBeenCalledWith("loan-1", {
        minimumPayment: 320,
        minimumPaymentEstimated: false,
      });
    });

    it("an APR-only edit sends no payment", () => {
      const onEditDebt = vi.fn(() => null);
      customRender(
        <AddDebtDialog
          debt={jointLoan}
          isOpen
          onAddDebt={vi.fn()}
          onClose={vi.fn()}
          onEditDebt={onEditDebt}
        />,
      );
      fill("Interest rate", "7");
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
      expect(onEditDebt).toHaveBeenCalledWith("loan-1", { apr: 7, aprKnown: true });
    });
  });
});
