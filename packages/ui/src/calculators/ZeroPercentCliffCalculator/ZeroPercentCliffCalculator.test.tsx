import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ZeroPercentCliffCalculator } from "./ZeroPercentCliffCalculator";

describe("ZeroPercentCliffCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<ZeroPercentCliffCalculator />);
    expect(container).toBeDefined();
  });
});
