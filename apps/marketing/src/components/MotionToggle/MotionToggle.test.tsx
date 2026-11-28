import { REDUCE_MOTION_ATTRIBUTE, usePrefersReducedMotion } from "@repo/ui";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MOTION_ATTRIBUTE,
  MOTION_INIT_SCRIPT,
  MOTION_STORAGE_KEY,
} from "../../motion/motionScript";
import { MotionToggle } from "./MotionToggle";

const root = document.documentElement;

/** A `matchMedia` whose reduced-motion query answers `reduce`. */
const stubSystem = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query === "(prefers-reduced-motion: reduce)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

beforeEach(() => stubSystem(false));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  root.removeAttribute(MOTION_ATTRIBUTE);
  localStorage.clear();
});

describe("MotionToggle", () => {
  it("is a button named Reduce motion, off, with the same words as its tooltip", () => {
    render(<MotionToggle />);
    const button = screen.getByRole("button", { name: "Reduce motion" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("title")).toBe("Reduce motion");
    expect(button.hasAttribute("aria-disabled")).toBe(false);
  });

  it("pressed, sets data-motion=reduce on <html> and remembers it; pressed again, clears both", async () => {
    render(<MotionToggle />);
    const button = screen.getByRole("button", { name: "Reduce motion" });
    await act(async () => fireEvent.click(button));
    expect(root.getAttribute("data-motion")).toBe("reduce");
    expect(localStorage.getItem("flump-motion")).toBe("reduce");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    await act(async () => fireEvent.click(button));
    expect(root.hasAttribute("data-motion")).toBe(false);
    expect(localStorage.getItem("flump-motion")).toBeNull();
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("with storage blocked still reduces motion on this page", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<MotionToggle />);
    const button = screen.getByRole("button", { name: "Reduce motion" });
    await act(async () => fireEvent.click(button));
    expect(root.getAttribute("data-motion")).toBe("reduce");
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("shows on when the page opened with the choice already applied (by the head script)", () => {
    root.setAttribute("data-motion", "reduce");
    render(<MotionToggle />);
    expect(screen.getByRole("button", { name: "Reduce motion" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("with the system set to reduce: on, disabled with a note why, and pressing changes nothing", async () => {
    stubSystem(true);
    render(<MotionToggle />);
    const button = screen.getByRole("button", { name: "Reduce motion" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    const note = document.getElementById(button.getAttribute("aria-describedby") ?? "");
    expect(note?.textContent).toBe("On in your device settings");
    expect(button.contains(note)).toBe(false);
    await act(async () => fireEvent.click(button));
    expect(root.hasAttribute("data-motion")).toBe(false);
    expect(localStorage.getItem("flump-motion")).toBeNull();
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("the one reduced-motion state", () => {
  it("usePrefersReducedMotion follows the toggle's attribute live, as it does the system", async () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    // The MutationObserver reports after the current task.
    await act(async () => root.setAttribute(REDUCE_MOTION_ATTRIBUTE, "reduce"));
    expect(result.current).toBe(true);
    await act(async () => root.removeAttribute(REDUCE_MOTION_ATTRIBUTE));
    expect(result.current).toBe(false);
  });

  it("the head script and the hook use the same attribute", () => {
    expect(MOTION_ATTRIBUTE).toBe(REDUCE_MOTION_ATTRIBUTE);
  });
});

describe("MOTION_INIT_SCRIPT", () => {
  const run = () => new Function(MOTION_INIT_SCRIPT)();

  it("applies a stored choice to <html> before first paint", () => {
    localStorage.setItem(MOTION_STORAGE_KEY, "reduce");
    run();
    expect(root.getAttribute("data-motion")).toBe("reduce");
  });

  it("leaves <html> alone with no stored choice, or any other value", () => {
    run();
    expect(root.hasAttribute("data-motion")).toBe(false);
    localStorage.setItem(MOTION_STORAGE_KEY, "on");
    run();
    expect(root.hasAttribute("data-motion")).toBe(false);
  });

  it("never throws when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(run).not.toThrow();
    expect(root.hasAttribute("data-motion")).toBe(false);
  });
});
