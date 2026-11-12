import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BtlOverview } from "./BtlOverview";

describe("<BtlOverview />", () => {
  it("shows Not set for rent, yield and cash flow when nothing is entered", () => {
    render(
      <BtlOverview
        grossYield={null}
        monthlyPayment={null}
        monthlyRent={0}
        mortgageType="interest-only"
        propertyCount={1}
        onConfigure={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Not set")).toHaveLength(4);
    expect(screen.getByText("Managing 1 property")).toBeDefined();
    expect(screen.getByText(/Section 24 rule:/)).toBeDefined();
  });

  it("computes net cash flow from rent and payment", () => {
    const onConfigure = vi.fn();
    render(
      <BtlOverview
        grossYield={6}
        monthlyPayment={400}
        monthlyRent={1000}
        mortgageType="repayment"
        propertyCount={2}
        onConfigure={onConfigure}
      />,
    );
    expect(screen.getByText("Managing 2 properties")).toBeDefined();
    expect(screen.getByText("+£600.00")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Configure in profile/ }));
    expect(onConfigure).toHaveBeenCalled();
  });
});
