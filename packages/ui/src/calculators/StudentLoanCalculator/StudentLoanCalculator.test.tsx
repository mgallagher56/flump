import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudentLoanCalculator } from "./StudentLoanCalculator";

describe("StudentLoanCalculator", () => {
  it("renders without crashing", () => {
    const { container } = render(<StudentLoanCalculator />);
    expect(container).toBeDefined();
  });
});
