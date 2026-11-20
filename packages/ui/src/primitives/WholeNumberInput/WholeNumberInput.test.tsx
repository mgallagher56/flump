import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WholeNumberInput } from "./WholeNumberInput";

describe("WholeNumberInput", () => {
  it("drops a leading zero as you type (owner item 5: 0 then 840 shows 840)", () => {
    const onValueChange = vi.fn();
    render(<WholeNumberInput aria-label="Age" onValueChange={onValueChange} value={0} />);
    const input = screen.getByLabelText("Age");
    expect((input as HTMLInputElement).value).toBe("0");
    fireEvent.change(input, { target: { value: "0840" } });
    expect((input as HTMLInputElement).value).toBe("840");
    expect(onValueChange).toHaveBeenLastCalledWith(840);
  });

  it("keeps an empty field as null, never 0", () => {
    const onValueChange = vi.fn();
    render(<WholeNumberInput aria-label="Age" onValueChange={onValueChange} value={40} />);
    fireEvent.change(screen.getByLabelText("Age"), { target: { value: "" } });
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it("does not group thousands, so a year reads 1985", () => {
    render(<WholeNumberInput aria-label="Year" value={1985} />);
    expect((screen.getByLabelText("Year") as HTMLInputElement).value).toBe("1985");
  });

  it("rejects a decimal point or a letter and reports it", () => {
    const onInvalid = vi.fn();
    const onValueChange = vi.fn();
    render(
      <WholeNumberInput aria-label="Age" onInvalid={onInvalid} onValueChange={onValueChange} />,
    );
    const input = screen.getByLabelText("Age");
    fireEvent.change(input, { target: { value: "4.5" } });
    fireEvent.change(input, { target: { value: "4a" } });
    expect(onInvalid).toHaveBeenCalledTimes(2);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("does not take a digit that would go above max, and reports it", () => {
    const onValueChange = vi.fn();
    const onInvalid = vi.fn();
    render(
      <WholeNumberInput
        aria-label="Age"
        max={120}
        min={16}
        onInvalid={onInvalid}
        onValueChange={onValueChange}
      />,
    );
    const input = screen.getByLabelText("Age");
    fireEvent.change(input, { target: { value: "15" } });
    fireEvent.change(input, { target: { value: "150" } });
    expect((input as HTMLInputElement).value).toBe("15");
    expect(onInvalid).toHaveBeenCalledWith("150");
    expect(onValueChange).toHaveBeenLastCalledWith(15);
  });

  it("reports a value below min on blur and keeps what was typed", () => {
    const onValueChange = vi.fn();
    const onInvalid = vi.fn();
    render(
      <WholeNumberInput
        aria-label="Age"
        max={120}
        min={16}
        onInvalid={onInvalid}
        onValueChange={onValueChange}
      />,
    );
    const input = screen.getByLabelText("Age");
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.blur(input);
    expect((input as HTMLInputElement).value).toBe("12");
    expect(onInvalid).toHaveBeenCalledWith("12");
    expect(onValueChange).toHaveBeenLastCalledWith(12);
  });

  it("does not group thousands while a year is typed", () => {
    render(<WholeNumberInput aria-label="Year" value={null} />);
    const input = screen.getByLabelText("Year") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1985" } });
    expect(input.value).toBe("1985");
  });

  it("takes a value equal to max or min and does not report either", () => {
    const onValueChange = vi.fn();
    const onInvalid = vi.fn();
    render(
      <WholeNumberInput
        aria-label="Age"
        max={120}
        min={16}
        onInvalid={onInvalid}
        onValueChange={onValueChange}
      />,
    );
    const input = screen.getByLabelText("Age") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "120" } });
    expect(input.value).toBe("120");
    expect(onValueChange).toHaveBeenLastCalledWith(120);
    fireEvent.change(input, { target: { value: "16" } });
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: "40" } });
    fireEvent.blur(input);
    expect(input.value).toBe("40");
    expect(onInvalid).not.toHaveBeenCalled();
  });

  it("rejects above max and reports below min without an error when no callbacks are given", () => {
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      errors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener("error", onError);
    try {
      render(<WholeNumberInput aria-label="Age" max={120} min={16} />);
      const input = screen.getByLabelText("Age") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "12" } });
      fireEvent.change(input, { target: { value: "125" } });
      expect(input.value).toBe("12");
      fireEvent.blur(input);
      expect(input.value).toBe("12");
    } finally {
      window.removeEventListener("error", onError);
    }
    expect(errors).toEqual([]);
  });

  it("asks phones for the number keypad", () => {
    render(<WholeNumberInput aria-label="Age" />);
    expect(screen.getByLabelText("Age").getAttribute("inputmode")).toBe("numeric");
  });
});
