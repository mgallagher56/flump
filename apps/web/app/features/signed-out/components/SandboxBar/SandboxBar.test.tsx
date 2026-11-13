import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SandboxBar } from "./SandboxBar";

const personas = [
  { key: "debt", label: "Clearing £8k debt" },
  { key: "high", label: "£100k high earner" },
] as const;

describe("SandboxBar", () => {
  it("says the sandbox is read-only and marks the active persona", () => {
    render(<SandboxBar active="debt" onSave={vi.fn()} onSelect={vi.fn()} personas={personas} />);
    expect(screen.getByText(/Demo sandbox \(read-only\)/)).toBeDefined();
    expect(screen.getByText("Clearing £8k debt").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("£100k high earner").getAttribute("aria-pressed")).toBe("false");
  });

  it("reports persona selection and the save action", () => {
    const onSelect = vi.fn();
    const onSave = vi.fn();
    render(<SandboxBar active="debt" onSave={onSave} onSelect={onSelect} personas={personas} />);
    fireEvent.click(screen.getByText("£100k high earner"));
    expect(onSelect).toHaveBeenCalledWith("high");
    fireEvent.click(screen.getByRole("button", { name: /Save my numbers and create account/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
