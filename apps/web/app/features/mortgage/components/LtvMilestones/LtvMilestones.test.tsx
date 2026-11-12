import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LtvMilestones } from "./LtvMilestones";

const milestones = [
  { targetLtvPct: 90, isAchieved: true, lumpSumNeededGbp: 0 },
  {
    targetLtvPct: 75,
    isAchieved: false,
    lumpSumNeededGbp: 15000,
    requiredMonthlyOverpaymentBeforeFixGbp: 250,
  },
];

describe("<LtvMilestones />", () => {
  it("shows unlocked and locked tiers with the equity needed", () => {
    render(
      <LtvMilestones
        currentLtv={80}
        loanAmount={160000}
        milestones={milestones}
        ownershipSharePct={100}
        propertyValue={200000}
        onApplyOverpayment={vi.fn()}
      />,
    );
    expect(screen.getByText("Unlocked")).toBeDefined();
    expect(screen.getByText("Locked")).toBeDefined();
    expect(screen.getByText(/Current LTV: 80.0%/)).toBeDefined();
  });

  it("applies the required overpayment", () => {
    const onApply = vi.fn();
    render(
      <LtvMilestones
        currentLtv={80}
        loanAmount={160000}
        milestones={milestones}
        ownershipSharePct={100}
        propertyValue={200000}
        onApplyOverpayment={onApply}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Apply/ }));
    expect(onApply).toHaveBeenCalledWith(250);
  });
});
