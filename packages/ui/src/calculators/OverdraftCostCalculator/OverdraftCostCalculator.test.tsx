import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OverdraftCostCalculator } from "./OverdraftCostCalculator";

describe("OverdraftCostCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<OverdraftCostCalculator />);
    expect(container).toBeDefined();
  });
});
