import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button Primitive", () => {
  it("renders with default primary variant and handles click", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Optimise ISA</Button>);
    const btn = screen.getByRole("button", { name: "Optimise ISA" });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("primary variant fills with primary.solid", () => {
    render(<Button>Save</Button>);
    const cls = screen.getByRole("button", { name: "Save" }).className;
    expect(cls).toContain("bg_primary.solid");
    expect(cls).not.toMatch(/(^|\s)bg_primary(\s|$)/);
  });

  it("applies disabled attributes correctly", () => {
    render(<Button disabled>Disabled Action</Button>);
    const btn = screen.getByRole("button", { name: "Disabled Action" });
    expect(btn).toHaveProperty("disabled", true);
  });
});
