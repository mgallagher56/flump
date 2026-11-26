import {
  balanceOf,
  PICTURE,
  SAMPLE_ACCOUNTS,
  SAMPLE_BUDGET,
  SAMPLE_SALARY,
} from "../shared/sampleData";

/*
 * The orb's shapes, as pure data: no three.js, so the server-rendered still (an SVG drawn from the
 * same beads) and the 3D scene can never disagree. Every shape is the same BEAD_COUNT glass beads;
 * a bead a shape does not need has radius 0 and hides inside a bead that is showing, so a morph
 * reads as beads splitting out of, or folding back into, the ones you can see.
 *
 * Units: the shape box is 3.6 wide and 2.8 tall, centred on 0, y up.
 */

export const BEAD_COUNT = 24;
export const BOX = { width: 3.6, height: 2.8 } as const;

export interface Bead {
  x: number;
  y: number;
  z: number;
  r: number;
  /** Horizontal and vertical stretch (the logo is a little wider than tall). */
  sx: number;
  sy: number;
}

export type ShapeKey = "hero" | "accounts" | "budget" | "pay" | "savings" | "debt" | "logo";

export interface Shape {
  beads: Bead[];
  /** How dark the soft contact shadow under bead 0 is (only the single orbs have one). */
  shadow: number;
  /** 0 is clear glass, 1 is the logo's glossy teal body. */
  solid: number;
}

const bead = (x: number, y: number, r: number, z = 0, sx = 1, sy = 1): Bead => ({
  x,
  y,
  z,
  r,
  sx,
  sy,
});

/** Beads a shape does not use hide inside the visible bead nearest to them. */
function fill(visible: Bead[]): Bead[] {
  const beads = [...visible];
  for (let i = visible.length; i < BEAD_COUNT; i += 1) {
    const host = visible[i % visible.length] ?? bead(0, 0, 0);
    beads.push({ ...host, r: 0 });
  }
  return beads;
}

/** One orb, a touch below centre so its shadow fits. */
const hero: Shape = { beads: fill([bead(0, 0.1, 1.05)]), shadow: 0.55, solid: 0 };

/** Six bubbles, area sized by balance, packed by a few hundred steps of push apart, pull in. */
const ACCOUNT_ORDER = [
  SAMPLE_ACCOUNTS.home,
  SAMPLE_ACCOUNTS.mortgage,
  SAMPLE_ACCOUNTS.pension,
  SAMPLE_ACCOUNTS.savings,
  SAMPLE_ACCOUNTS.loan,
  SAMPLE_ACCOUNTS.creditCard,
];

function packAccounts(): Bead[] {
  const largest = Math.max(...ACCOUNT_ORDER.map(balanceOf));
  const radii = ACCOUNT_ORDER.map((a) => Math.max(0.15, 0.92 * Math.sqrt(balanceOf(a) / largest)));
  const pts = radii.map((r, i) => {
    const angle = i * 2.4;
    const d = i === 0 ? 0 : 0.6 + i * 0.15;
    return { x: Math.cos(angle) * d, y: Math.sin(angle) * d, r };
  });
  for (let step = 0; step < 400; step += 1) {
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i];
      if (!a) continue;
      for (let j = i + 1; j < pts.length; j += 1) {
        const b = pts[j];
        if (!b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const min = a.r + b.r + 0.06;
        if (dist < min) {
          const push = (min - dist) / 2;
          a.x -= (dx / dist) * push;
          a.y -= (dy / dist) * push;
          b.x += (dx / dist) * push;
          b.y += (dy / dist) * push;
        }
      }
      // A gentle pull to the middle, wider than tall to suit the box.
      a.x *= 0.995;
      a.y *= 0.985;
    }
  }
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  // Fit the cluster inside the box, with room for the perspective of the nearer bubbles.
  const halfW = Math.max(...pts.map((p) => Math.abs(p.x - cx) + p.r));
  const halfH = Math.max(...pts.map((p) => Math.abs(p.y - cy) + p.r));
  const k = Math.min((BOX.width * 0.42) / halfW, (BOX.height * 0.42) / halfH);
  return pts.map((p, i) => bead((p.x - cx) * k, (p.y - cy) * k, p.r * k, (i % 3) * 0.08 - 0.08));
}

const accounts: Shape = { beads: fill(packAccounts()), shadow: 0, solid: 0 };

/**
 * Budget: the month's income as a ring of beads, one group per outgoing (sized by amount), with
 * the gap at the top the money left over.
 */
function budgetRing(): Bead[] {
  const ringBeads = 20;
  const outgoingBeads = Math.round(ringBeads * (SAMPLE_BUDGET.goesOut / SAMPLE_BUDGET.comesIn));
  const counts = SAMPLE_BUDGET.outgoings.map((o) =>
    Math.max(1, Math.round((o.amount / SAMPLE_BUDGET.goesOut) * outgoingBeads)),
  );
  const step = (Math.PI * 2) / ringBeads;
  const groupGap = step * 0.35;
  const used = counts.reduce((s, c) => s + c, 0);
  const sweep = used * step + (counts.length - 1) * groupGap;
  // The left over gap sits at the top, centred.
  let angle = Math.PI / 2 - (Math.PI * 2 - sweep) / 2 - step / 2;
  const beads: Bead[] = [];
  counts.forEach((count) => {
    for (let k = 0; k < count; k += 1) {
      beads.push(bead(Math.cos(angle) * 1.05, Math.sin(angle) * 1.05 - 0.05, 0.15));
      angle -= step;
    }
    angle -= groupGap;
  });
  return beads;
}

const budget: Shape = { beads: fill(budgetRing()), shadow: 0, solid: 0 };

/** Pay: a stack for the salary beside a shorter stack for take-home pay, one bead per £5,000. */
function payStacks(): Bead[] {
  const takeHome = PICTURE.takeHome.status === "known" ? PICTURE.takeHome.value.annual : 0;
  const per = 5000;
  const gross = Math.round((SAMPLE_SALARY ?? 0) / per);
  const kept = Math.round(takeHome / per);
  const pitch = 0.2;
  const r = 0.088;
  const base = -((Math.max(gross, kept) - 1) * pitch) / 2;
  const beads: Bead[] = [];
  for (let i = 0; i < gross; i += 1) beads.push(bead(-0.42, base + i * pitch, r));
  for (let i = 0; i < kept; i += 1) beads.push(bead(0.42, base + i * pitch, r));
  return beads;
}

const pay: Shape = { beads: fill(payStacks()), shadow: 0, solid: 0 };

/** Beads spaced evenly along a curve y(u), u from 0 to 1, by arc length. */
function alongCurve(count: number, y: (u: number) => number, r: number, endR: number): Bead[] {
  const samples = 200;
  const pts: { x: number; y: number; s: number }[] = [];
  let s = 0;
  for (let i = 0; i <= samples; i += 1) {
    const u = i / samples;
    const p = { x: -1.5 + u * 3, y: y(u), s: 0 };
    const prev = pts[i - 1];
    if (prev) s += Math.hypot(p.x - prev.x, p.y - prev.y);
    p.s = s;
    pts.push(p);
  }
  const beads: Bead[] = [];
  let cursor = 0;
  for (let k = 0; k < count; k += 1) {
    const target = (k / (count - 1)) * s;
    while (cursor < pts.length - 1 && (pts[cursor]?.s ?? 0) < target) cursor += 1;
    const p = pts[cursor] ?? { x: 0, y: 0 };
    beads.push(bead(p.x, p.y, k === count - 1 ? endR : r));
  }
  return beads;
}

const grow = (k: number) => (u: number) => (Math.exp(k * u) - 1) / (Math.exp(k) - 1);

/** Savings: a rising line, steepening a little as interest builds on interest. */
const savings: Shape = {
  beads: fill(alongCurve(BEAD_COUNT, (u) => -0.95 + 1.9 * grow(1.4)(u), 0.07, 0.18)),
  shadow: 0,
  solid: 0,
};

/** Debt: a line that runs down to its end on the baseline, quicker near the end. */
const debt: Shape = {
  beads: fill(alongCurve(BEAD_COUNT, (u) => 0.95 - 1.9 * grow(1.1)(u), 0.07, 0.15)),
  shadow: 0,
  solid: 0,
};

/** The Flump logo: one squashed, glossy orb with its soft shadow. */
const logo: Shape = {
  beads: fill([bead(0, 0.1, 0.98, 0, 1.06, 0.9)]),
  shadow: 0.85,
  solid: 1,
};

export const SHAPES: Record<ShapeKey, Shape> = {
  hero,
  accounts,
  budget,
  pay,
  savings,
  debt,
  logo,
};
