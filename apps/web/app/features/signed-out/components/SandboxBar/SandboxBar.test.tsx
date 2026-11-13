import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SandboxBar } from "./SandboxBar";
import { barButton } from "./SandboxBar.styles";

const personas = [
  { key: "debt", label: "Paying off debts" },
  { key: "high", label: "Paying a mortgage and letting a property" },
] as const;

describe("SandboxBar", () => {
  it("says the sandbox is read-only and marks the active persona", () => {
    render(<SandboxBar active="debt" onSave={vi.fn()} onSelect={vi.fn()} personas={personas} />);
    expect(screen.getByText(/Demo sandbox \(read-only\)/)).toBeDefined();
    expect(screen.getByText("Paying off debts").getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByText("Paying a mortgage and letting a property").getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("reports persona selection and the save action", () => {
    const onSelect = vi.fn();
    const onSave = vi.fn();
    render(<SandboxBar active="debt" onSave={onSave} onSelect={onSelect} personas={personas} />);
    fireEvent.click(screen.getByText("Paying a mortgage and letting a property"));
    expect(onSelect).toHaveBeenCalledWith("high");
    fireEvent.click(screen.getByRole("button", { name: /Save my numbers and create account/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("keeps a 44px hit area on the persona and save buttons", () => {
    render(<SandboxBar active="debt" onSave={vi.fn()} onSelect={vi.fn()} personas={personas} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toContain(barButton());
    }
  });
});
