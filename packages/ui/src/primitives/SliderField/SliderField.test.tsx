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
    const slider = screen.getByLabelText("Monthly Overpayment");
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

  it("shows a label addon and adds describedBy ids to the slider and the pill", () => {
    render(
      <>
        <p id="extra-help">Extra help</p>
        <SliderField
          describedBy="extra-help"
          helperText="Help"
          label="Rate"
          labelAddon={<button type="button">About rate</button>}
          max={10}
          min={0}
          value={1}
          onChange={vi.fn()}
        />
      </>,
    );
    expect(screen.getByRole("button", { name: "About rate" })).toBeTruthy();
    const ids = screen.getByRole("slider").getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(ids).toHaveLength(2);
    expect(ids).toContain("extra-help");
    expect(screen.getByLabelText("Rate input").getAttribute("aria-describedby")).toBe("extra-help");
    // The label still names the slider.
    expect(screen.getByLabelText("Rate", { selector: "input[type=range]" })).toBeTruthy();
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

  it("pill input text is 16px so iOS does not zoom on focus (P08)", () => {
    render(<SliderField label="Rate" max={100} min={0} value={5} onChange={vi.fn()} />);
    const input = screen.getByLabelText("Rate input");
    expect(input.className).toContain("fs_md");
    expect(input.className).not.toContain("fs_inherit");
    // The affix stays at the pill's label.md size.
    expect(input.parentElement?.className).toContain("textStyle_label.md");
  });

  it("pill grows with its value, so £1,250,000 fits at 16px (P08 follow-up)", () => {
    const { rerender } = render(
      <SliderField
        label="Property price"
        max={2_000_000}
        min={0}
        unitPrefix="£"
        value={1_250_000}
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Property price input") as HTMLInputElement;
    expect(input.value).toBe("1,250,000");
    // "1,250,000" is 9 characters; one more of room makes 10. No fixed width caps it.
    expect(input.size).toBe(10);
    expect(input.className).toContain("w_auto");
    expect(input.className).toContain("field-sizing_content");
    expect(input.className).not.toContain("w_88px");

    // A short value stays compact: "5" sits in the 4-character floor plus one.
    rerender(<SliderField label="Property price" max={100} min={0} value={5} onChange={vi.fn()} />);
    expect(input.size).toBe(5);
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

  it("keeps a suffix's leading space in the pill (R2-8)", () => {
    render(
      <SliderField
        label="Years"
        max={40}
        min={1}
        unitSuffix=" years"
        value={5}
        onChange={vi.fn()}
      />,
    );
    const suffix = screen.getByText(" years", { normalizer: (s) => s });
    expect(suffix.textContent).toBe(" years");
    // The pill is a flex row, which drops a flex item's leading space unless it is preserved.
    expect(suffix.className).toContain("white-space_pre");
  });
});

describe("SliderField entry and edges", () => {
  const pill = (label = "Rate") => screen.getByLabelText(`${label} input`) as HTMLInputElement;

  it("parses grouped numbers and pence, and rejects malformed grouping", () => {
    expect(parseSliderEntry("2.55")).toBe(2.55);
    expect(parseSliderEntry("1,250,000")).toBe(1250000);
    expect(parseSliderEntry("1,250.55")).toBe(1250.55);
    // A first group of four digits, or a group of one after the last comma, is not en-GB grouping.
    expect(parseSliderEntry("1234,567")).toBeNull();
    expect(parseSliderEntry("1,250,5")).toBeNull();
  });

  it("reads a value that is not a number as Not set", () => {
    render(<SliderField label="Rate" max={100} min={0} value={Number.NaN} onChange={vi.fn()} />);
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("Not set");
  });

  it("shows pence in a currency pill when the step has decimals", () => {
    render(
      <SliderField
        format="currency"
        label="Rate"
        max={100}
        min={0}
        step={0.01}
        value={12.5}
        onChange={vi.fn()}
      />,
    );
    expect(pill().value).toBe("£12.50");
  });

  it("fills the track from min, not from zero", () => {
    // Range 10 to 110 is 100 wide; 35 is 25 above min, so 25%.
    render(<SliderField label="Rate" max={110} min={10} value={35} onChange={vi.fn()} />);
    expect(
      (screen.getByRole("slider") as HTMLInputElement).style.getPropertyValue("--slider-fill"),
    ).toBe("25%");
  });

  it("fills nothing when min and max are the same", () => {
    render(<SliderField label="Rate" max={10} min={10} value={10} onChange={vi.fn()} />);
    expect(
      (screen.getByRole("slider") as HTMLInputElement).style.getPropertyValue("--slider-fill"),
    ).toBe("0%");
  });

  it("pages by a tenth of the range when min is not zero", () => {
    const onChange = vi.fn();
    // Range 10 to 110: a tenth of 100 is 10, so PageUp from 50 gives 60.
    render(<SliderField label="Rate" max={110} min={10} value={50} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "PageUp" });
    expect(onChange).toHaveBeenLastCalledWith(60);
  });

  it("stops the page scrolling for the keys it handles and leaves other keys alone", () => {
    const onChange = vi.fn();
    render(<SliderField label="Rate" max={100} min={0} value={50} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    expect(fireEvent.keyDown(slider, { key: "Tab" })).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
    expect(fireEvent.keyDown(slider, { key: "ArrowRight" })).toBe(false);
  });

  it("shows the slider value in the pill after a drag, dropping what was typed", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SliderField label="Rate" max={100} min={0} value={50} onChange={onChange} />,
    );
    fireEvent.focus(pill());
    fireEvent.change(pill(), { target: { value: "40" } });
    fireEvent.change(screen.getByRole("slider"), { target: { value: "70" } });
    rerender(<SliderField label="Rate" max={100} min={0} value={70} onChange={onChange} />);
    expect(pill().value).toBe("70");
  });

  it("applies typed entries live only from min to max inclusive", () => {
    const onChange = vi.fn();
    render(<SliderField label="Rate" max={100} min={10} value={50} onChange={onChange} />);
    fireEvent.focus(pill());
    for (const text of ["", "abc", "5", "500"]) {
      fireEvent.change(pill(), { target: { value: text } });
    }
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(pill(), { target: { value: "10" } });
    expect(onChange).toHaveBeenLastCalledWith(10);
    fireEvent.change(pill(), { target: { value: "100" } });
    expect(onChange).toHaveBeenLastCalledWith(100);
  });

  it("selects the pill text a frame after focus, unless something was typed first", async () => {
    render(<SliderField label="Rate" max={100} min={0} value={25} onChange={vi.fn()} />);
    const input = pill();
    input.focus();
    fireEvent.focus(input);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(2);

    fireEvent.blur(input);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "3", selectionStart: 1, selectionEnd: 1 } });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(input.selectionStart).toBe(1);
  });

  it("clears only an empty pill on blur, and puts back the value after text that is not a number", () => {
    const onClear = vi.fn();
    const onChange = vi.fn();
    render(
      <SliderField
        label="Rate"
        max={100}
        min={0}
        value={25}
        onChange={onChange}
        onClear={onClear}
      />,
    );
    fireEvent.focus(pill());
    fireEvent.change(pill(), { target: { value: "abc" } });
    fireEvent.blur(pill());
    expect(onClear).not.toHaveBeenCalled();
    expect(pill().value).toBe("25");
    fireEvent.focus(pill());
    fireEvent.change(pill(), { target: { value: "  " } });
    fireEvent.blur(pill());
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("does not report an unchanged value on blur", () => {
    const onChange = vi.fn();
    render(<SliderField label="Rate" max={100} min={0} value={25} onChange={onChange} />);
    fireEvent.focus(pill());
    fireEvent.blur(pill());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears an empty pill without an error when no onClear is given", () => {
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      errors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener("error", onError);
    try {
      render(<SliderField label="Rate" max={100} min={0} value={25} onChange={vi.fn()} />);
      fireEvent.focus(pill());
      fireEvent.change(pill(), { target: { value: "" } });
      fireEvent.blur(pill());
    } finally {
      window.removeEventListener("error", onError);
    }
    expect(errors).toEqual([]);
  });

  it("shows unit affixes beside a plain number and not beside a percentage, which has its own sign", () => {
    const { unmount } = render(
      <SliderField
        label="Rate"
        max={100}
        min={0}
        unitPrefix="~"
        unitSuffix=" yrs"
        value={5}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("~")).toBeDefined();
    expect(screen.getByText("yrs", { exact: false })).toBeDefined();
    unmount();
    render(
      <SliderField
        format="percent"
        label="Rate"
        max={100}
        min={0}
        unitPrefix="~"
        unitSuffix=" yrs"
        value={5}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText("~")).toBeNull();
    expect(screen.queryByText("yrs", { exact: false })).toBeNull();
    expect(pill().value).toBe("5%");
  });

  it.each([
    [{ min: 0, step: 1 }, "numeric"],
    [{ min: -10, step: 1 }, "decimal"],
    [{ min: 0, step: 0.5 }, "decimal"],
  ])("asks phones for a keypad that fits %j: %s", (props, mode) => {
    render(<SliderField label="Rate" max={100} value={5} onChange={vi.fn()} {...props} />);
    expect(pill().getAttribute("inputmode")).toBe(mode);
  });
});
