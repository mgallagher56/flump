import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { colors } from "../../tokens";
import { SliderField } from "./SliderField";

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

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

  it("value pill has input boundary", () => {
    render(<SliderField label="Rate" max={100} min={0} value={5} onChange={vi.fn()} />);
    const pill = screen.getByLabelText("Rate input").parentElement;
    expect(pill?.className).toContain("bd-c_border.input");
    expect(pill?.className).not.toContain("bd-c_border.subtle");
    // Light theme boundary vs the pill's own surface.sunken fill (slate.100), WCAG 1.4.11 needs >= 3.
    expect(ratio(colors.slate[500].value, colors.slate[100].value)).toBeGreaterThanOrEqual(3);
  });
});
