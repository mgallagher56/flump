import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  formatEnGbNumber,
  parseCurrencyInput,
  parseEnGbNumber,
} from "../CurrencyInput/parseCurrency";
import { PercentInput } from "./PercentInput";

describe("parseEnGbNumber", () => {
  it.each([
    ["1,250.50", 1250.5],
    ["£1,250", 1250],
    ["4.5%", 4.5],
    [" 12 ", 12],
    ["", null],
    ["   ", null],
    ["%", null],
    ["0", 0],
    ["-3", -3],
    ["1.2.3", null],
    ["1,25", null],
    ["abc", null],
  ])("parses %j as %j", (raw, expected) => {
    expect(parseEnGbNumber(raw)).toBe(expected);
  });

  it("is what parseCurrencyInput uses", () => {
    expect(parseCurrencyInput("£1,250")).toBe(parseEnGbNumber("£1,250"));
  });
});

describe("parseEnGbNumber hardening", () => {
  it("normalises negative zero and rejects unsafe or non-finite values", () => {
    expect(Object.is(parseEnGbNumber("-0"), 0)).toBe(true);
    expect(parseEnGbNumber("9007199254740993")).toBeNull();
    expect(parseEnGbNumber(`1${"0".repeat(400)}`)).toBeNull();
  });

  it("treats a lone symbol as not a number", () => {
    expect(parseEnGbNumber("£")).toBeNull();
    expect(parseEnGbNumber("%")).toBeNull();
  });
});

describe("per-field characters", () => {
  it("PercentInput rejects £ and reports it through onInvalid", () => {
    const onInvalid = vi.fn();
    const onValueChange = vi.fn();
    render(<PercentInput aria-label="Rate" onInvalid={onInvalid} onValueChange={onValueChange} />);
    fireEvent.change(screen.getByLabelText("Rate"), { target: { value: "£4" } });
    expect(onInvalid).toHaveBeenCalledWith("£4");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("CurrencyInput rejects % and a pasted word, reporting both", async () => {
    const { CurrencyInput } = await import("../CurrencyInput/CurrencyInput");
    const onInvalid = vi.fn();
    render(<CurrencyInput aria-label="Balance" onInvalid={onInvalid} />);
    const input = screen.getByLabelText("Balance");
    fireEvent.change(input, { target: { value: "4%" } });
    fireEvent.change(input, { target: { value: "abc" } });
    expect(onInvalid).toHaveBeenCalledTimes(2);
  });

  it("a lone symbol calls onInvalid and emits null", () => {
    const onInvalid = vi.fn();
    const onValueChange = vi.fn();
    render(<PercentInput aria-label="Rate" onInvalid={onInvalid} onValueChange={onValueChange} />);
    fireEvent.change(screen.getByLabelText("Rate"), { target: { value: "%" } });
    expect(onInvalid).toHaveBeenCalledWith("%");
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });
});

describe("formatEnGbNumber", () => {
  it.each([
    [1234567.891, 2, "1,234,567.89"],
    [4.5, 2, "4.5"],
    [4, 2, "4"],
    [4.567, 1, "4.6"],
    [-0.001, 2, "0"],
    [Number.NaN, 2, ""],
  ])("formats %s (%s dp) as %j", (value, decimals, expected) => {
    expect(formatEnGbNumber(value, decimals)).toBe(expected);
  });
});

describe("PercentInput", () => {
  it("uses decimal input mode and a % suffix", () => {
    const { container } = render(<PercentInput aria-label="Interest rate" value={null} />);
    expect(screen.getByLabelText("Interest rate").getAttribute("inputmode")).toBe("decimal");
    expect(container.querySelector("span[aria-hidden='true']")?.textContent).toBe("%");
  });

  it("reports parsed numbers and null for empty, never 0", () => {
    const onValueChange = vi.fn();
    render(<PercentInput aria-label="Interest rate" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Interest rate") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "4.5" } });
    expect(onValueChange).toHaveBeenLastCalledWith(4.5);
    fireEvent.change(input, { target: { value: "" } });
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(input.value).toBe("");
  });

  it("accepts a typed percent sign", () => {
    const onValueChange = vi.fn();
    render(<PercentInput aria-label="Interest rate" onValueChange={onValueChange} />);
    fireEvent.change(screen.getByLabelText("Interest rate"), { target: { value: "4.5%" } });
    expect(onValueChange).toHaveBeenLastCalledWith(4.5);
  });

  it("rounds and clamps to min and max on blur, emitting the settled value", () => {
    const onValueChange = vi.fn();
    render(
      <PercentInput aria-label="Interest rate" max={100} min={0} onValueChange={onValueChange} />,
    );
    const input = screen.getByLabelText("Interest rate") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "250" } });
    fireEvent.blur(input);
    expect(input.value).toBe("100");
    expect(onValueChange).toHaveBeenLastCalledWith(100);
    fireEvent.change(input, { target: { value: "-4" } });
    fireEvent.blur(input);
    expect(input.value).toBe("0");
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  it("leaves an empty field empty on blur", () => {
    const onValueChange = vi.fn();
    render(<PercentInput aria-label="Interest rate" max={100} onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Interest rate") as HTMLInputElement;
    fireEvent.blur(input);
    expect(input.value).toBe("");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("reports invalid raw text", () => {
    const onInvalid = vi.fn();
    render(<PercentInput aria-label="Interest rate" onInvalid={onInvalid} />);
    fireEvent.change(screen.getByLabelText("Interest rate"), { target: { value: "1.2.3" } });
    expect(onInvalid).toHaveBeenCalledWith("1.2.3");
  });
});
