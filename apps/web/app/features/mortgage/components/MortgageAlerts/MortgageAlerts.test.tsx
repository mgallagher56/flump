import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MortgageAlerts } from "./MortgageAlerts";

describe("<MortgageAlerts />", () => {
  it("renders nothing when no fixed rate end date is due", () => {
    const { container } = render(
      <MortgageAlerts refinanceWarning={null} onModelRateChange={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("states when the fixed rate ends, with no judgement, and opens the rate change tool", () => {
    const onModel = vi.fn();
    render(
      <MortgageAlerts
        refinanceWarning={{ diffMonths: 3, date: "2027-02-01" }}
        onModelRateChange={onModel}
      />,
    );
    const line = screen.getByTestId("mortgage-refinance-warning");
    expect(line.textContent).toMatch(/^Your fixed rate ends in 3 months\./);
    // Facts only (E29/E32, E16 PR 6): no advice, no alarm, no status colour or warning icon.
    expect(line.textContent).not.toMatch(/worth comparing|usually raises|shock|alert/i);
    expect(line.className).not.toMatch(/warning|danger|info/);
    expect(line.querySelector("svg")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Model a rate change" }));
    expect(onModel).toHaveBeenCalled();
  });

  it("says when the fix ends within the month, and when it has ended", () => {
    const { rerender } = render(
      <MortgageAlerts
        refinanceWarning={{ diffMonths: 0, ended: false, date: "2026-12-01" }}
        onModelRateChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Your fixed rate ends in less than a month\./)).toBeDefined();
    rerender(
      <MortgageAlerts
        refinanceWarning={{ diffMonths: 0, ended: true, date: "2026-10-01" }}
        onModelRateChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Your fixed rate has ended\./)).toBeDefined();
  });
});
