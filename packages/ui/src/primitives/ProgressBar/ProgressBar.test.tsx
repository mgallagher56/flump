import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar Primitive", () => {
  it("renders with proper ARIA attributes and percentage display", () => {
    render(
      <ProgressBar
        label="ISA Allowance Used"
        max={20000}
        showPercent
        value={15000}
        variant="positive"
      />,
    );

    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("15000");
    expect(bar.getAttribute("aria-valuemax")).toBe("20000");
    expect(screen.getByText("75%")).toBeDefined();
  });
});
