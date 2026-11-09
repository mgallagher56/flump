import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { FeaturePillars } from "./FeaturePillars";

vi.mock("react-router", () => ({
  Link: ({
    children,
    to,
    style,
    className,
  }: {
    children: ReactNode;
    to: string;
    style?: any;
    className?: string;
  }) => (
    <a className={className} href={to} style={style}>
      {children}
    </a>
  ),
}));

describe("FeaturePillars", () => {
  it("renders the 5 persona tabs and defaults to Debt payoff and recovery", () => {
    render(<FeaturePillars />);

    expect(screen.getByRole("tab", { name: /debt payoff and recovery/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /higher-rate paye/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /homeowner and remortgager/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /landlord and sole trader/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /long-term wealth builder/i })).toBeDefined();

    // Default persona view
    expect(screen.getByText(/clear high-interest debt and build positive wealth/i)).toBeDefined();
    expect(screen.getByText(/interest saved and time saved/i)).toBeDefined();
  });

  it("switches persona when a tab is clicked", () => {
    render(<FeaturePillars />);

    // Click Homeowner tab
    const homeownerTab = screen.getByRole("tab", { name: /homeowner and remortgager/i });
    fireEvent.click(homeownerTab);

    expect(
      screen.getByText(/navigate remortgage rates and compare overpayments with investing/i),
    ).toBeDefined();
    expect(screen.getByText(/mortgage vs isa spread/i)).toBeDefined();

    // Click Landlord tab
    const landlordTab = screen.getByRole("tab", { name: /landlord and sole trader/i });
    fireEvent.click(landlordTab);

    expect(screen.getByText(/section 24 landlord tax and hmrc payments on account/i)).toBeDefined();
    expect(screen.getByText(/hmrc tax reserve/i)).toBeDefined();
  });

  it("retains all 4 primary pillar cards", () => {
    render(<FeaturePillars />);

    expect(
      screen.getByRole("heading", { level: 3, name: /uk tax and self assessment hub/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 3, name: /complete net worth aggregation/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 3, name: /mortgage optimisation and isa comparison/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 3, name: /pensions and compound wealth forecaster/i }),
    ).toBeDefined();
  });
});
