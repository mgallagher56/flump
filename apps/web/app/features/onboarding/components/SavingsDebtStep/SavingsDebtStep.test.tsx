import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StepHarness } from "../../testing";
import { SavingsDebtStep } from "./SavingsDebtStep";

const setup = (onSkip = vi.fn()) =>
  render(
    <StepHarness>
      {({ values, update }) => (
        <SavingsDebtStep
          onBack={vi.fn()}
          onNext={vi.fn()}
          onSkip={onSkip}
          update={update}
          values={values}
        />
      )}
    </StepHarness>,
  );

describe("<SavingsDebtStep />", () => {
  it("starts empty, with a percent field for the pension contribution", () => {
    setup();
    for (const label of [
      /cash and isa savings/i,
      /pension pot/i,
      /pension contribution/i,
      /owed on credit cards and loans/i,
    ]) {
      expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe("");
    }
  });

  it("keeps a typed 0 debt as 0, distinct from empty", () => {
    setup();
    const debt = screen.getByLabelText(/owed on credit cards and loans/i) as HTMLInputElement;
    fireEvent.change(debt, { target: { value: "0" } });
    expect(debt.value).toBe("0");
  });

  it("calls onSkip", () => {
    const onSkip = vi.fn();
    setup(onSkip);
    fireEvent.click(screen.getByRole("button", { name: "Skip this step" }));
    expect(onSkip).toHaveBeenCalled();
  });
});
