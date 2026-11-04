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
  it("renders the 4 persona tabs and defaults to Higher-Rate PAYE", () => {
    render(<FeaturePillars />);

    expect(screen.getByRole("tab", { name: /higher-rate paye/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /homeowner & remortgager/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /landlord & side-hustler/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /long-term wealth builder/i })).toBeDefined();

    // Default persona view
    expect(screen.getByText(/escape the 60% tax trap & maximize allowances/i)).toBeDefined();
    expect(screen.getByText(/average tax trap relief/i)).toBeDefined();
  });

  it("switches persona when a tab is clicked", () => {
    render(<FeaturePillars />);

    // Click Homeowner tab
    const homeownerTab = screen.getByRole("tab", { name: /homeowner & remortgager/i });
    fireEvent.click(homeownerTab);

    expect(screen.getByText(/defeat remortgage shock & compare overpay vs\. isa/i)).toBeDefined();
    expect(screen.getByText(/mortgage vs isa spread/i)).toBeDefined();

    // Click Landlord tab
    const landlordTab = screen.getByRole("tab", { name: /landlord & side-hustler/i });
    fireEvent.click(landlordTab);

    expect(
      screen.getByText(/section 24 landlord reducer & hmrc payments on account/i),
    ).toBeDefined();
    expect(screen.getByText(/hmrc reserve cushion/i)).toBeDefined();
  });

  it("retains all 4 primary pillar cards", () => {
    render(<FeaturePillars />);

    expect(
      screen.getByRole("heading", { level: 3, name: /uk tax & self-assessment hub/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 3, name: /complete net worth aggregation/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 3, name: /mortgage optimization & isa comparison/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 3, name: /pensions & compound wealth forecaster/i }),
    ).toBeDefined();
  });
});
