import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveRegion } from "./LiveRegion";

describe("LiveRegion Primitive", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders a status region that is empty on first render", () => {
    render(<LiveRegion message="Hello" />);
    const region = screen.getByRole("status");
    expect(region.textContent).toBe("");
    expect(region.getAttribute("aria-atomic")).toBe("true");
  });

  it("does not announce the initial message on mount", () => {
    render(<LiveRegion message="Hello" />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("announces a later change after the debounce", () => {
    const { rerender } = render(<LiveRegion message="Hello" />);
    rerender(<LiveRegion message="Updated" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("status").textContent).toBe("Updated");
  });

  it("debounces updates without an intermediate message", () => {
    const { rerender } = render(<LiveRegion message="" />);
    rerender(<LiveRegion message="A" />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole("status").textContent).toBe("");
    rerender(<LiveRegion message="B" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("status").textContent).toBe("B");
  });

  it("assertive uses the alert role", () => {
    render(<LiveRegion message="Oops" politeness="assertive" />);
    expect(screen.getByRole("alert")).toBeDefined();
  });

  it("does not re-announce an identical message", () => {
    const { rerender } = render(<LiveRegion message="First" />);
    rerender(<LiveRegion message="Same" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const node = screen.getByRole("status").firstChild;
    rerender(<LiveRegion message="Same" />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("status").textContent).toBe("Same");
    expect(screen.getByRole("status").firstChild).toBe(node);
  });

  it("visuallyHidden applies the clip recipe", () => {
    render(<LiveRegion message="" visuallyHidden />);
    expect(screen.getByRole("status").className).toContain("pos_absolute");
  });
});
