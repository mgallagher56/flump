import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SandboxBar } from "./SandboxBar";
import { personaTabs } from "./SandboxBar.styles";

const personas = [
  { key: "medium", label: "Renting" },
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

  it("renders all three household tabs in a container with its own flex basis", () => {
    render(<SandboxBar active="medium" onSave={vi.fn()} onSelect={vi.fn()} personas={personas} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Renting",
      "Paying off debts",
      "Paying a mortgage and letting a property",
    ]);
    // The tabs sit in their own flex item, a direct child of the bar, not inside a content-sized
    // group: the tab scroller has `contain: inline-size`, so a content-sized parent gives it no width.
    const container = screen.getByTestId("sandbox-persona-tabs");
    expect(container.parentElement).toBe(screen.getByTestId("sandbox-bar"));
    expect(container.className).toBe(personaTabs());
    expect(personaTabs()).toMatch(/flex_1_1_20rem/);
    for (const tab of tabs) expect(container.contains(tab)).toBe(true);
  });
});
