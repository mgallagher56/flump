import { useCallback, useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/** The most a card tilts toward the pointer, in degrees (ROLLOUT-PLAN section 1, prototype 1b). */
export const MAX_TILT_DEG = 6;

/**
 * The CSS custom properties the hook writes on the element. Its styles read them, for example
 * `transform: perspective(…) rotateX(var(--tilt-rx)) rotateY(var(--tilt-ry))` and a radial light
 * at `var(--light-x) var(--light-y)`, and ease them over `durations.marketing.hover`.
 * `data-tilt-light="on"` is set while the pointer is over the element.
 */
export const TILT_LIGHT_VARS = {
  rotateX: "--tilt-rx",
  rotateY: "--tilt-ry",
  lightX: "--light-x",
  lightY: "--light-y",
} as const;

export interface TiltLight {
  /** Degrees about the horizontal axis: the top leans away when the pointer is near the top. */
  readonly rotateX: number;
  /** Degrees about the vertical axis: the right leans away when the pointer is near the right. */
  readonly rotateY: number;
  /** The light's position across the element, in per cent. */
  readonly lightX: number;
  readonly lightY: number;
}

/** At rest: flat, with the light in the middle. */
export const TILT_LIGHT_REST: TiltLight = { rotateX: 0, rotateY: 0, lightX: 50, lightY: 50 };

export interface PointerInBox {
  readonly clientX: number;
  readonly clientY: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Tilt and light for a pointer over a box. The pointer's place across the box runs from -1 to 1 on
 * each axis (clamped, so a pointer just outside never tips past the maximum), and the tilt is that
 * times `maxDeg`. With `tilt` off the box stays flat and the light stays in the middle: the still
 * light of the apps' tier A (UX-GUIDELINES 12.1).
 */
export function tiltLightAt(
  pointer: PointerInBox,
  { maxDeg = MAX_TILT_DEG, tilt = true }: { maxDeg?: number; tilt?: boolean } = {},
): TiltLight {
  if (!tilt || pointer.width <= 0 || pointer.height <= 0) return TILT_LIGHT_REST;
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const px = clamp((pointer.clientX - pointer.left) / pointer.width);
  const py = clamp((pointer.clientY - pointer.top) / pointer.height);
  const limit = Math.min(Math.abs(maxDeg), MAX_TILT_DEG);
  return {
    rotateX: round((0.5 - py) * 2 * limit),
    rotateY: round((px - 0.5) * 2 * limit),
    lightX: round(px * 100),
    lightY: round(py * 100),
  };
}

const round = (n: number) => Math.round(n * 100) / 100 + 0;

function write(element: HTMLElement, value: TiltLight) {
  element.style.setProperty(TILT_LIGHT_VARS.rotateX, `${value.rotateX}deg`);
  element.style.setProperty(TILT_LIGHT_VARS.rotateY, `${value.rotateY}deg`);
  element.style.setProperty(TILT_LIGHT_VARS.lightX, `${value.lightX}%`);
  element.style.setProperty(TILT_LIGHT_VARS.lightY, `${value.lightY}%`);
}

export interface UseTiltLightOptions {
  /**
   * False keeps only a still light on hover, with no tilt and no movement: the apps' tier A
   * (UX-GUIDELINES 12.1, AT3: never tilt a card that holds a figure). Default true.
   */
  readonly tilt?: boolean;
  /** Up to `MAX_TILT_DEG`; larger values are capped. */
  readonly maxDeg?: number;
}

/**
 * Tilt-and-light pointer hover (prototype 1b): the light follows the pointer and the card tilts
 * toward it by up to six degrees. Returns a callback ref for the card. It writes the
 * `TILT_LIGHT_VARS` custom properties at most once per frame and never re-renders on pointer moves.
 *
 * Off for touch and pen (only a mouse hovers), and entirely off under reduced motion: no listeners,
 * no attribute, the card at rest. On leave the card returns to rest; the styles ease it back.
 */
export function useTiltLight<T extends HTMLElement>(
  options: UseTiltLightOptions = {},
): (element: T | null) => void {
  const { tilt = true, maxDeg = MAX_TILT_DEG } = options;
  const reduced = usePrefersReducedMotion();
  const [element, setElement] = useState<T | null>(null);
  const ref = useCallback((node: T | null) => setElement(node), []);

  useEffect(() => {
    if (!element || reduced) return;
    let frame = 0;
    let latest: PointerEvent | null = null;
    const paint = () => {
      frame = 0;
      if (!latest) return;
      const rect = element.getBoundingClientRect();
      write(
        element,
        tiltLightAt(
          {
            clientX: latest.clientX,
            clientY: latest.clientY,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          },
          { tilt, maxDeg },
        ),
      );
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      element.dataset.tiltLight = "on";
      if (!tilt) return;
      latest = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const leave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      latest = null;
      write(element, TILT_LIGHT_REST);
      element.dataset.tiltLight = "off";
    };
    write(element, TILT_LIGHT_REST);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      leave();
      delete element.dataset.tiltLight;
    };
  }, [element, reduced, tilt, maxDeg]);

  return ref;
}
