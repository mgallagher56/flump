import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiCard } from "./KpiCard";

describe("KpiCard Primitive", () => {
  it("renders label, value, and delta badge", () => {
    render(
      <KpiCard
        deltaText="+12% YoY"
        deltaVariant="positive"
        label="Total S&S ISA Balance"
        subtext="Max capacity: £20,000 / tax year"
        value="£42,850"
      />,
    );
    expect(screen.getByText("Total S&S ISA Balance")).toBeDefined();
    expect(screen.getByText("£42,850")).toBeDefined();
    expect(screen.getByText("+12% YoY")).toBeDefined();
  });
});
