import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("is a real checkbox named by its label", () => {
    render(<Checkbox label="Include overpayments" />);
    const box = screen.getByRole("checkbox", { name: "Include overpayments" }) as HTMLInputElement;
    expect(box.tagName).toBe("INPUT");
    expect(box.type).toBe("checkbox");
  });

  it("toggles and calls onChange", () => {
    const onChange = vi.fn();
    render(<Checkbox label="Remember me" onChange={onChange} />);
    const box = screen.getByRole("checkbox") as HTMLInputElement;
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("links the hint with aria-describedby", () => {
    render(<Checkbox hint="Counts towards your debt-free date" label="Overpay" />);
    expect(
      screen.getByRole("checkbox", { description: "Counts towards your debt-free date" }),
    ).toBeTruthy();
  });

  it("sets the indeterminate DOM property", () => {
    const { rerender } = render(<Checkbox indeterminate label="All accounts" />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).indeterminate).toBe(true);
    rerender(<Checkbox indeterminate={false} label="All accounts" />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).indeterminate).toBe(false);
  });

  it("supports invalid and disabled", () => {
    render(<Checkbox disabled invalid label="Agree" />);
    const box = screen.getByRole("checkbox") as HTMLInputElement;
    expect(box.disabled).toBe(true);
    expect(box.getAttribute("aria-invalid")).toBe("true");
  });

  it("forwards ref", () => {
    let node: HTMLInputElement | null = null;
    render(
      <Checkbox
        label="Ref"
        ref={(n) => {
          node = n;
        }}
      />,
    );
    expect(node).toBeInstanceOf(HTMLInputElement);
  });
});
