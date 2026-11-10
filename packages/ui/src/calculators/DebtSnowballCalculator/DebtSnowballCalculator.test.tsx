import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DebtSnowballCalculator } from "./DebtSnowballCalculator";

describe("DebtSnowballCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<DebtSnowballCalculator />);
    expect(container).toBeDefined();
  });
});
