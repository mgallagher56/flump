import { fireEvent, screen } from "@testing-library/react";
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

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Add liability" }));
const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } });

describe("AddDebtDialog", () => {
  it("renders nothing while closed", () => {
    customRender(<AddDebtDialog isOpen={false} onAddDebt={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText("Add liability account")).toBeNull();
  });

  it("is a labelled modal that closes on Escape and via its close button", () => {
    const { onClose } = open();
    const dialog = screen.getByRole("dialog", { name: "Add liability account" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText(/to model payoff/)).toBeDefined();
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("starts with empty balance, APR and minimum fields", () => {
    open();
    for (const label of ["Balance you owe", "APR", "Minimum payment each month"]) {
      expect((screen.getByLabelText(new RegExp(`^${label}`)) as HTMLInputElement).value).toBe("");
    }
  });

  it("submits a full liability", () => {
    const { onAddDebt, onClose } = open();
    fill("Name of the debt", "Amex Gold");
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "loan" } });
    fill("Balance you owe", "3500");
    fill("APR", "19.9");
    fill("Minimum payment each month", "90");
    submit();
    expect(onAddDebt).toHaveBeenCalledWith({
      name: "Amex Gold",
      balance: 3500,
      apr: 19.9,
      aprKnown: true,
      minimumPayment: 90,
      minimumPaymentEstimated: false,
      type: "loan",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("needs only a name and balance; blank APR and minimum are flagged unknown", () => {
    const { onAddDebt } = open();
    fill("Name of the debt", "Klarna");
    fill("Balance you owe", "250");
    submit();
    expect(onAddDebt).toHaveBeenCalledTimes(1);
    const submitted = onAddDebt.mock.calls[0][0];
    expect(submitted).toMatchObject({
      name: "Klarna",
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
    fill("APR", "0");
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
    expect(screen.getByText("Enter the balance you owe, more than £0.")).toBeDefined();
    expect(
      (screen.getByLabelText(/^Balance you owe/) as HTMLInputElement).getAttribute("aria-invalid"),
    ).toBe("true");
  });
});

describe("AddDebtDialog in edit mode", () => {
  const debt = {
    id: "d1",
    name: "Barclaycard",
    balance: 1000,
    apr: 21.9,
    aprKnown: true,
    minimumPayment: 30,
    minimumPaymentEstimated: false,
    type: "credit_card" as const,
  };
  const renderEdit = (onEditDebt = vi.fn(), onClose = vi.fn()) => {
    customRender(
      <AddDebtDialog
        debt={debt}
        isOpen
        onAddDebt={vi.fn()}
        onClose={onClose}
        onEditDebt={onEditDebt}
      />,
    );
    return { onEditDebt, onClose };
  };

  it("offers no balance field and sends only the changed fields", () => {
    const { onEditDebt } = renderEdit();
    expect(screen.queryByLabelText(/^Balance you owe/)).toBeNull();
    fill("APR", "");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onEditDebt).toHaveBeenCalledWith("d1", { apr: 0, aprKnown: false });
  });

  it("sends nothing when nothing changed, and closes", () => {
    const { onEditDebt, onClose } = renderEdit();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onEditDebt).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
