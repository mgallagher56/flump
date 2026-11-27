import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_TILT_DEG,
  TILT_LIGHT_REST,
  TILT_LIGHT_VARS,
  tiltLightAt,
  type UseTiltLightOptions,
  useTiltLight,
} from "./useTiltLight";

function mockReducedMotion(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  };
  Object.defineProperty(window, "matchMedia", { value: () => mql, configurable: true });
  return (value: boolean) => {
    matches = value;
    for (const l of [...listeners]) l();
  };
}

const box = { left: 100, top: 200, width: 200, height: 100 };

describe("tiltLightAt", () => {
  it("is flat with the light in the middle at the centre", () => {
    expect(tiltLightAt({ ...box, clientX: 200, clientY: 250 })).toEqual(TILT_LIGHT_REST);
  });

  it("tilts six degrees at the top-right corner, toward the pointer", () => {
    // px = 1, py = 0: rotateX = (0.5 - 0) * 2 * 6 = 6; rotateY = (1 - 0.5) * 2 * 6 = 6.
    expect(tiltLightAt({ ...box, clientX: 300, clientY: 200 })).toEqual({
      rotateX: 6,
      rotateY: 6,
      lightX: 100,
      lightY: 0,
    });
  });

  it("scales between: a quarter across and three quarters down", () => {
    // px = 50 / 200 = 0.25, py = 75 / 100 = 0.75: rotateX = -0.25 * 2 * 6 = -3, rotateY = -3.
    expect(tiltLightAt({ ...box, clientX: 150, clientY: 275 })).toEqual({
      rotateX: -3,
      rotateY: -3,
      lightX: 25,
      lightY: 75,
    });
  });

  it("never passes six degrees, outside the box or with a larger maximum asked for", () => {
    const far = tiltLightAt({ ...box, clientX: -500, clientY: 900 }, { maxDeg: 20 });
    expect(far).toEqual({ rotateX: -MAX_TILT_DEG, rotateY: -MAX_TILT_DEG, lightX: 0, lightY: 100 });
    expect(tiltLightAt({ ...box, clientX: 300, clientY: 200 }, { maxDeg: 3 }).rotateY).toBe(3);
  });

  it("stays flat with a still light when tilt is off, and on an empty box", () => {
    expect(tiltLightAt({ ...box, clientX: 300, clientY: 200 }, { tilt: false })).toEqual(
      TILT_LIGHT_REST,
    );
    expect(tiltLightAt({ ...box, width: 0, clientX: 300, clientY: 200 })).toEqual(TILT_LIGHT_REST);
  });
});

function Card(props: UseTiltLightOptions) {
  const ref = useTiltLight<HTMLDivElement>(props);
  return <div ref={ref} data-testid="card" />;
}

const vars = (el: HTMLElement) =>
  Object.values(TILT_LIGHT_VARS).map((name) => el.style.getPropertyValue(name));

function pointer(el: HTMLElement, type: "pointermove" | "pointerleave", init: object) {
  // happy-dom's PointerEvent keeps pointerType and the coordinates.
  fireEvent(el, new PointerEvent(type, { bubbles: true, ...init }));
}

describe("useTiltLight", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(props: UseTiltLightOptions = {}) {
    render(<Card {...props} />);
    const card = screen.getByTestId("card");
    card.getBoundingClientRect = () =>
      ({ ...box, right: 300, bottom: 300, x: 100, y: 200 }) as DOMRect;
    return card;
  }

  it("follows a mouse once per frame and returns to rest on leave", () => {
    mockReducedMotion(false);
    const card = setup();
    expect(vars(card)).toEqual(["0deg", "0deg", "50%", "50%"]);
    pointer(card, "pointermove", { pointerType: "mouse", clientX: 250, clientY: 200 });
    pointer(card, "pointermove", { pointerType: "mouse", clientX: 300, clientY: 200 });
    expect(card.dataset.tiltLight).toBe("on");
    // Nothing is written until the frame, and then only the latest pointer position.
    expect(vars(card)).toEqual(["0deg", "0deg", "50%", "50%"]);
    act(() => vi.advanceTimersByTime(16));
    expect(vars(card)).toEqual(["6deg", "6deg", "100%", "0%"]);
    pointer(card, "pointerleave", { pointerType: "mouse" });
    expect(vars(card)).toEqual(["0deg", "0deg", "50%", "50%"]);
    expect(card.dataset.tiltLight).toBe("off");
  });

  it("ignores touch and pen", () => {
    mockReducedMotion(false);
    const card = setup();
    for (const pointerType of ["touch", "pen"]) {
      pointer(card, "pointermove", { pointerType, clientX: 300, clientY: 200 });
    }
    act(() => vi.advanceTimersByTime(16));
    expect(vars(card)).toEqual(["0deg", "0deg", "50%", "50%"]);
    expect(card.dataset.tiltLight).toBeUndefined();
  });

  it("keeps only a still light with tilt off: on while hovered, never moving", () => {
    mockReducedMotion(false);
    const card = setup({ tilt: false });
    pointer(card, "pointermove", { pointerType: "mouse", clientX: 300, clientY: 200 });
    act(() => vi.advanceTimersByTime(16));
    expect(card.dataset.tiltLight).toBe("on");
    expect(vars(card)).toEqual(["0deg", "0deg", "50%", "50%"]);
  });

  it("does nothing under reduced motion, and stops at once when it turns on", () => {
    const setReduced = mockReducedMotion(true);
    const card = setup();
    pointer(card, "pointermove", { pointerType: "mouse", clientX: 300, clientY: 200 });
    act(() => vi.advanceTimersByTime(16));
    expect(vars(card)).toEqual(["", "", "", ""]);
    expect(card.dataset.tiltLight).toBeUndefined();

    act(() => setReduced(false));
    pointer(card, "pointermove", { pointerType: "mouse", clientX: 300, clientY: 200 });
    act(() => vi.advanceTimersByTime(16));
    expect(vars(card)[0]).toBe("6deg");
    act(() => setReduced(true));
    expect(vars(card)).toEqual(["0deg", "0deg", "50%", "50%"]);
    expect(card.dataset.tiltLight).toBeUndefined();
  });
});
