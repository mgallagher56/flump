import type { CSSProperties } from "react";
import type { PieceKey } from "./heroData";

/*
 * Where the six pieces rest before the picture assembles: the hero's start state (owner,
 * 28 Nov 2026: the page opens with the pieces already apart, never assembled first). One table
 * drives both the server render, through custom properties on each piece that the CSS reads, and
 * the assembly, which starts its timeline from the same numbers, so nothing moves when the script
 * takes over.
 */

/**
 * From 1024px the pieces float in depth over the pushed-back dashboard (prototype 11): a share of
 * the stage's width and height from its centre, a depth in px and a tilt in degrees.
 */
export const SCATTER: Record<
  PieceKey,
  { x: number; y: number; z: number; rx: number; ry: number; rz: number }
> = {
  card: { x: -0.26, y: -0.29, z: 60, rx: 5, ry: -6, rz: -4 },
  payslip: { x: 0.26, y: -0.23, z: 20, rx: 3, ry: 5, rz: 3 },
  receipt: { x: -0.24, y: 0.02, z: 80, rx: -3, ry: 4, rz: -2 },
  statement: { x: 0.24, y: 0.06, z: -10, rx: 4, ry: -4, rz: 2 },
  pension: { x: -0.21, y: 0.26, z: 40, rx: -2, ry: 3, rz: 1 },
  credit: { x: 0.23, y: 0.3, z: 100, rx: 5, ry: -6, rz: 4 },
};

/**
 * Under 1024px they rest flat in a tidy tray over the "Made from" rows (prototype 11's tray): two
 * to a shelf, left or right of the stage's centre (`col`), each shelf's centre `bottom` rem above
 * the dashboard's foot, at a size that fits a cell at 360px.
 */
export const TRAY: Record<PieceKey, { col: -1 | 1; bottom: number; scale: number }> = {
  card: { col: -1, bottom: 21, scale: 0.55 },
  pension: { col: 1, bottom: 21, scale: 0.58 },
  payslip: { col: -1, bottom: 14.5, scale: 0.6 },
  receipt: { col: 1, bottom: 14.5, scale: 0.6 },
  statement: { col: -1, bottom: 8, scale: 0.5 },
  credit: { col: 1, bottom: 8, scale: 0.55 },
};

/** A tray cell's centre is a quarter of the stage from its middle, less this, in px. */
export const TRAY_INSET_PX = 7;

/** The custom properties a piece carries in the server render; `HomeHero.styles.ts` reads them. */
export function startVars(key: PieceKey): CSSProperties {
  const s = SCATTER[key];
  const t = TRAY[key];
  return {
    "--scatter-x": s.x,
    "--scatter-y": s.y,
    "--scatter-z": s.z,
    "--scatter-rx": s.rx,
    "--scatter-ry": s.ry,
    "--scatter-rz": s.rz,
    "--tray-col": t.col,
    "--tray-bottom": `${t.bottom}rem`,
    "--tray-scale": t.scale,
  } as CSSProperties;
}

/** A piece's start as GSAP values: the same place the CSS draws, for a stage of this size. */
export function startPlace(
  key: PieceKey,
  stage: { width: number; height: number },
  wide: boolean,
  remPx: number,
): gsap.TweenVars {
  if (wide) {
    const s = SCATTER[key];
    return {
      xPercent: -50,
      yPercent: -50,
      x: s.x * stage.width,
      y: s.y * stage.height,
      z: s.z,
      rotationX: s.rx,
      rotationY: s.ry,
      rotationZ: s.rz,
      scale: 1,
      opacity: 1,
    };
  }
  const t = TRAY[key];
  return {
    xPercent: -50,
    yPercent: -50,
    x: t.col * (stage.width / 4 - TRAY_INSET_PX),
    y: stage.height / 2 - t.bottom * remPx,
    z: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: t.scale,
    opacity: 1,
  };
}

/** The dashboard's start: pushed back and tilted under the floating pieces from 1024px. */
export const DASH_START_WIDE = { z: -120, rotationX: 4, y: 16, transformOrigin: "50% 40%" };

/** Wide (two columns, the pieces in depth) from 1024px, as the hero's layout. */
export const WIDE_QUERY = "(min-width: 1024px)";

/** The root font size in px, which the tray's rem offsets are measured in. */
export const remPx = () =>
  Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
