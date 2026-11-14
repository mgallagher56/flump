import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaymentsOnAccountCard } from "./PaymentsOnAccountCard";

describe("PaymentsOnAccountCard", () => {
  it("does not render when tax is 0", () => {
    const { container } = render(
      <PaymentsOnAccountCard annualSelfAssessmentTax={0} taxYear="2026/27" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("dates the bill and both payments on account after the tax year", () => {
    render(<PaymentsOnAccountCard annualSelfAssessmentTax={4800} taxYear="2026/27" />);
    expect(screen.getByText("Due 31 January 2028")).toBeDefined();
    expect(screen.getByText("Due 31 July 2028")).toBeDefined();
    expect(screen.getByText("£7,200")).toBeDefined();
    expect(screen.getByText("£2,400")).toBeDefined();
  });

  it("asks for payments on account at exactly £1,000", () => {
    render(<PaymentsOnAccountCard annualSelfAssessmentTax={1000} taxYear="2026/27" />);
    expect(screen.getByText("£1,500")).toBeDefined();
    expect(screen.getByText("£500")).toBeDefined();
  });

  it("shows one payment when more than 80% of the tax is taken at source", () => {
    const { container } = render(
      <PaymentsOnAccountCard
        annualSelfAssessmentTax={2000}
        taxDeductedAtSource={9000}
        taxYear="2026/27"
      />,
    );
    expect(screen.getByText("£2,000")).toBeDefined();
    expect(
      screen.getByText(/more than 80% of your tax for the year is taken at source/),
    ).toBeDefined();
    expect(container.textContent).not.toContain("£3,000");
  });

  it("shows no £0 July figure under £1,000", () => {
    const { container } = render(
      <PaymentsOnAccountCard annualSelfAssessmentTax={800} taxYear="2026/27" />,
    );
    expect(screen.getByText(/No July payment/)).toBeDefined();
    expect(container.textContent).not.toContain("£0");
  });
});
