import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CurrencyInput } from "./CurrencyInput";
import { parseCurrencyInput } from "./parseCurrency";
import { TextInput } from "./TextInput";

describe("TextInput", () => {
  it("renders an input with the given attributes", () => {
    render(<TextInput aria-label="Name" inputMode="numeric" placeholder="Enter" />);
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.getAttribute("type")).toBe("text");
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<TextInput aria-label="Name" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "x" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("marks invalid inputs with aria-invalid", () => {
    render(<TextInput aria-label="Name" invalid />);
    expect(screen.getByLabelText("Name").getAttribute("aria-invalid")).toBe("true");
  });

  it("renders decorative prefix and suffix adornments", () => {
    const { container } = render(<TextInput aria-label="Rate" prefix="£" suffix="%" />);
    const adornments = container.querySelectorAll("span[aria-hidden='true']");
    expect(Array.from(adornments).map((a) => a.textContent)).toEqual(["£", "%"]);
  });

  it("supports disabled and keyboard focus", () => {
    render(<TextInput aria-label="Name" />);
    const input = screen.getByLabelText("Name");
    input.focus();
    expect(document.activeElement).toBe(input);
  });

  it("forwards ref", () => {
    let node: HTMLInputElement | null = null;
    render(
      <TextInput
        aria-label="Name"
        ref={(el) => {
          node = el;
        }}
      />,
    );
    expect(node).not.toBeNull();
  });

  it.each(["sm", "md"] as const)("applies the coarse-pointer touch height on %s", (size) => {
    const { container } = render(<TextInput aria-label="Name" size={size} />);
    expect(container.firstElementChild?.className).toMatch(/pointer:_coarse\)\]:min-h_touch/);
  });

  it("uses no inline styles", () => {
    const { container } = render(<TextInput aria-label="Name" size="sm" />);
    expect(container.querySelector("[style]")).toBeNull();
  });
});

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
