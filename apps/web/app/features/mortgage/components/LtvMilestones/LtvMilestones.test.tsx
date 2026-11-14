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

const renderBands = (onModel = vi.fn()) =>
  render(
    <LtvMilestones
      currentLtv={80}
      loanAmount={160000}
      milestones={milestones}
      ownershipSharePct={100}
      propertyValue={200000}
      onModelOverpayment={onModel}
    />,
  );

describe("<LtvMilestones />", () => {
  it("states each band as a fact, with no locks, colours or pricing claims", () => {
    const { container } = renderBands();
    expect(screen.getByText("At or below this band")).toBeDefined();
    expect(screen.getByText("Above this band")).toBeDefined();
    expect(screen.getByText("Your LTV is within this band")).toBeDefined();
    expect(screen.getByText(/less to owe to reach this band/)).toBeDefined();
    expect(screen.getByText(/Current LTV: 80%/)).toBeDefined();
    expect(container.textContent).not.toMatch(/80\.0%/);
    // Owning all of it is the usual case, so no share line.
    expect(container.textContent).not.toMatch(/Share you own/);
    expect(container.textContent).not.toMatch(/Unlocked|Locked|tier|unlock|\/mo/);
    expect(container.innerHTML).not.toMatch(/positive|warning|danger/);
  });

  it("collapses bands the LTV is already within into one row, and shows a part share", () => {
    const { container } = render(
      <LtvMilestones
        currentLtv={38.7}
        loanAmount={135400}
        milestones={[90, 85, 75, 60].map((targetLtvPct) => ({
          targetLtvPct,
          isAchieved: true,
          lumpSumNeededGbp: 0,
        }))}
        ownershipSharePct={50}
        propertyValue={350000}
        onModelOverpayment={vi.fn()}
      />,
    );
    expect(container.querySelectorAll("[data-list-row]")).toHaveLength(1);
    expect(screen.getByText("90%, 85%, 75% and 60% LTV bands")).toBeDefined();
    expect(screen.getByText("Your LTV is within these bands")).toBeDefined();
    expect(screen.getByText(/Current LTV: 38.7%/)).toBeDefined();
    expect(container.textContent).toMatch(/Share you own/);
  });

  it("models the monthly overpayment for a band", () => {
    const onApply = vi.fn();
    renderBands(onApply);
    fireEvent.click(screen.getByRole("button", { name: /^Model/ }));
    expect(onApply).toHaveBeenCalledWith(250);
  });
});
