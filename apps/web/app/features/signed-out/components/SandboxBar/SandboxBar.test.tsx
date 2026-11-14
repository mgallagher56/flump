import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SandboxBar } from "./SandboxBar";

const personas = [
  { key: "debt", label: "Paying off debts" },
  { key: "high", label: "Paying a mortgage and letting a property" },
] as const;

describe("SandboxBar", () => {
  it("is the one sample-data notice and marks the chosen household", () => {
    render(<SandboxBar active="debt" onSave={vi.fn()} onSelect={vi.fn()} personas={personas} />);
    expect(screen.getByRole("note", { name: "Sample data" }).getAttribute("data-notice")).toBe(
      "sample",
    );
    expect(screen.getByText("Sample data: illustrative figures, not yours.")).toBeDefined();
    expect(screen.getByRole("tablist", { name: "Sample household" })).toBeDefined();
    expect(
      screen.getByRole("tab", { name: "Paying off debts" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByText("Ready to use your own figures?")).toBeDefined();
    expect(document.body.textContent).not.toMatch(/bank feeds|HMRC|demo|live/i);
  });

  it("reports household selection and sign up", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onSave = vi.fn();
    render(<SandboxBar active="debt" onSave={onSave} onSelect={onSelect} personas={personas} />);
    await user.click(screen.getByRole("tab", { name: "Paying a mortgage and letting a property" }));
    expect(onSelect).toHaveBeenCalledWith("high");
    await user.click(screen.getByRole("button", { name: "Sign up" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
