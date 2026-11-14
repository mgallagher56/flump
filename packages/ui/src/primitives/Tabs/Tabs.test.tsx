import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  hasFocusableContent,
  SegmentedTabs,
  scrollSelectedTabIntoView,
  Tabs,
  updateOverflowCue,
} from "./Tabs";

describe("Tabs Primitive", () => {
  const items = [
    { value: "avalanche", label: "Avalanche" },
    { value: "snowball", label: "Snowball" },
    { value: "minimum", label: "Minimum only" },
  ];

  it("renders tab triggers and handles selection", () => {
    const handleSelect = vi.fn();
    render(<Tabs items={items} value="avalanche" onValueChange={handleSelect} />);

    const snowballBtn = screen.getByRole("tab", { name: "Snowball" });
    expect(snowballBtn).toBeDefined();
    fireEvent.keyDown(snowballBtn, { key: "Enter", code: "Enter" });
    expect(handleSelect).toHaveBeenCalledWith("snowball");
  });

  it("marks a tab only when a press focuses it, and clears the mark on a key or blur", () => {
    render(<Tabs items={items} value="avalanche" onValueChange={() => {}} />);
    const tab = screen.getByRole("tab", { name: "Snowball" });
    fireEvent.pointerDown(tab);
    fireEvent.focus(tab);
    expect(tab.hasAttribute("data-pointer-focus")).toBe(true);
    fireEvent.keyDown(tab, { key: "ArrowRight" });
    expect(tab.hasAttribute("data-pointer-focus")).toBe(false);
    fireEvent.pointerDown(tab);
    fireEvent.focus(tab);
    fireEvent.blur(tab);
    expect(tab.hasAttribute("data-pointer-focus")).toBe(false);
  });

  it("keeps the keyboard ring when a press did not focus the tab (Safari, ctrl-click)", async () => {
    render(<Tabs items={items} value="avalanche" onValueChange={() => {}} />);
    const tab = screen.getByRole("tab", { name: "Snowball" });
    fireEvent.pointerDown(tab);
    expect(tab.hasAttribute("data-pointer-focus")).toBe(false);
    fireEvent.pointerUp(tab);
    await new Promise((resolve) => setTimeout(resolve, 0));
    // Later keyboard focus lands on the tab: no mark, so the ring shows.
    fireEvent.focus(tab);
    expect(tab.hasAttribute("data-pointer-focus")).toBe(false);
  });

  it("wraps the list in a scroller that cannot widen its parent", () => {
    render(<Tabs items={items} value="avalanche" onValueChange={() => {}} />);
    const scroller = screen.getByRole("tablist").parentElement as HTMLElement;
    expect(scroller.hasAttribute("data-tabs-scroller")).toBe(true);
    expect(scroller.className).toContain("ov-x_auto");
    expect(scroller.className).toContain("contain_inline-size");
    expect(scroller.className).toContain("max-w_100%");
  });

  it("scrolls the selected tab into view sideways only", () => {
    const scroller = document.createElement("div");
    scroller.innerHTML =
      '<button role="tab" data-state="inactive"></button><button role="tab" data-state="active"></button>';
    const active = scroller.lastElementChild as HTMLElement;
    const rect = (left: number, right: number) => ({ left, right }) as DOMRect;
    scroller.getBoundingClientRect = () => rect(0, 300);
    active.getBoundingClientRect = () => rect(280, 400);
    scrollSelectedTabIntoView(scroller);
    expect(scroller.scrollLeft).toBe(100);
    scroller.scrollLeft = 200;
    active.getBoundingClientRect = () => rect(-50, 70);
    scrollSelectedTabIntoView(scroller);
    expect(scroller.scrollLeft).toBe(150);
    // Already visible: no change.
    active.getBoundingClientRect = () => rect(10, 120);
    scrollSelectedTabIntoView(scroller);
    expect(scroller.scrollLeft).toBe(150);
    expect(() => scrollSelectedTabIntoView(null)).not.toThrow();
  });

  it("marks the edges that hide tabs, and neither when the list fits", () => {
    const scroller = document.createElement("div");
    const size = (scrollWidth: number, clientWidth: number, scrollLeft: number) => {
      Object.defineProperty(scroller, "scrollWidth", { value: scrollWidth, configurable: true });
      Object.defineProperty(scroller, "clientWidth", { value: clientWidth, configurable: true });
      scroller.scrollLeft = scrollLeft;
      updateOverflowCue(scroller);
    };
    size(300, 300, 0);
    expect(scroller.hasAttribute("data-overflow-start")).toBe(false);
    expect(scroller.hasAttribute("data-overflow-end")).toBe(false);
    size(500, 300, 0);
    expect(scroller.hasAttribute("data-overflow-start")).toBe(false);
    expect(scroller.hasAttribute("data-overflow-end")).toBe(true);
    size(500, 300, 100);
    expect(scroller.hasAttribute("data-overflow-start")).toBe(true);
    expect(scroller.hasAttribute("data-overflow-end")).toBe(true);
    size(500, 300, 200);
    expect(scroller.hasAttribute("data-overflow-start")).toBe(true);
    expect(scroller.hasAttribute("data-overflow-end")).toBe(false);
    expect(() => updateOverflowCue(null)).not.toThrow();
  });

  it("keeps every panel mounted and hides the inactive ones", () => {
    render(
      <Tabs
        items={items}
        panels={{ avalanche: <p>First panel</p>, snowball: <p>Second panel</p> }}
        value="snowball"
        onValueChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Second panel")).toBeDefined();
    expect(screen.queryByRole("tabpanel", { hidden: false })?.textContent).toBe("Second panel");
    expect(screen.getByText("First panel", { ignore: "" }).closest("[hidden]")).not.toBeNull();
    const tab = screen.getByRole("tab", { name: "Snowball" });
    expect(document.getElementById(tab.getAttribute("aria-controls") ?? "")).not.toBeNull();
  });

  it("names the tab list with aria-label", () => {
    render(<Tabs aria-label="Sections" items={items} value="avalanche" onValueChange={vi.fn()} />);
    expect(screen.getByRole("tablist", { name: "Sections" })).toBeDefined();
  });

  it("does not emit a dangling aria-controls when no panels are given", () => {
    render(<Tabs items={items} value="avalanche" onValueChange={vi.fn()} />);
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.hasAttribute("aria-controls")).toBe(false);
    }
  });

  it("links the active tab to a real panel via the panels prop", () => {
    render(
      <Tabs
        items={items}
        value="snowball"
        onValueChange={vi.fn()}
        panels={{ avalanche: "A", snowball: "S", minimum: "M" }}
      />,
    );
    const tab = screen.getByRole("tab", { name: "Snowball" });
    const panel = screen.getByRole("tabpanel");
    expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
    expect(panel.textContent).toBe("S");
    // Radix keeps inactive panels in the DOM (hidden, empty), so aria-controls still resolves.
    const inactive = screen.getByRole("tab", { name: "Minimum only" });
    const target = document.getElementById(inactive.getAttribute("aria-controls") ?? "");
    expect(target?.hasAttribute("hidden")).toBe(true);
  });

  it("supports Tabs.Panel children and keepMounted", () => {
    render(
      <Tabs items={items} value="avalanche" onValueChange={vi.fn()}>
        <Tabs.Panel value="avalanche">First</Tabs.Panel>
        <Tabs.Panel value="snowball" keepMounted>
          Second
        </Tabs.Panel>
      </Tabs>,
    );
    expect(screen.getByText("First")).toBeDefined();
    const hidden = screen.getByText("Second", { selector: "[role=tabpanel]" });
    expect(hidden.getAttribute("data-state")).toBe("inactive");
    expect(screen.getByRole("tab", { name: "Snowball" }).getAttribute("aria-controls")).toBe(
      hidden.id,
    );
  });

  it("selects on arrow focus by default (automatic activation)", async () => {
    const onValueChange = vi.fn();
    render(<Tabs items={items} value="avalanche" onValueChange={onValueChange} />);
    const first = screen.getByRole("tab", { name: "Avalanche" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith("snowball"));
  });

  it("only moves focus on arrow keys with activationMode manual", async () => {
    const onValueChange = vi.fn();
    render(
      <Tabs
        activationMode="manual"
        items={items}
        value="avalanche"
        onValueChange={onValueChange}
      />,
    );
    const first = screen.getByRole("tab", { name: "Avalanche" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    // Focus moves (Radix does it on a timer), selection does not.
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Snowball" })).toBe(document.activeElement),
    );
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("keeps SegmentedTabs as a deprecated alias of Tabs", () => {
    expect(SegmentedTabs).toBe(Tabs);
    expect(SegmentedTabs.Panel).toBe(Tabs.Panel);
  });

  it("applies the size variant to the list and triggers", () => {
    const { rerender } = render(
      <Tabs items={items} size="sm" value="avalanche" onValueChange={vi.fn()} />,
    );
    const smClass = screen.getByRole("tab", { name: "Avalanche" }).className;
    rerender(<Tabs items={items} value="avalanche" onValueChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: "Avalanche" }).className).not.toBe(smClass);
  });

  it("warns in development when given more than four items", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const five = ["a", "b", "c", "d", "e"].map((v) => ({ value: v, label: v.toUpperCase() }));
    render(<Tabs items={five} value="a" onValueChange={vi.fn()} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("at most 4"));
    warn.mockClear();
    render(<Tabs items={five.slice(0, 4)} value="a" onValueChange={vi.fn()} />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
  describe("panel tab stop (ARIA APG)", () => {
    const two = [
      { value: "a", label: "Controls" },
      { value: "b", label: "Text" },
    ];

    it("takes a panel with a button out of the tab order", async () => {
      render(
        <Tabs items={two} value="a" onValueChange={vi.fn()}>
          <Tabs.Panel value="a">
            <button type="button">Save</button>
          </Tabs.Panel>
        </Tabs>,
      );
      const panel = screen.getByRole("tabpanel", { name: "Controls" });
      await waitFor(() => expect(panel.hasAttribute("tabindex")).toBe(false));
      expect(panel.tabIndex).toBe(-1);
    });

    it("keeps a panel of plain text as a tab stop (tabIndex 0)", async () => {
      render(
        <Tabs items={two} value="b" onValueChange={vi.fn()}>
          <Tabs.Panel value="b">
            <p>Nothing to press here.</p>
          </Tabs.Panel>
        </Tabs>,
      );
      const panel = screen.getByRole("tabpanel", { name: "Text" });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(panel.getAttribute("tabindex")).toBe("0");
    });

    it("re-checks when the panel content changes", async () => {
      const { rerender } = render(
        <Tabs items={two} value="a" onValueChange={vi.fn()} panels={{ a: <p>Loading</p> }} />,
      );
      const panel = screen.getByRole("tabpanel", { name: "Controls" });
      expect(panel.getAttribute("tabindex")).toBe("0");
      rerender(
        <Tabs
          items={two}
          value="a"
          onValueChange={vi.fn()}
          panels={{ a: <a href="#next">Next step</a> }}
        />,
      );
      await waitFor(() => expect(panel.hasAttribute("tabindex")).toBe(false));
      rerender(<Tabs items={two} value="a" onValueChange={vi.fn()} panels={{ a: <p>Done</p> }} />);
      await waitFor(() => expect(panel.getAttribute("tabindex")).toBe("0"));
    });

    it("hasFocusableContent ignores disabled, hidden-input and negative-tabindex elements", () => {
      const host = document.createElement("div");
      host.innerHTML =
        '<button disabled>x</button><input type="hidden"><span tabindex="-1">y</span><a>no href</a>';
      expect(hasFocusableContent(host)).toBe(false);
      host.innerHTML += '<span tabindex="0">z</span>';
      expect(hasFocusableContent(host)).toBe(true);
      expect(hasFocusableContent(null)).toBe(false);
    });
  });
});
