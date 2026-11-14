import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  DEPOSIT_EMPTY_TEXT,
  DepositTimeline,
  type DepositTimelineValues,
  depositOutcomeText,
} from "./DepositTimeline";

const values = (over: Partial<DepositTimelineValues> = {}): DepositTimelineValues => ({
  targetDeposit: null,
  monthlySaving: 400,
  startingAmount: 5000,
  ...over,
});

describe("depositOutcomeText", () => {
  it("asks for a target first, with no placeholder amount", () => {
    expect(depositOutcomeText(values())).toBe(DEPOSIT_EMPTY_TEXT);
  });

  it("gives months, and years and months from a year on", () => {
    expect(depositOutcomeText(values({ targetDeposit: 20000 }))).toBe(
      "Estimated time to reach target: 38 months (3 years 2 months)",
    );
    expect(depositOutcomeText(values({ targetDeposit: 9800, monthlySaving: 400 }))).toBe(
      "Estimated time to reach target: 12 months (1 year 0 months)",
    );
    expect(depositOutcomeText(values({ targetDeposit: 5400, monthlySaving: 400 }))).toBe(
      "Estimated time to reach target: 1 month",
    );
  });

  it("says when the starting amount already meets the target", () => {
    expect(depositOutcomeText(values({ targetDeposit: 5000 }))).toBe(
      "Your starting amount already meets this target.",
    );
  });

  it("says the target is not reached with no monthly saving", () => {
    for (const monthlySaving of [null, 0]) {
      expect(depositOutcomeText(values({ targetDeposit: 20000, monthlySaving }))).toBe(
        "With no monthly saving, this target is not reached in this estimate.",
      );
    }
  });
});

function Harness({ initial, onChange }: { initial: DepositTimelineValues; onChange?: () => void }) {
  const [state, setState] = useState(initial);
  return (
    <DepositTimeline
      values={state}
      onChange={(key, value) => {
        onChange?.();
        setState((prev) => ({ ...prev, [key]: value }));
      }}
    />
  );
}

describe("<DepositTimeline />", () => {
  it("starts with a blank target and updates the outcome as the user types", () => {
    const onChange = vi.fn();
    render(<Harness initial={values()} onChange={onChange} />);
    const target = screen.getByLabelText("Target deposit") as HTMLInputElement;
    expect(target.value).toBe("");
    expect(screen.getByTestId("deposit-timeline-outcome").textContent).toBe(DEPOSIT_EMPTY_TEXT);
    fireEvent.change(target, { target: { value: "20000" } });
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByTestId("deposit-timeline-outcome").textContent).toBe(
      "Estimated time to reach target: 38 months (3 years 2 months)",
    );
    expect(screen.getByText("From your saved savings accounts")).toBeDefined();
    expect(screen.getByText("Estimate only. Does not include interest.")).toBeDefined();
  });
});
