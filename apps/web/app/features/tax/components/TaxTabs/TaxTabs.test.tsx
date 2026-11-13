import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { TaxTabs } from "./TaxTabs";

const ITEMS = [
  { value: "a", label: "First" },
  { value: "b", label: "Second" },
  { value: "c", label: "Third" },
] as const;

const Harness = () => {
  const [value, setValue] = useState<"a" | "b" | "c">("a");
  return (
    <TaxTabs idBase="t" items={ITEMS} label="Views" value={value} onValueChange={setValue}>
      <p>Panel {value}</p>
    </TaxTabs>
  );
};

describe("TaxTabs", () => {
  it("labels the panel by the selected tab", () => {
    render(<Harness />);
    const panel = screen.getByRole("tabpanel", { name: "First" });
    expect(panel.textContent).toBe("Panel a");
    expect(screen.getByRole("tab", { name: "First" }).getAttribute("aria-controls")).toBe(panel.id);
  });

  it("selects on click", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("tab", { name: "Third" }));
    expect(screen.getByRole("tab", { name: "Third" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel c");
  });

  it("moves with arrow keys, wrapping, and Home/End", () => {
    render(<Harness />);
    const first = screen.getByRole("tab", { name: "First" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Third" }));
    fireEvent.keyDown(document.activeElement as Element, { key: "Home" });
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel a");
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" });
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel b");
    expect(screen.getByRole("tab", { name: "Second" }).tabIndex).toBe(0);
    expect(screen.getByRole("tab", { name: "First" }).tabIndex).toBe(-1);
  });
});
