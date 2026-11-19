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

  it("clamps to min and max on blur", () => {
    const onValueChange = vi.fn();
    render(<WholeNumberInput aria-label="Age" max={120} min={16} onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Age");
    fireEvent.change(input, { target: { value: "150" } });
    fireEvent.blur(input);
    expect((input as HTMLInputElement).value).toBe("120");
    expect(onValueChange).toHaveBeenLastCalledWith(120);
  });

  it("asks phones for the number keypad", () => {
    render(<WholeNumberInput aria-label="Age" />);
    expect(screen.getByLabelText("Age").getAttribute("inputmode")).toBe("numeric");
  });
});
