import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PaymentsOnAccountCard from "./PaymentsOnAccountCard";

describe("PaymentsOnAccountCard", () => {
  it("does not render when tax is 0", () => {
    const { container } = render(<PaymentsOnAccountCard annualSelfAssessmentTax={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("calculates 31 Jan and 31 July payments on account and monthly pot set-aside", () => {
    render(<PaymentsOnAccountCard annualSelfAssessmentTax={4800} />);

    expect(screen.getByText("HMRC Payments on Account & Cash-Flow Reserve")).toBeDefined();
    expect(screen.getByText("31 January Deadline")).toBeDefined();
    expect(screen.getByText("31 July Deadline")).toBeDefined();
    expect(screen.getByText("£400")).toBeDefined(); // £4800 / 12 = £400/mo
  });
});
