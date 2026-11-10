import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiStrip } from "./KpiStrip";

describe("KpiStrip Pattern", () => {
  it("renders children in horizontal grid", () => {
    render(
      <KpiStrip columns={4}>
        <div>Metric A</div>
        <div>Metric B</div>
      </KpiStrip>,
    );
    expect(screen.getByText("Metric A")).toBeDefined();
    expect(screen.getByText("Metric B")).toBeDefined();
  });
});
