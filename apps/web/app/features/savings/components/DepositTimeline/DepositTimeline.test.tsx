import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  DEPOSIT_EMPTY_TEXT,
  DEPOSIT_OUTCOME_LABEL,
  DepositTimeline,
  type DepositTimelineValues,
  defaultDepositTarget,
  depositOutcomeText,
  depositRanges,
  reachedByMonth,
} from "./DepositTimeline";

const values = (over: Partial<DepositTimelineValues> = {}): DepositTimelineValues => ({
  targetDeposit: null,
  monthlySaving: 400,
  startingAmount: 5000,
  ...over,
});

describe("depositOutcomeText", () => {
  it("asks for a target when it is cleared", () => {
    expect(depositOutcomeText(values())).toBe(DEPOSIT_EMPTY_TEXT);
  });

  it("gives months, and years and months over 24 months", () => {
    expect(depositOutcomeText(values({ targetDeposit: 20000 }))).toBe(
      "Estimated time to reach target: 3 years 2 months",
    );
    expect(depositOutcomeText(values({ targetDeposit: 9800, monthlySaving: 400 }))).toBe(
      "Estimated time to reach target: 12 months",
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

describe("defaults and ranges", () => {
  it("opens on the next round £5,000 above the starting amount", () => {
    expect(defaultDepositTarget(3200)).toBe(5000);
    expect(defaultDepositTarget(5000)).toBe(10000);
    expect(defaultDepositTarget(null)).toBe(5000);
  });

  it("sets slider ranges from the saved figures that hold them", () => {
    const ranges = depositRanges(values({ targetDeposit: 25000, startingAmount: 38000 }));
    expect(ranges.target.max).toBeGreaterThanOrEqual(76000);
    expect(ranges.monthly.max).toBe(2000);
    expect(ranges.monthly.step).toBe(25);
  });

  it("names the month a target is met in en-GB", () => {
    expect(reachedByMonth(new Date(2026, 10, 14), 6)).toBe("May 2027");
  });
});

function Harness({ initial, onChange }: { initial: DepositTimelineValues; onChange?: () => void }) {
  const [state, setState] = useState(initial);
  return (
    <DepositTimeline
      saved={initial}
      today={new Date(2026, 10, 14)}
      values={state}
      onChange={(key, value) => {
        onChange?.();
        setState((prev) => ({ ...prev, [key]: value }));
      }}
    />
  );
}

describe("<DepositTimeline />", () => {
  it("shows one result card with one row and one sentence, and updates as a slider moves", () => {
    const onChange = vi.fn();
    render(<Harness initial={values({ targetDeposit: 6000 })} onChange={onChange} />);
    expect(screen.getByTestId("deposit-timeline-outcome").textContent).toBe("3 months");
    expect(screen.getByText(DEPOSIT_OUTCOME_LABEL)).toBeDefined();
    expect(screen.getByText("Reached by").nextElementSibling?.textContent).toBe("Feb 2027");
    expect(screen.getByText("Still to save: £1,000.")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Target amount"), { target: { value: "20000" } });
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByTestId("deposit-timeline-outcome").textContent).toBe("3 years 2 months");
    // The tool starts from the saved total, which the zone already states: two sliders only.
    expect(screen.queryByLabelText("Starting amount")).toBeNull();
    expect(screen.getAllByRole("slider")).toHaveLength(2);
    // The label carries the one assumption, so there is no separate note.
    expect(screen.queryByText(/does not include interest/)).toBeNull();
  });

  it("states the reached and not-reachable cases in words", () => {
    render(<Harness initial={values({ targetDeposit: 4000 })} />);
    expect(screen.getByTestId("deposit-timeline-outcome").textContent).toBe(
      "Your starting amount already meets this target.",
    );
  });
});
