import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("exposes role=switch on a real checkbox input", () => {
    render(<Switch label="Monthly summary email" />);
    const sw = screen.getByRole("switch", { name: "Monthly summary email" }) as HTMLInputElement;
    expect(sw.tagName).toBe("INPUT");
    expect(sw.type).toBe("checkbox");
  });

  it("reports the on state accessibly", () => {
    render(<Switch defaultChecked label="Alerts" />);
    expect(screen.getByRole("switch", { checked: true })).toBeTruthy();
  });

  it("toggles and calls onChange", () => {
    const onChange = vi.fn();
    render(<Switch label="Alerts" onChange={onChange} />);
    const sw = screen.getByRole("switch") as HTMLInputElement;
    fireEvent.click(sw);
    expect(sw.checked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("associates the hint", () => {
    render(<Switch hint="Sent on the first of the month" label="Summary" />);
    expect(
      screen.getByRole("switch", { description: "Sent on the first of the month" }),
    ).toBeTruthy();
  });

  it("supports disabled", () => {
    render(<Switch disabled label="Alerts" />);
    expect((screen.getByRole("switch") as HTMLInputElement).disabled).toBe(true);
  });
});
