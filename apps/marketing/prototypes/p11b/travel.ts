import { ORB_TONE_TOKEN, STOP_ORB_TONES, type StopKey } from "../p11/journeyTypes";
import type { GsapKit } from "../shared/gsapKit";

/*
 * The travelling layer's geometry and its per-frame update, kept apart from React. Everything is
 * worked out from numbers cached on refresh, so a scroll frame reads no layout: it moves the orbs
 * with transforms, shifts each stop's route with a transform and sets one dash offset per route.
 *
 * How it lines up with the stops (see p11/journeyTypes.ts): each stop section holds a sticky frame.
 * The frame arrives with natural scroll, sticks for the rest, then scrolls away as the next frame
 * arrives. Every stop has its own route group in screen space that rides with its frame (offset
 * zero during the rest), so the route is as still as the pair while it rests. The orb runs along
 * the group's path: along the outer side of the information component during the rest, then across
 * to the next stop's start while the two pairs change over.
 *
 * The track is prototype 9's bead line in 2D: small dots ahead, larger beads behind the orb, and
 * the travelled beads coloured from the stop's own colour to its accent (both sets in every stop).
 * The lead orb takes the same colours: the stop's own on arrival, the accent through the rest, the
 * next stop's colour across the changeover.
 */

export interface StopGeometry {
  /** Scroll position at which the rest starts (the pair has arrived), and its length in px. */
  restStart: number;
  rest: number;
  /** The scroll range over which the frame holds in place (arrive beat, rest, leave beat). */
  holdStart: number;
  holdEnd: number;
  /** The path's length to the end of the rest curve, and in total (with the connector). */
  restLength: number;
  totalLength: number;
  path: SVGPathElement;
  /** The mask stroke that reveals the travelled beads up to the orb. */
  drawn: SVGPathElement;
  group: SVGGElement;
  /** The stop's own colour and its accent (from the other set). */
  tones: readonly [string, string];
}

export interface Orb {
  element: HTMLElement;
  /** How far behind the lead orb it runs, in px of path. */
  lag: number;
  /** The lead orb changes colour with the journey; companions keep theirs. */
  lead?: boolean;
}

const SVG = "http://www.w3.org/2000/svg";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Offset of `el` from `ancestor` through the offsetParent chain (ignores transforms). */
function offsetWithin(el: HTMLElement, ancestor: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

/**
 * From the end of one rest to the start of the next: straight down, across in the empty band
 * between the two pairs, then down to the start. Vertical tangents keep it a calm S.
 */
const connector = (end: [number, number], next: [number, number]) => {
  const k = (next[1] - end[1]) * 0.62;
  return ` C${end[0]},${end[1] + k} ${next[0]},${next[1] - k} ${next[0]},${next[1]}`;
};

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function boxOf(el: HTMLElement, frame: HTMLElement, frameLeft: number, top: number): Box {
  const o = offsetWithin(el, frame);
  return {
    left: frameLeft + o.x,
    top: top + o.y,
    right: frameLeft + o.x + el.offsetWidth,
    bottom: top + o.y + el.offsetHeight,
  };
}

/**
 * The route for one stop, in screen px while its frame rests: the rest curve (start to end) and
 * the connector to the next stop's start, which sits one frame spacing further down.
 */
function routeFor(
  card: Box,
  panel: Box | null,
  frameBottom: number,
  side: "left" | "right",
  vw: number,
  orbR: number,
): { start: [number, number]; end: [number, number]; d: (next?: [number, number]) => string } {
  const narrow = vw < 768;
  // A free lane for the orb when there is no room beside the information component: on phones
  // the gap between the stacked pair (or the lane below them), on wider screens the lane below.
  const panelBelow = panel ? panel.top >= card.bottom : false;
  const laneTop = panelBelow ? card.bottom : Math.max(card.bottom, panel?.bottom ?? 0);
  const laneBottom = panelBelow && panel ? panel.top : frameBottom;
  const gap = laneBottom - laneTop;
  const outerRoom = side === "right" ? vw - card.right : card.left;
  const useLane = narrow || outerRoom < orbR * 2 + 32;
  if (useLane && gap >= orbR * 2 + 8) {
    const y = (laneTop + laneBottom) / 2;
    // Phones: edge to edge. Wider screens: under the information component, outer edge inwards.
    const outer = narrow
      ? side === "right"
        ? vw - orbR - 10
        : orbR + 10
      : side === "right"
        ? card.right - orbR
        : card.left + orbR;
    const inner = narrow
      ? side === "right"
        ? orbR + 10
        : vw - orbR - 10
      : side === "right"
        ? card.left + orbR
        : card.right - orbR;
    const from = outer;
    const to = inner;
    const start: [number, number] = [from, y - gap * 0.18];
    const end: [number, number] = [to, y + gap * 0.18];
    const sag = gap * 0.5;
    return {
      start,
      end,
      // Leaves and lands heading down, so it joins the connectors without a kink.
      d: (next) =>
        `M${start[0]},${start[1]} C${start[0]},${start[1] + sag} ${end[0]},${end[1] - sag} ${end[0]},${end[1]}` +
        (next ? connector(end, next) : ""),
    };
  }
  // Wider screens: along the information component's outer side, bowing gently outward.
  const outward = side === "right" ? 1 : -1;
  const edge = side === "right" ? card.right : card.left;
  const room = side === "right" ? vw - card.right : card.left;
  const inset = clamp(room * 0.42, orbR + 10, 120);
  const x = edge + outward * inset;
  const start: [number, number] = [x - outward * inset * 0.25, card.top - orbR * 0.6];
  const end: [number, number] = [x - outward * inset * 0.1, card.bottom + orbR * 0.6];
  const bow = outward * Math.min(inset * 0.55, 56);
  const mid: [number, number] = [x + bow, (start[1] + end[1]) / 2];
  const q = (mid[1] - start[1]) * 0.55;
  return {
    start,
    end,
    // Two halves meeting at the widest point; every joint is vertical, so the line never kinks.
    d: (next) =>
      `M${start[0]},${start[1]} C${start[0]},${start[1] + q} ${mid[0]},${mid[1] - q} ${mid[0]},${mid[1]}` +
      ` C${mid[0]},${mid[1] + q} ${end[0]},${end[1] - q} ${end[0]},${end[1]}` +
      (next ? connector(end, next) : ""),
  };
}

export interface TravelHandles {
  stage: HTMLElement;
  svg: SVGSVGElement;
  orbs: Orb[];
  stops: HTMLElement[];
}

/**
 * Wires the travelling layer to scroll. Returns a clean-up. All movement follows scroll; nothing
 * plays on time, so the orb rests when the reader does.
 */
export function startTravel(kit: GsapKit, journey: HTMLElement, h: TravelHandles): () => void {
  const { gsap, ScrollTrigger } = kit;
  const ease = gsap.parseEase("calmInOut");
  let geometry: StopGeometry[] = [];
  let radii: number[] = [];

  const measure = () => {
    const vw = h.stage.clientWidth;
    const vh = h.stage.clientHeight;
    h.svg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
    radii = h.orbs.map((orb) => orb.element.offsetWidth / 2);
    const orbR = radii[0] ?? 32;
    const scrollY = window.scrollY;
    const routes = h.stops.map((stop) => {
      const frame = stop.querySelector<HTMLElement>("[data-stop-frame]") ?? stop;
      const stickyTop = Number.parseFloat(getComputedStyle(frame).top) || 0;
      const stopTop = stop.getBoundingClientRect().top + scrollY;
      const frameLeft = frame.getBoundingClientRect().left;
      const card =
        frame.querySelector<HTMLElement>("[data-stop-card]") ??
        frame.querySelector<HTMLElement>(".p11-stop__visual > *") ??
        frame.querySelector<HTMLElement>("[data-stop-visual]") ??
        frame;
      const panelEl = frame.querySelector<HTMLElement>("[data-stop-panel], .p11-stop__panel");
      const side = (stop.dataset.cardSide ?? frame.dataset.cardSide) === "left" ? "left" : "right";
      const route = routeFor(
        boxOf(card, frame, frameLeft, stickyTop),
        panelEl ? boxOf(panelEl, frame, frameLeft, stickyTop) : null,
        stickyTop + frame.offsetHeight,
        side,
        vw,
        orbR,
      );
      // The frames hold in place one span apart (see p11/stops/stops.css): each starts a beat
      // above its section, arrives in that beat, rests, then leaves in the next stop's beat.
      const beat = -(Number.parseFloat(getComputedStyle(frame).marginTop) || 0);
      return { route, stopTop, stickyTop, beat };
    });
    const tops = routes.map((r) => r.stopTop);
    const lastSpan = (tops.at(-1) ?? 0) - (tops.at(-2) ?? 0) || vh * 0.5;
    const timed = routes.map((r, i) => {
      const span = (tops[i + 1] ?? r.stopTop + lastSpan) - r.stopTop;
      const restStart = r.stopTop - r.stickyTop;
      const rest = Math.max(0, span - r.beat);
      const last = i === routes.length - 1;
      return {
        route: r.route,
        restStart,
        rest,
        holdStart: restStart - r.beat,
        holdEnd: restStart + rest + (last ? 0 : r.beat),
      };
    });

    // Build each group's path: its rest curve plus the connector to the next start. While the two
    // frames change over they move as one, the next one lower by the scroll between this rest's
    // end and the next rest's start.
    while (h.svg.children.length > timed.length) h.svg.lastElementChild?.remove();
    geometry = timed.map((r, i) => {
      let group = h.svg.children[i] as SVGGElement | undefined;
      const key = (h.stops[i]?.dataset.stopKey ?? "accounts") as StopKey;
      const tones = STOP_ORB_TONES[key] ?? (["sky", "violet"] as const);
      if (!group) {
        // One group per stop: a gradient and a mask (defs), the beads ahead, the beads travelled.
        group = document.createElementNS(SVG, "g");
        group.setAttribute("class", "p11b-route");
        const id = `p11b-route-${i}`;
        const gradient = document.createElementNS(SVG, "linearGradient");
        gradient.id = `${id}-tone`;
        gradient.setAttribute("gradientUnits", "userSpaceOnUse");
        gradient.setAttribute("x1", "0");
        gradient.setAttribute("x2", "0");
        for (const [offset, tone] of [
          ["0", tones[0]],
          ["0.55", tones[1]],
          ["1", tones[1]],
        ] as const) {
          const stop = document.createElementNS(SVG, "stop");
          stop.setAttribute("offset", offset);
          stop.setAttribute("style", `stop-color: var(${ORB_TONE_TOKEN[tone]})`);
          gradient.append(stop);
        }
        const mask = document.createElementNS(SVG, "mask");
        mask.id = `${id}-mask`;
        mask.setAttribute("maskUnits", "userSpaceOnUse");
        const reveal = document.createElementNS(SVG, "path");
        reveal.setAttribute("class", "p11b-route__reveal");
        mask.append(reveal);
        const track = document.createElementNS(SVG, "path");
        track.setAttribute("class", "p11b-route__track");
        const beads = document.createElementNS(SVG, "path");
        beads.setAttribute("class", "p11b-route__drawn");
        beads.setAttribute("stroke", `url(#${id}-tone)`);
        beads.setAttribute("mask", `url(#${id}-mask)`);
        group.append(gradient, mask, track, beads);
        h.svg.append(group);
      }
      const gradient = group.children[0] as SVGLinearGradientElement;
      const reveal = group.children[1]?.firstElementChild as SVGPathElement;
      const track = group.children[2] as SVGPathElement;
      const beads = group.children[3] as SVGPathElement;
      const next = timed[i + 1];
      // The next frame holds in the same place, so the connector ends at its start as drawn.
      const nextStart: [number, number] | undefined = next ? next.route.start : undefined;
      const restOnly = r.route.d();
      track.setAttribute("d", restOnly);
      const restLength = track.getTotalLength();
      const d = r.route.d(nextStart);
      track.setAttribute("d", d);
      beads.setAttribute("d", d);
      reveal.setAttribute("d", d);
      const totalLength = track.getTotalLength();
      reveal.style.strokeDasharray = `${totalLength} ${totalLength}`;
      // The colour runs down the rest curve: own colour at its start, the accent by its end.
      const startY = r.route.start[1];
      const endY = r.route.end[1];
      gradient.setAttribute("y1", String(startY));
      gradient.setAttribute("y2", String(endY + (endY - startY) * 0.8));
      return {
        restStart: r.restStart,
        rest: r.rest,
        holdStart: r.holdStart,
        holdEnd: r.holdEnd,
        restLength,
        totalLength,
        path: track,
        drawn: reveal,
        group,
        tones,
      };
    });
  };

  /** How far the frame (and its route) is from its holding place at scroll s. */
  const offsetOf = (g: StopGeometry, s: number) =>
    s < g.holdStart ? g.holdStart - s : s > g.holdEnd ? g.holdEnd - s : 0;

  /** Distance along stop i's path for scroll s (rest curve, then the eased changeover). */
  const lengthAt = (i: number, s: number): number => {
    const g = geometry[i];
    if (!g) return 0;
    if (s <= g.restStart) return 0;
    const restEnd = g.restStart + g.rest;
    if (s <= restEnd) return g.rest > 0 ? (g.restLength * (s - g.restStart)) / g.rest : 0;
    const next = geometry[i + 1];
    if (!next) return g.restLength;
    const t = clamp((s - restEnd) / Math.max(1, next.restStart - restEnd), 0, 1);
    return g.restLength + (g.totalLength - g.restLength) * ease(t);
  };

  const render = () => {
    if (!geometry.length) return;
    const s = window.scrollY;
    // The current group: the last stop whose rest has started (or the first).
    let current = 0;
    for (let i = 0; i < geometry.length; i += 1) {
      if (s >= (geometry[i]?.restStart ?? 0)) current = i;
    }
    const held = geometry[current] as StopGeometry;
    for (let i = 0; i < geometry.length; i += 1) {
      const g = geometry[i] as StopGeometry;
      let off = offsetOf(g, s);
      let opacity = 1;
      let done = i > current ? 0 : lengthAt(i, s);
      if (i < current) {
        // The stop just left: its line stays where it met this one (it must not move while this
        // pair rests) and fades over the first part of the rest. Earlier stops are gone.
        off = offsetOf(g, held.restStart);
        done = g.totalLength;
        opacity =
          i === current - 1
            ? 1 - clamp((s - held.restStart) / Math.max(1, held.rest * 0.4), 0, 1)
            : 0;
      } else if (i > current) {
        // A stop's route appears with its pair, never ahead of it.
        opacity = 0;
      }
      g.group.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
      g.group.style.opacity = opacity.toFixed(3);
      g.group.style.visibility = opacity > 0 ? "visible" : "hidden";
      g.drawn.style.strokeDashoffset = String(g.totalLength - done);
    }
    const lead = lengthAt(current, s);
    const g = geometry[current] as StopGeometry;
    const off = offsetOf(g, s);
    // The lead orb's colour: own on arrival, the accent from mid-rest, the next stop's own once
    // the changeover is under way (a CSS transition on the colour does the blending).
    const restDone = g.rest > 0 ? (s - g.restStart) / g.rest : 0;
    const nextTones = geometry[current + 1]?.tones;
    const tone =
      restDone > 1.25 && nextTones ? nextTones[0] : restDone > 0.4 ? g.tones[1] : g.tones[0];
    h.orbs.forEach((orb, index) => {
      // Companions run behind the lead; before the path's start they wait on the previous route.
      let at = lead - orb.lag;
      let target = g;
      let targetOff = off;
      if (at < 0 && current > 0) {
        const prev = geometry[current - 1] as StopGeometry;
        at = prev.totalLength + at;
        target = prev;
        // Held where that route met this one, so the companions glide in on a still line.
        targetOff = offsetOf(prev, Math.min(s, g.restStart));
      }
      const p = target.path.getPointAtLength(clamp(at, 0, target.totalLength));
      const r = radii[index] ?? 0;
      if (orb.lead && orb.element.dataset.tone !== tone) orb.element.dataset.tone = tone;
      orb.element.style.transform = `translate3d(${(p.x - r).toFixed(1)}px, ${(p.y + targetOff - r).toFixed(1)}px, 0)`;
    });
  };

  const trigger = ScrollTrigger.create({
    trigger: journey,
    start: "top bottom",
    end: "bottom top",
    onUpdate: render,
    onRefresh: () => {
      measure();
      render();
    },
  });
  measure();
  render();
  return () => {
    trigger.kill();
    h.svg.replaceChildren();
  };
}
