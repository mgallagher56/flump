import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedTabs } from "./SegmentedTabs";

describe("SegmentedTabs Primitive", () => {
  const items = [
    { value: "avalanche", label: "Avalanche (Highest APR)" },
    { value: "snowball", label: "Snowball (Lowest Balance)" },
    { value: "minimum", label: "Minimum Only" },
  ];

  it("renders tab triggers and handles selection", () => {
    const handleSelect = vi.fn();
    render(<SegmentedTabs items={items} value="avalanche" onValueChange={handleSelect} />);

    const snowballBtn = screen.getByRole("tab", { name: "Snowball (Lowest Balance)" });
    expect(snowballBtn).toBeDefined();
    fireEvent.keyDown(snowballBtn, { key: "Enter", code: "Enter" });
    expect(handleSelect).toHaveBeenCalledWith("snowball");
  });

  it("keeps every panel mounted and hides the inactive ones", () => {
    render(
      <SegmentedTabs
        items={items}
        panels={{ avalanche: <p>First panel</p>, snowball: <p>Second panel</p> }}
        value="snowball"
        onValueChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Second panel")).toBeDefined();
    expect(screen.queryByRole("tabpanel", { hidden: false })?.textContent).toBe("Second panel");
    expect(screen.getByText("First panel", { ignore: "" }).closest("[hidden]")).not.toBeNull();
    const tab = screen.getByRole("tab", { name: "Snowball (Lowest Balance)" });
    expect(document.getElementById(tab.getAttribute("aria-controls") ?? "")).not.toBeNull();
  });

  it("names the tab list with aria-label", () => {
    render(
      <SegmentedTabs
        aria-label="Sections"
        items={items}
        value="avalanche"
        onValueChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("tablist", { name: "Sections" })).toBeDefined();
  });

  it("does not emit a dangling aria-controls when no panels are given", () => {
    render(<SegmentedTabs items={items} value="avalanche" onValueChange={vi.fn()} />);
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.hasAttribute("aria-controls")).toBe(false);
    }
  });

  it("links the active tab to a real panel via the panels prop", () => {
    render(
      <SegmentedTabs
        items={items}
        value="snowball"
        onValueChange={vi.fn()}
        panels={{ avalanche: "A", snowball: "S", minimum: "M" }}
      />,
    );
    const tab = screen.getByRole("tab", { name: "Snowball (Lowest Balance)" });
    const panel = screen.getByRole("tabpanel");
    expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
    expect(panel.textContent).toBe("S");
    // Radix keeps inactive panels in the DOM (hidden, empty), so aria-controls still resolves.
    const inactive = screen.getByRole("tab", { name: "Minimum Only" });
    const target = document.getElementById(inactive.getAttribute("aria-controls") ?? "");
    expect(target?.hasAttribute("hidden")).toBe(true);
  });

  it("supports SegmentedTabs.Panel children and keepMounted", () => {
    render(
      <SegmentedTabs items={items} value="avalanche" onValueChange={vi.fn()}>
        <SegmentedTabs.Panel value="avalanche">First</SegmentedTabs.Panel>
        <SegmentedTabs.Panel value="snowball" keepMounted>
          Second
        </SegmentedTabs.Panel>
      </SegmentedTabs>,
    );
    expect(screen.getByText("First")).toBeDefined();
    const hidden = screen.getByText("Second", { selector: "[role=tabpanel]" });
    expect(hidden.getAttribute("data-state")).toBe("inactive");
    expect(
      screen.getByRole("tab", { name: "Snowball (Lowest Balance)" }).getAttribute("aria-controls"),
    ).toBe(hidden.id);
  });

  it("selects on arrow focus by default (automatic activation)", async () => {
    const onValueChange = vi.fn();
    render(<SegmentedTabs items={items} value="avalanche" onValueChange={onValueChange} />);
    const first = screen.getByRole("tab", { name: "Avalanche (Highest APR)" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith("snowball"));
  });

  it("only moves focus on arrow keys with activationMode manual", async () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedTabs
        activationMode="manual"
        items={items}
        value="avalanche"
        onValueChange={onValueChange}
      />,
    );
    const first = screen.getByRole("tab", { name: "Avalanche (Highest APR)" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    // Focus moves (Radix does it on a timer), selection does not.
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Snowball (Lowest Balance)" })).toBe(
        document.activeElement,
      ),
    );
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
