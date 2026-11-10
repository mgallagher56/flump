import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MortgageVsIsaCalculator } from "./MortgageVsIsaCalculator";

describe("MortgageVsIsaCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<MortgageVsIsaCalculator />);
    expect(container).toBeDefined();
  });
});
