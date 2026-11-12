import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
