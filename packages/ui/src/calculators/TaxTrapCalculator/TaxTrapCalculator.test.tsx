import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaxTrapCalculator } from "./TaxTrapCalculator";

describe("TaxTrapCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<TaxTrapCalculator />);
    expect(container).toBeDefined();
  });
});
