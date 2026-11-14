import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendingReveal } from "./PendingReveal";

const setReducedMotion = (reduce: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
};

const view = (pending: boolean) => (
  <PendingReveal fallback={<span>placeholder</span>} pending={pending}>
    <span>content</span>
  </PendingReveal>
);

const state = () =>
  document.querySelector("[data-pending-state]")?.getAttribute("data-pending-state");

describe("PendingReveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setReducedMotion(false);
  });
  afterEach(() => vi.useRealTimers());

  it("never shows the placeholder when the load ends before the delay", () => {
    const { rerender } = render(view(true));
    // Held: laid out (space kept) but invisible.
    expect(state()).toBe("held");
    act(() => vi.advanceTimersByTime(150));
    expect(state()).toBe("held");
    rerender(view(false));
    expect(screen.getByText("content")).toBeTruthy();
    expect(state()).toBe("ready");
    act(() => vi.advanceTimersByTime(1000));
    expect(state()).toBe("ready");
  });

  it("keeps a shown placeholder for the minimum, then fades the content in", () => {
    const { rerender } = render(view(true));
    act(() => vi.advanceTimersByTime(200));
    expect(state()).toBe("shown");
    // The load ends 50ms after the placeholder appeared: it stays for the 400ms minimum.
    act(() => vi.advanceTimersByTime(50));
    rerender(view(false));
    expect(screen.getByText("placeholder")).toBeTruthy();
    act(() => vi.advanceTimersByTime(300));
    expect(state()).toBe("shown");
    act(() => vi.advanceTimersByTime(60));
    expect(screen.getByText("content")).toBeTruthy();
    expect(state()).toBe("reveal");
  });

  it("swaps without a fade under reduced motion", () => {
    setReducedMotion(true);
    const { rerender } = render(view(true));
    act(() => vi.advanceTimersByTime(700));
    rerender(view(false));
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText("content")).toBeTruthy();
    expect(state()).toBe("ready");
  });

  it("marks the placeholder busy", () => {
    render(view(true));
    expect(screen.getByTestId("pending-reveal-fallback").getAttribute("aria-busy")).toBe("true");
  });
});
