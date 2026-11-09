import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FLPProgressBar from "./FLPProgressBar";

describe("<FLPProgressBar />", () => {
  it("renders with label, progressbar role and correct percentage", () => {
    render(
      <FLPProgressBar
        label="ISA Allowance"
        max={20000}
        showPercent={true}
        value={15000}
        variant="positive"
      />,
    );

    expect(screen.getByText("ISA Allowance")).toBeDefined();
    expect(screen.getByText("75%")).toBeDefined();
    expect(screen.getByRole("progressbar")).toBeDefined();
  });
});
