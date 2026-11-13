import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { colors } from "../../tokens";
import { parseSliderEntry, SliderField } from "./SliderField";
import { sliderPillInput } from "./SliderField.styles";

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
    // Out-of-range entries do not apply live; they clamp on blur.
    expect(handleChange).not.toHaveBeenCalled();
    fireEvent.blur(numInput);
    expect(handleChange).toHaveBeenCalledWith(100);
  });

  it("applies in-range typed entry live and parses en-GB grouping", () => {
    const handleChange = vi.fn();
    render(
      <SliderField
        format="currency"
        label="Price"
        max={500000}
        min={0}
        value={0}
        onChange={handleChange}
      />,
    );
    const input = screen.getByLabelText("Price input");
    fireEvent.change(input, { target: { value: "£250,000" } });
    expect(handleChange).toHaveBeenCalledWith(250000);
  });

  it("formats currency and percent in the pill", () => {
    const { rerender } = render(
      <SliderField
        format="currency"
        label="Price"
        max={500000}
        min={0}
        value={250000}
        onChange={vi.fn()}
      />,
    );
    expect((screen.getByLabelText("Price input") as HTMLInputElement).value).toBe("£250,000");
    rerender(
      <SliderField
        format="percent"
        label="Price"
        max={10}
        min={0}
        step={0.1}
        value={4.5}
        onChange={vi.fn()}
      />,
    );
    expect((screen.getByLabelText("Price input") as HTMLInputElement).value).toBe("4.5%");
  });

  it("keeps an empty pill empty and never calls onChange with 0", () => {
    const handleChange = vi.fn();
    const handleClear = vi.fn();
    render(
      <SliderField
        label="Rate"
        max={10}
        min={0}
        value={null}
        onChange={handleChange}
        onClear={handleClear}
      />,
    );
    const input = screen.getByLabelText("Rate input") as HTMLInputElement;
    expect(input.value).toBe("");
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("Not set");
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(input.value).toBe("");
    expect(handleChange).not.toHaveBeenCalled();
    expect(handleClear).toHaveBeenCalled();
  });

  it("links helper text to the range input", () => {
    render(
      <SliderField helperText="Help" label="Rate" max={10} min={0} value={1} onChange={vi.fn()} />,
    );
    const id = screen.getByRole("slider").getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)?.textContent).toBe("Help");
  });

  it("value pill has input boundary", () => {
    render(<SliderField label="Rate" max={100} min={0} value={5} onChange={vi.fn()} />);
    const pill = screen.getByLabelText("Rate input").parentElement;
    expect(pill?.className).toContain("bd-c_border.input");
    expect(pill?.className).not.toContain("bd-c_border.subtle");
    // Light theme boundary vs the pill's own surface.sunken fill (slate.100), WCAG 1.4.11 needs >= 3.
    expect(ratio(colors.slate[500].value, colors.slate[100].value)).toBeGreaterThanOrEqual(3);
  });

  it("announces formatted value", () => {
    render(
      <SliderField
        label="Price"
        max={500000}
        min={0}
        unitPrefix="£"
        value={250000}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("£250,000");
  });

  it("suffix is appended", () => {
    render(
      <SliderField label="Rate" max={10} min={0} unitSuffix="%" value={4.5} onChange={vi.fn()} />,
    );
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("4.5%");
  });

  it("custom formatter wins", () => {
    render(
      <SliderField
        formatValue={(v) => `${v} years`}
        label="Term"
        max={40}
        min={1}
        unitSuffix="%"
        value={25}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("25 years");
  });

  it("pill has focus-within outline using the focus ring token", () => {
    render(<SliderField label="Rate" max={100} min={0} value={5} onChange={vi.fn()} />);
    const pill = screen.getByLabelText("Rate input").parentElement;
    expect(pill?.className).toContain("focusWithin:");
    expect(pill?.className).toContain("focusWithin:ring-c_border.focusRing");
  });

  it("pill input is styled by a recipe, not inline css", () => {
    render(<SliderField label="Rate" max={100} min={0} value={5} onChange={vi.fn()} />);
    expect(sliderPillInput()).toBe(screen.getByLabelText("Rate input").className);
  });

  it("keeps focus-visible outline on the range slider", () => {
    render(<SliderField label="Rate" max={100} min={0} value={5} onChange={vi.fn()} />);
    expect(screen.getByRole("slider").className).toContain("focusVisible:");
  });

  it("steps with arrow, page and home/end keys and clamps", () => {
    const handleChange = vi.fn();
    render(
      <SliderField label="Rate" max={100} min={0} step={5} value={50} onChange={handleChange} />,
    );
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(handleChange).toHaveBeenLastCalledWith(55);
    fireEvent.keyDown(slider, { key: "ArrowDown" });
    expect(handleChange).toHaveBeenLastCalledWith(45);
    fireEvent.keyDown(slider, { key: "PageUp" });
    expect(handleChange).toHaveBeenLastCalledWith(60);
    fireEvent.keyDown(slider, { key: "PageDown" });
    expect(handleChange).toHaveBeenLastCalledWith(40);
    fireEvent.keyDown(slider, { key: "Home" });
    expect(handleChange).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(slider, { key: "End" });
    expect(handleChange).toHaveBeenLastCalledWith(100);
  });

  it("does not step past the ends or when disabled", () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <SliderField label="Rate" max={100} min={0} value={100} onChange={handleChange} />,
    );
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    expect(handleChange).not.toHaveBeenCalled();
    rerender(
      <SliderField disabled label="Rate" max={100} min={0} value={50} onChange={handleChange} />,
    );
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("avoids floating point drift on fractional steps", () => {
    const handleChange = vi.fn();
    render(
      <SliderField label="Rate" max={10} min={0} step={0.1} value={0.2} onChange={handleChange} />,
    );
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    expect(handleChange).toHaveBeenCalledWith(0.3);
  });

  it("parses only plain en-GB numbers", () => {
    expect(parseSliderEntry("£1,250")).toBe(1250);
    expect(parseSliderEntry("4.5%")).toBe(4.5);
    expect(parseSliderEntry("-3")).toBe(-3);
    expect(parseSliderEntry("1e3")).toBeNull();
    expect(parseSliderEntry("0x10")).toBeNull();
    expect(parseSliderEntry("1,5")).toBeNull();
    expect(parseSliderEntry("--1")).toBeNull();
    expect(parseSliderEntry("")).toBeNull();
    expect(parseSliderEntry(".")).toBeNull();
  });

  it("renders the track fill with the element (no effect needed)", () => {
    render(<SliderField label="Rate" max={100} min={0} value={25} onChange={vi.fn()} />);
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider.style.getPropertyValue("--slider-fill")).toBe("25%");
  });

  it("cancels the pending select frame on blur", () => {
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    render(<SliderField label="Rate" max={100} min={0} value={25} onChange={vi.fn()} />);
    const input = screen.getByLabelText("Rate input");
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(cancel).toHaveBeenCalled();
    cancel.mockRestore();
  });
});
