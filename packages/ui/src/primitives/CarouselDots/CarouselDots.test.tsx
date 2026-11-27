import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CarouselStepButton } from "../CarouselStepButton";
import { CarouselDots } from "./CarouselDots";
import {
  carouselDotButtonRecipe,
  carouselDotRecipe,
  carouselDotsGroupRecipe,
} from "./CarouselDots.styles";

const ITEMS = ["Accounts", "Budget", "Net worth", "Check-in", "Goals", "Self Assessment"];

const renderDots = (current = 2, onSelect = vi.fn(), controls?: string) =>
  render(
    <CarouselDots
      controls={controls}
      current={current}
      itemLabels={ITEMS}
      label="Features"
      onSelect={onSelect}
    />,
  );

describe("CarouselDots", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders one named button per item in a labelled group", () => {
    renderDots();
    const group = screen.getByRole("group", { name: "Features" });
    const buttons = within(group).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(ITEMS);
    for (const button of buttons) expect(button.getAttribute("type")).toBe("button");
    expect(screen.getByRole("button", { name: "Net worth" })).toBe(buttons[2]);
  });

  it("marks exactly the current dot with aria-current", () => {
    renderDots(2);
    const current = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-current") === "true");
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toBe("Net worth");
    expect(screen.getByRole("button", { name: "Budget" }).hasAttribute("aria-current")).toBe(false);
  });

  it("calls onSelect with the chosen index, and aria-current follows the new current", () => {
    const onSelect = vi.fn();
    const { rerender } = renderDots(2, onSelect);
    fireEvent.click(screen.getByRole("button", { name: "Goals" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(4);
    rerender(<CarouselDots current={4} itemLabels={ITEMS} label="Features" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "Goals" }).getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("button", { name: "Net worth" }).hasAttribute("aria-current")).toBe(
      false,
    );
  });

  it("points every dot at the region it controls, and leaves aria-controls off without one", () => {
    const { unmount } = renderDots(0, vi.fn(), "feature-slides");
    for (const b of screen.getAllByRole("button")) {
      expect(b.getAttribute("aria-controls")).toBe("feature-slides");
    }
    unmount();
    renderDots(0);
    for (const b of screen.getAllByRole("button"))
      expect(b.hasAttribute("aria-controls")).toBe(false);
  });

  it("announces nothing on first render and the new item after a change", () => {
    const { rerender } = renderDots(2);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("status").textContent).toBe("");
    rerender(<CarouselDots current={3} itemLabels={ITEMS} label="Features" onSelect={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("status").textContent).toBe("Showing Check-in");
  });

  it("never renders a count such as 4 to 5 of 6", () => {
    const { container, rerender } = renderDots(2);
    rerender(<CarouselDots current={5} itemLabels={ITEMS} label="Features" onSelect={vi.fn()} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.textContent).toContain("Showing Self Assessment");
    expect(container.textContent).not.toMatch(/\d+ (to|of) \d+/);
    for (const el of container.querySelectorAll("[aria-label]")) {
      expect(el.getAttribute("aria-label")).not.toMatch(/\d+ (to|of) \d+/);
    }
  });

  it("pairs id and data-testid on the root, and leaves both off without an id", () => {
    const { container, unmount } = render(
      <CarouselDots
        id="features-dots"
        current={0}
        itemLabels={ITEMS}
        label="Features"
        onSelect={vi.fn()}
      />,
    );
    const root = container.firstElementChild;
    expect(root?.getAttribute("id")).toBe("features-dots");
    expect(root?.getAttribute("data-testid")).toBe("features-dots");
    unmount();
    const again = renderDots(0).container.firstElementChild;
    expect(again?.hasAttribute("id")).toBe(false);
    expect(again?.hasAttribute("data-testid")).toBe(false);
  });

  it("keeps the dots on one row with 24px targets that do not grow on touch", () => {
    expect(carouselDotsGroupRecipe.raw().flexWrap).toBe("nowrap");
    const button = carouselDotButtonRecipe.raw() as Record<string, unknown>;
    expect(button["@media (pointer: coarse)"]).toBeUndefined();
  });

  it("gives every dot at least a 24px target and the current dot a different shape", () => {
    const button = carouselDotButtonRecipe.raw() as Record<string, unknown>;
    expect(button.minWidth).toBe("24px");
    expect(button.minHeight).toBe("24px");
    const rest = carouselDotRecipe.raw({ current: false }) as Record<string, unknown>;
    const current = carouselDotRecipe.raw({ current: true }) as Record<string, unknown>;
    expect(current.width).not.toBe(rest.width);
    expect(current.backgroundColor).toBe("chart.primary");
    expect(rest.backgroundColor).toBe("transparent");
  });
});

describe("Carousel keyboard order", () => {
  it("puts previous, every dot, then next in the Tab order with no tabindex tricks", () => {
    const { container } = render(
      <div>
        <CarouselStepButton direction="previous" disabled />
        <CarouselDots current={0} itemLabels={ITEMS} label="Features" onSelect={vi.fn()} />
        <CarouselStepButton direction="next" targetLabel="Budget" />
      </div>,
    );
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>("button, [href], input, [tabindex]"),
    ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex >= 0);
    expect(focusable.map((el) => el.textContent)).toEqual(["Previous", ...ITEMS, "Next: Budget"]);
    expect(container.querySelector("[tabindex]")).toBeNull();
    // Each one takes focus in turn.
    for (const el of focusable) {
      el.focus();
      expect(document.activeElement).toBe(el);
    }
  });
});
