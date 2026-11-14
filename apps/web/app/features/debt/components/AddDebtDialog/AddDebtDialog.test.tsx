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
    ).toBe("For example, credit card or car loan");
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
    expect(screen.getByText("Enter the balance you owe, more than £0.")).toBeDefined();
    expect(
      (screen.getByLabelText(/^Balance you owe/) as HTMLInputElement).getAttribute("aria-invalid"),
    ).toBe("true");
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

  it("keeps each footer button on one line", () => {
    renderEdit();
    for (const name of ["Delete debt", "Cancel", "Save changes"]) {
      expect(screen.getByRole("button", { name }).className).toMatch(
        /white-space_nowrap|ws_nowrap/,
      );
    }
  });

  it("offers no balance field and sends only the changed fields", () => {
    const { onEditDebt } = renderEdit();
    expect(screen.queryByLabelText(/^Balance you owe/)).toBeNull();
    fill("Interest rate", "");
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
