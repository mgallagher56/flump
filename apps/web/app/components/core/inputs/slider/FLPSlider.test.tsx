import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FLPSlider from "./FLPSlider";

describe("<FLPSlider />", () => {
  it("renders slider with label, tabular value readout, and handles change", () => {
    const handleChange = vi.fn();
    render(
      <FLPSlider
        formatValue={(v) => `£${v.toLocaleString()}/mo`}
        label="Monthly Contribution"
        max={1000}
        min={0}
        step={50}
        value={250}
        onChange={handleChange}
      />,
    );

    expect(screen.getByText("Monthly Contribution")).toBeDefined();
    expect(screen.getByText("£250/mo")).toBeDefined();

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "300" } });
    expect(handleChange).toHaveBeenCalledWith(300);
  });
});
