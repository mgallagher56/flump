import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SliderField } from "./SliderField";

describe("SliderField Primitive", () => {
  it("renders label, value, and handles slider change", () => {
    const handleChange = vi.fn();
    render(
      <SliderField
        label="Monthly Overpayment"
        max={1000}
        min={0}
        unitPrefix="£"
        value={150}
        onChange={handleChange}
      />,
    );

    expect(screen.getByText("Monthly Overpayment")).toBeDefined();
    const slider = screen.getByLabelText("Monthly Overpayment range slider");
    fireEvent.change(slider, { target: { value: "250" } });
    expect(handleChange).toHaveBeenCalledWith(250);
  });

  it("handles numeric pill direct input and clamps values", () => {
    const handleChange = vi.fn();
    render(
      <SliderField
        label="Pension Contribution"
        max={100}
        min={0}
        unitSuffix="%"
        value={5}
        onChange={handleChange}
      />,
    );

    const numInput = screen.getByLabelText("Pension Contribution input");
    fireEvent.change(numInput, { target: { value: "150" } });
    expect(handleChange).toHaveBeenCalledWith(100);
  });
});
