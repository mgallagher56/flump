import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MortgageAlerts } from "./MortgageAlerts";

describe("<MortgageAlerts />", () => {
  it("renders nothing when there is nothing to warn about", () => {
    const { container } = render(
      <MortgageAlerts
        refinanceWarning={null}
        showMissingAccount={false}
        onAddAccount={vi.fn()}
        onSimulateRateShock={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows the refinance warning with an en-GB date and the ERC caveat", () => {
    const onSimulate = vi.fn();
    render(
      <MortgageAlerts
        refinanceWarning={{ diffMonths: 3, date: "2027-02-01" }}
        showMissingAccount={false}
        onAddAccount={vi.fn()}
        onSimulateRateShock={onSimulate}
      />,
    );
    expect(screen.getByText("Your fixed-rate deal ends in 3 months")).toBeDefined();
    expect(screen.getByText("1 February 2027")).toBeDefined();
    expect(screen.getByText(/early repayment charge \(ERC\)/)).toBeDefined();
    // Facts only (E29/E32): no advice to compare deals, no claim about what usually happens.
    const banner = screen.getByTestId("mortgage-refinance-warning");
    expect(banner.textContent).not.toMatch(/worth comparing|usually raises/i);
    expect(banner.className).toMatch(/info/);
    fireEvent.click(screen.getByRole("button", { name: "Simulate rate shock" }));
    expect(onSimulate).toHaveBeenCalled();
  });

  it("says when the fix ends within the month, and when it has ended", () => {
    const props = {
      showMissingAccount: false,
      onAddAccount: vi.fn(),
      onSimulateRateShock: vi.fn(),
    };
    const { rerender } = render(
      <MortgageAlerts
        {...props}
        refinanceWarning={{ diffMonths: 0, ended: false, date: "2026-12-01" }}
      />,
    );
    expect(screen.getByText("Your fixed-rate deal ends in less than a month")).toBeDefined();
    rerender(
      <MortgageAlerts
        {...props}
        refinanceWarning={{ diffMonths: 0, ended: true, date: "2026-10-01" }}
      />,
    );
    expect(screen.getByText("Your fixed-rate deal has ended")).toBeDefined();
  });

  it("offers to add a missing mortgage account", () => {
    const onAdd = vi.fn();
    render(
      <MortgageAlerts
        refinanceWarning={null}
        showMissingAccount
        onAddAccount={onAdd}
        onSimulateRateShock={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    expect(onAdd).toHaveBeenCalled();
  });
});
