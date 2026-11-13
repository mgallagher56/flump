import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CurrencyInput } from "./CurrencyInput";
import { formatCurrencyInput, parseCurrencyInput } from "./parseCurrency";

describe("parseCurrencyInput", () => {
  it.each([
    ["", null],
    ["   ", null],
    ["12", 12],
    ["1,234.5", 1234.5],
    ["1,234.50", 1234.5],
    ["£1,234", 1234],
    ["0", 0],
    ["12.", 12],
    [".5", 0.5],
    ["-50", -50],
    ["abc", null],
    ["12abc", null],
    ["1,2,3", null],
    ["1.2.3", null],
    ["-", null],
    [".", null],
  ])("parses %j as %j", (raw, expected) => {
    expect(parseCurrencyInput(raw)).toBe(expected);
  });
});

describe("CurrencyInput", () => {
  it("uses decimal input mode and a £ prefix", () => {
    const { container } = render(<CurrencyInput aria-label="Balance" value={null} />);
    expect(screen.getByLabelText("Balance").getAttribute("inputmode")).toBe("decimal");
    expect(container.querySelector("span[aria-hidden='true']")?.textContent).toBe("£");
  });

  it("reports parsed numbers", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Balance");
    fireEvent.change(input, { target: { value: "1,234.5" } });
    expect(onValueChange).toHaveBeenLastCalledWith(1234.5);
    fireEvent.change(input, { target: { value: "12" } });
    expect(onValueChange).toHaveBeenLastCalledWith(12);
  });

  it("reports null for empty and never coerces to 0", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} value={50} />);
    const input = screen.getByLabelText("Balance") as HTMLInputElement;
    expect(input.value).toBe("50");
    fireEvent.change(input, { target: { value: "" } });
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(input.value).toBe("");
  });

  it("starts empty for null and undefined values", () => {
    const { rerender } = render(<CurrencyInput aria-label="Balance" value={null} />);
    expect((screen.getByLabelText("Balance") as HTMLInputElement).value).toBe("");
    rerender(<CurrencyInput aria-label="Balance" value={undefined} />);
    expect((screen.getByLabelText("Balance") as HTMLInputElement).value).toBe("");
  });

  it("rejects non-numeric characters", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Balance") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it("keeps in-progress text such as '12.' while the value matches", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <CurrencyInput aria-label="Balance" onValueChange={onValueChange} value={null} />,
    );
    const input = screen.getByLabelText("Balance") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12." } });
    rerender(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} value={12} />);
    expect(input.value).toBe("12.");
  });

  it("follows external value changes and formats on blur", () => {
    const { rerender } = render(<CurrencyInput aria-label="Balance" value={10} />);
    const input = screen.getByLabelText("Balance") as HTMLInputElement;
    rerender(<CurrencyInput aria-label="Balance" value={2500} />);
    expect(input.value).toBe("2,500");
    fireEvent.change(input, { target: { value: "1234.5" } });
    fireEvent.blur(input);
    expect(input.value).toBe("1,234.5");
  });

  it("calls a supplied onBlur", () => {
    const onBlur = vi.fn();
    render(<CurrencyInput aria-label="Balance" onBlur={onBlur} />);
    fireEvent.blur(screen.getByLabelText("Balance"));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

describe("CurrencyInput min and max", () => {
  it("clamps on blur and emits the settled value", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" max={1000} min={0} onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Balance") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "£1,250" } });
    expect(onValueChange).toHaveBeenLastCalledWith(1250);
    fireEvent.blur(input);
    expect(input.value).toBe("1,000");
    expect(onValueChange).toHaveBeenLastCalledWith(1000);
  });
});

describe("formatCurrencyInput", () => {
  it.each([
    [Number.NaN, ""],
    [Number.POSITIVE_INFINITY, ""],
    [Number.NEGATIVE_INFINITY, ""],
    [-0, "0"],
    [-0.001, "0"],
    [0.004, "0"],
    [1234.5, "1,234.5"],
    [-1234.567, "-1,234.57"],
  ])("formats %s as %j", (value, expected) => {
    expect(formatCurrencyInput(value)).toBe(expected);
  });
});

describe("CurrencyInput edge cases", () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY])("shows an empty field for %s", (value) => {
    render(<CurrencyInput aria-label="Balance" value={value} />);
    expect((screen.getByLabelText("Balance") as HTMLInputElement).value).toBe("");
  });

  it("shows 0 for -0 and sub-penny values", () => {
    const { rerender } = render(<CurrencyInput aria-label="Balance" value={-0} />);
    expect((screen.getByLabelText("Balance") as HTMLInputElement).value).toBe("0");
    rerender(<CurrencyInput aria-label="Balance" value={-0.001} />);
    expect((screen.getByLabelText("Balance") as HTMLInputElement).value).toBe("0");
  });

  it("rounds to 2dp on blur and emits the rounded value", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Balance") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1,234.567" } });
    expect(onValueChange).toHaveBeenLastCalledWith(1234.567);
    fireEvent.blur(input);
    expect(input.value).toBe("1,234.57");
    expect(onValueChange).toHaveBeenLastCalledWith(1234.57);
  });

  it("does not re-emit on blur when rounding changes nothing", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Balance" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Balance");
    fireEvent.change(input, { target: { value: "12.5" } });
    onValueChange.mockClear();
    fireEvent.blur(input);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("calls onInvalid for non-empty text that fails to parse, not for empty or valid text", () => {
    const onInvalid = vi.fn();
    const onValueChange = vi.fn();
    render(
      <CurrencyInput aria-label="Balance" onInvalid={onInvalid} onValueChange={onValueChange} />,
    );
    const input = screen.getByLabelText("Balance");
    fireEvent.change(input, { target: { value: "1.2.3" } });
    expect(onInvalid).toHaveBeenCalledWith("1.2.3");
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    onInvalid.mockClear();
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(onInvalid).not.toHaveBeenCalled();
  });
});
