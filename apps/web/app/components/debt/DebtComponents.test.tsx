import { compareAvalancheAndSnowball } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { debtItemToAccountPayload } from "~/features/debt/utils/debtAccountMapping";
import { AddDebtDialog } from "./AddDebtDialog";
import { PayoffStrategySwitcher } from "./PayoffStrategySwitcher";
import { UkDebtInstrumentsCard } from "./UkDebtInstrumentsCard";

describe("Debt Components: AddDebtDialog, PayoffStrategySwitcher, UkDebtInstrumentsCard", () => {
  it("renders AddDebtDialog when open, updates fields, and submits new liability", () => {
    const onClose = vi.fn();
    const onAddDebt = vi.fn();

    const { rerender, container } = render(
      <AddDebtDialog isOpen={false} onAddDebt={onAddDebt} onClose={onClose} />,
    );
    expect(screen.queryByText("Add liability account")).toBeNull();

    rerender(<AddDebtDialog isOpen={true} onAddDebt={onAddDebt} onClose={onClose} />);

    const nameInput = screen.getByPlaceholderText(/Barclaycard Platinum/i);
    fireEvent.change(nameInput, { target: { value: "Amex Gold" } });

    const typeSelect = screen.getByLabelText("Debt Type");
    fireEvent.change(typeSelect, { target: { value: "loan" } });

    const numberInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(numberInputs[0], { target: { value: "3500" } });
    fireEvent.change(numberInputs[1], { target: { value: "19.9" } });
    fireEvent.change(numberInputs[2], { target: { value: "90" } });

    const form = container.querySelector("form");
    if (form) fireEvent.submit(form);

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

  describe("AddDebtDialog without fabricated defaults", () => {
    const open = () => {
      const onAddDebt = vi.fn();
      const onClose = vi.fn();
      const view = render(<AddDebtDialog isOpen onAddDebt={onAddDebt} onClose={onClose} />);
      return { onAddDebt, onClose, ...view };
    };

    it("starts with empty balance, APR and minimum fields", () => {
      open();
      for (const input of screen.getAllByRole("spinbutton")) {
        expect((input as HTMLInputElement).value).toBe("");
      }
    });

    it("needs only a name and balance; blank APR and minimum are flagged unknown", () => {
      const { onAddDebt, container } = open();
      fireEvent.change(screen.getByPlaceholderText(/Barclaycard Platinum/i), {
        target: { value: "Klarna" },
      });
      fireEvent.change(screen.getByLabelText("Outstanding balance (£)"), {
        target: { value: "250" },
      });
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

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
      const { onAddDebt, container } = open();
      fireEvent.change(screen.getByPlaceholderText(/Barclaycard Platinum/i), {
        target: { value: "0% card" },
      });
      fireEvent.change(screen.getByLabelText("Outstanding balance (£)"), {
        target: { value: "900" },
      });
      fireEvent.change(screen.getByLabelText("APR (%)"), { target: { value: "0" } });
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      const submitted = onAddDebt.mock.calls[0][0];
      expect(submitted.aprKnown).toBe(true);
      expect(debtItemToAccountPayload(submitted).interestRate).toBe(0);
    });

    it("does not submit without a balance", () => {
      const { onAddDebt, container } = open();
      fireEvent.change(screen.getByPlaceholderText(/Barclaycard Platinum/i), {
        target: { value: "Klarna" },
      });
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);
      expect(onAddDebt).not.toHaveBeenCalled();
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

    it("offers no balance field and sends only the changed fields", () => {
      const onEditDebt = vi.fn();
      const { container } = render(
        <AddDebtDialog
          debt={debt}
          isOpen
          onAddDebt={vi.fn()}
          onClose={vi.fn()}
          onEditDebt={onEditDebt}
        />,
      );
      expect(screen.queryByLabelText("Outstanding balance (£)")).toBeNull();
      fireEvent.change(screen.getByLabelText("APR (%)"), { target: { value: "" } });
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);
      expect(onEditDebt).toHaveBeenCalledWith("d1", { apr: 0, aprKnown: false });
    });

    it("sends nothing when nothing changed", () => {
      const onEditDebt = vi.fn();
      const onClose = vi.fn();
      const { container } = render(
        <AddDebtDialog
          debt={debt}
          isOpen
          onAddDebt={vi.fn()}
          onClose={onClose}
          onEditDebt={onEditDebt}
        />,
      );
      fireEvent.submit(container.querySelector("form") as HTMLFormElement);
      expect(onEditDebt).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("interacts with PayoffStrategySwitcher slider, surplus match, and keyboard/click strategy cards", () => {
    const comparison = compareAvalancheAndSnowball(
      [
        {
          id: "d1",
          name: "Card A",
          balance: 3000,
          apr: 24.9,
          minimumPayment: 75,
          type: "credit_card",
        },
        {
          id: "d2",
          name: "Card B",
          balance: 1200,
          apr: 18.9,
          minimumPayment: 40,
          type: "credit_card",
        },
      ],
      100,
    );
    const onSelectStrategy = vi.fn();
    const onChangeExtraPayment = vi.fn();

    render(
      <PayoffStrategySwitcher
        budgetSurplus={250}
        comparison={comparison}
        extraPayment={0}
        selectedStrategy="avalanche"
        onChangeExtraPayment={onChangeExtraPayment}
        onSelectStrategy={onSelectStrategy}
      />,
    );

    // Match surplus button
    fireEvent.click(screen.getByRole("button", { name: /Match surplus/i }));
    expect(onChangeExtraPayment).toHaveBeenCalledWith(250);

    // Number input & range slider
    fireEvent.change(screen.getByLabelText("Monthly debt overpayment"), {
      target: { value: "150" },
    });
    expect(onChangeExtraPayment).toHaveBeenCalledWith(150);

    fireEvent.change(screen.getByLabelText("Extra monthly debt overpayment slider"), {
      target: { value: "200" },
    });
    expect(onChangeExtraPayment).toHaveBeenCalledWith(200);

    // Strategy radios
    const avalancheCard = screen.getByRole("radio", { name: /Select Avalanche strategy/i });
    fireEvent.click(avalancheCard);

    const snowballCard = screen.getByRole("radio", { name: /Select Snowball strategy/i });
    fireEvent.click(snowballCard);

    const minCard = screen.getByRole("radio", { name: /Select Minimum Only strategy/i });
    fireEvent.click(minCard);
  });

  it("switches across all 4 tabs in UkDebtInstrumentsCard and updates inputs", () => {
    render(<UkDebtInstrumentsCard />);

    // Tab 1: 0% Expiry Tracker
    const cliffInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(cliffInputs[0], { target: { value: "4500" } });
    fireEvent.change(cliffInputs[1], { target: { value: "2" } }); // triggers alertRequired (< 90 days)
    fireEvent.change(cliffInputs[2], { target: { value: "29.9" } });

    // Tab 2: Arranged Overdraft Cost
    fireEvent.click(screen.getByRole("button", { name: /Arranged Overdraft EAR Cost/i }));
    const odInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(odInputs[0], { target: { value: "1500" } });
    fireEvent.change(odInputs[1], { target: { value: "39.9" } });

    // Tab 3: PCP / HP Car Finance Balloon
    fireEvent.click(screen.getByRole("button", { name: /PCP \/ HP Car Finance Balloon/i }));
    const balloonInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(balloonInputs[0], { target: { value: "350" } });
    fireEvent.change(balloonInputs[1], { target: { value: "18" } });
    fireEvent.change(balloonInputs[2], { target: { value: "9000" } });

    // Tab 4: UK Student Loan Guardrail
    fireEvent.click(screen.getByRole("button", { name: /UK Student Loan Distinction/i }));
    fireEvent.change(screen.getByLabelText("Student Loan Plan"), {
      target: { value: "plan1" },
    });
    const studentInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(studentInputs[0], { target: { value: "120000" } });
    fireEvent.change(studentInputs[1], { target: { value: "15000" } });
  });
});
