import { compareAvalancheAndSnowball } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
    expect(screen.queryByText("Add Liability Account")).toBeNull();

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
      minimumPayment: 90,
      type: "loan",
    });
    expect(onClose).toHaveBeenCalled();
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

    // Strategy cards click & keyDown
    const avalancheCard = screen.getByRole("button", { name: /Select Avalanche strategy/i });
    fireEvent.click(avalancheCard);
    fireEvent.keyDown(avalancheCard, { key: "Enter" });

    const snowballCard = screen.getByRole("button", { name: /Select Snowball strategy/i });
    fireEvent.click(snowballCard);
    fireEvent.keyDown(snowballCard, { key: " " });

    const minCard = screen.getByRole("button", { name: /Select Minimum Only strategy/i });
    fireEvent.click(minCard);
    fireEvent.keyDown(minCard, { key: "Enter" });
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
