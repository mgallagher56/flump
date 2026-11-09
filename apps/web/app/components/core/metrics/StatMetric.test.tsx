import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatMetric from "./StatMetric";

describe("<StatMetric />", () => {
  it("renders eyebrow label, hero value, delta badge, and helper subtext", () => {
    render(
      <StatMetric
        delta={{ text: "+£420/mo", variant: "positive" }}
        label="Total net worth"
        subtext="Assets: £240,000 • Liabilities: £120,000"
        tone="positive"
        value="£120,000"
      />,
    );

    expect(screen.getByText("Total net worth")).toBeDefined();
    expect(screen.getByText("£120,000")).toBeDefined();
    expect(screen.getByText("+£420/mo")).toBeDefined();
    expect(screen.getByText(/Assets: £240,000/)).toBeDefined();
  });

  it("renders with custom action and neutral tone", () => {
    render(
      <StatMetric
        action={<button type="button">Edit</button>}
        label="Liquid cash"
        tone="neutral"
        value="£15,400"
      />,
    );

    expect(screen.getByText("Liquid cash")).toBeDefined();
    expect(screen.getByText("£15,400")).toBeDefined();
    expect(screen.getByRole("button", { name: "Edit" })).toBeDefined();
  });
});
