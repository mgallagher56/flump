import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BtlOverview } from "./BtlOverview";

describe("<BtlOverview />", () => {
  it("shows one prompt, not a row of Not set, when nothing is entered", () => {
    render(
      <BtlOverview
        grossYield={null}
        monthlyPayment={null}
        monthlyRent={0}
        propertyCount={null}
        onConfigure={vi.fn()}
      />,
    );
    expect(screen.queryAllByText("Not set").length).toBeLessThanOrEqual(1);
    expect(
      screen.getByText("Add your monthly rent and property value to see your rental yield"),
    ).toBeDefined();
    expect(screen.getByText("Number of properties not set")).toBeDefined();
    // No tax rule under the person's own figure.
    expect(screen.queryByText(/Section 24/)).toBeNull();
  });

  it("works out the rent left after the mortgage payment, with no status colour", () => {
    const onConfigure = vi.fn();
    const { container } = render(
      <BtlOverview
        grossYield={6}
        monthlyPayment={400}
        monthlyRent={1000}
        propertyCount={2}
        onConfigure={onConfigure}
      />,
    );
    expect(screen.getByText("Your buy to let properties")).toBeDefined();
    expect(screen.getByText("2 properties")).toBeDefined();
    expect(screen.getByText("Rent left after the mortgage payment (estimate)")).toBeDefined();
    expect(screen.getByText("+£600.00")).toBeDefined();
    expect(container.textContent).not.toMatch(/Gross|net cash flow/i);
    expect(container.innerHTML).not.toMatch(/danger|positive/);
    fireEvent.click(screen.getAllByRole("button", { name: "Edit your details" })[0] as HTMLElement);
    expect(onConfigure).toHaveBeenCalled();
  });
});
