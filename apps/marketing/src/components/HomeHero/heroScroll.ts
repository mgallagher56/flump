import { marketingMs } from "@repo/ui";
import type { GsapKit } from "../../motion/loadGsapKit";
import type { PieceKey } from "./heroData";
import { DASH_START_WIDE, remPx, SCATTER, startPlace, WIDE_QUERY } from "./heroStart";

/** Arrival order and start of each flight, in timeline units; the whole run is `TOTAL` units. */
const FLIGHTS: readonly (readonly [PieceKey, number])[] = [
  ["card", 0.8],
  ["pension", 1.6],
  ["payslip", 2.4],
  ["receipt", 3.2],
  ["statement", 4.0],
  ["credit", 4.8],
];
const FLIGHT = 2.4;
export const TOTAL = 10;

/** When the receipt's "left over" figure lifts off, and how long it takes to reach its tile. */
const GHOST_LEAVES = 3.0;
const GHOST_FLIGHT = 2.0;

/** The figures, as their pieces land: breathing room with the savings, net worth last. */
const FIGURE_AT: Record<"room" | "left" | "net", number> = {
  room: 0.8 + FLIGHT,
  // As the lifted figure reaches its tile.
  left: GHOST_LEAVES + 1.9,
  net: 4.8 + FLIGHT + 0.1,
};

/** The lock: one sweep of light across the finished frame, once the last piece has landed. */
const GLINT_AT = 7.7;

/**
 * Prototype 11's timings are its calm values times its pace (1.4); the marketing tokens are the
 * same values times 1.4, so each is a share of `durations.marketing.hero` (3,400 x 1.4 = 4,760 ms).
 */
const heroShare = (calmMs: number) => (marketingMs("hero") * calmMs) / 3400 / 1000;
/** The pause before the picture first parts. */
export const INTRO_DELAY_S = heroShare(500);
/** How far behind the scroll the picture follows (the soft lag). */
export const FOLLOW_S = heroShare(1000);
/** Stacked: assembling once triggered, and parting again when scrolled back above the line. */
export const ASSEMBLE_S = heroShare(2400);
export const PART_S = heroShare(1600);

/**
 * The pinned run's length: prototype 11's hero pin (1.4 screens) at 0.4, scaled once by its pace
 * of 1.4 (`pace.px` multiplies by the pace factor, which already holds the page's 1.4 scale).
 */
export const PIN_SCREENS = 1.4 * 0.4 * 1.4;

const centre = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
const one = (root: HTMLElement, attr: string, key: string) =>
  root.querySelector<HTMLElement>(`[${attr}="${key}"]`);
const header = () => document.querySelector("header")?.offsetHeight ?? 0;

/**
 * The hero's assembly as prototype 11 has it, tied to scroll.
 *
 * From 1024px the hero's two columns pin under the header for a short run of scroll, and the
 * picture follows the scroll with a soft lag: the six pieces float apart, then fly one by one into
 * the dashboard's "Made from" rows and its three figures arrive. As the receipt leaves, its "left
 * over" figure lifts off and lands on the tile's figure (Flip.fit), and once all have landed one
 * sweep of light crosses the dashboard. The page opens with the pieces already apart (the server
 * render draws the start state from `heroStart.ts`; owner, 28 Nov 2026), and the timeline starts
 * from exactly that state, so nothing jumps when this takes over.
 *
 * Under 1024px nothing is pinned or scrubbed: the pieces rest in a tidy tray over the rows; once the
 * stage's top rises past 60% of the screen they assemble and finish in their own time, and parting
 * plays back if the reader scrolls above that line again. Wherever the reader stops, every piece is
 * in the tray or docked, never part-way.
 *
 * Reduced motion and no JavaScript never run this: they show the finished, still picture. A width
 * change rebuilds from the start state. Returns a clean-up that hands the hero back to the CSS.
 */
/**
 * Where to scroll once the pin is added, so a reader already below the hero keeps their place: on
 * a slow device the hero can set up after the reader has scrolled on, and the pin's run is then
 * added above them. Null when the reader is above the hero's end, or the hero did not grow.
 */
export function placeAfterPin(scrollY: number, endBefore: number, endAfter: number): number | null {
  const grown = endAfter - endBefore;
  return scrollY >= endBefore && grown > 0 ? scrollY + grown : null;
}

export function armHeroScroll(kit: GsapKit, root: HTMLElement): () => void {
  const { gsap, ScrollTrigger, Flip } = kit;
  let ctx: gsap.Context | null = null;
  let intro: gsap.core.Tween | null = null;
  let removePointer: (() => void) | undefined;

  const build = () => {
    const stage = root.querySelector<HTMLElement>("[data-hero-stage]");
    const dash = root.querySelector<HTMLElement>("[data-hero-dash]");
    const layer = root.querySelector<HTMLElement>("[data-hero-layer]");
    if (!stage || !dash || !layer) return;
    const wide = window.matchMedia(WIDE_QUERY).matches;

    // The server render's start state (the pieces apart, drawn by CSS) steps aside: from here GSAP
    // draws it from the same numbers, so the rects below are read with nothing transformed.
    // Nothing paints in between.
    root.dataset.heroReady = "true";

    // 1. Read: every rect, before anything is written.
    const s = stage.getBoundingClientRect();
    const rem = remPx();
    const measured = FLIGHTS.map(([k]) => {
      const piece = one(root, "data-hero-piece", k);
      const glyph = one(root, "data-hero-glyph", k);
      const row = one(root, "data-hero-row", k);
      if (!piece || !glyph || !row) return null;
      const pr = piece.getBoundingClientRect();
      const gr = glyph.getBoundingClientRect();
      // A piece's top-left sits on the stage's centre until it is centred with xPercent and
      // yPercent, so its centre will be (pr.left, pr.top): offsets are measured from there.
      const dock = {
        x: centre(gr).x - pr.left,
        y: centre(gr).y - pr.top,
        scale: pr.width > 0 ? gr.width / pr.width : 1,
      };
      return {
        k,
        piece,
        pr,
        row,
        bar: row.querySelector<HTMLElement>("[data-hero-bar]"),
        dock,
        // Where it rests before it flies: in depth from 1024px, in the tray under it.
        start: startPlace(k, s, wide, rem),
      };
    });

    // The receipt's "left over" figure: where it starts (over the receipt, wherever the receipt
    // rests) and its landing, fitted to the tile's figure while the dashboard is still flat. The
    // ghost's top-left sits on the stage's centre, like a piece's, so it is centred by its size.
    const ghost = root.querySelector<HTMLElement>("[data-hero-ghost]");
    const from = root.querySelector<HTMLElement>('[data-hero-from="left"]');
    const leftValue = one(root, "data-hero-value", "left");
    const receipt = measured.find((m) => m?.k === "receipt");
    let lift: { x: number; y: number; scale: number; fit: gsap.TweenVars } | null = null;
    if (ghost && from && leftValue && receipt) {
      const gr = ghost.getBoundingClientRect();
      const fc = centre(from.getBoundingClientRect());
      const rc = centre(receipt.pr);
      const scale = Number(receipt.start.scale ?? 1);
      const at = { x: Number(receipt.start.x ?? 0), y: Number(receipt.start.y ?? 0) };
      lift = {
        x: at.x + (fc.x - rc.x) * scale - gr.width / 2,
        y: at.y + (fc.y - rc.y) * scale - gr.height / 2,
        scale,
        fit: Flip.fit(ghost, leftValue, { getVars: true, scale: true }) as gsap.TweenVars,
      };
    }
    const glint = root.querySelector<HTMLElement>("[data-hero-glint]");

    // 2. Write: the start state, the same as the server render's, then the run. The run's timeline
    // is made inside the context, so a teardown (unmount or a width change) reverts and kills it
    // with everything else.
    ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: "calm" } });
      root.dataset.heroLive = "true";
      for (const m of measured) if (m) gsap.set(m.piece, m.start);
      gsap.set(dash, wide ? DASH_START_WIDE : { y: 0, transformOrigin: "50% 40%" });
      gsap.set(root.querySelectorAll("[data-hero-value]"), { opacity: 0, y: 10 });
      gsap.set(root.querySelectorAll("[data-hero-slot]"), { opacity: 1 });
      gsap.set(root.querySelectorAll("[data-hero-row]"), { opacity: 0 });
      gsap.set(root.querySelectorAll("[data-hero-bar]"), { scaleY: 0 });
      if (ghost && lift) {
        gsap.set(ghost, {
          x: lift.x,
          y: lift.y,
          z: wide ? SCATTER.receipt.z + 2 : 2,
          scale: lift.scale,
          opacity: 0,
        });
      }
      if (glint) gsap.set(glint, { xPercent: -120, opacity: 0 });

      tl.to(dash, { z: 0, rotationX: 0, y: 0, duration: 3.4, ease: "calmInOut" }, 0.1);
      if (wide) {
        // Everything drifts a little nearer before anything leaves.
        tl.to(
          measured.flatMap((m) => (m?.piece.firstElementChild ? [m.piece.firstElementChild] : [])),
          { y: -8, rotationZ: (i: number) => (i % 2 ? 1.5 : -1.5), duration: 1.4 },
          0,
        );
      }
      for (const [index, [, start]] of FLIGHTS.entries()) {
        const m = measured[index];
        if (!m) continue;
        const peak = wide ? SCATTER[m.k].z + 50 : 40;
        tl.to(
          m.piece,
          { x: m.dock.x, y: m.dock.y, rotationX: 0, rotationY: 0, rotationZ: 0, duration: FLIGHT },
          start,
        )
          .to(m.piece, { scale: m.dock.scale, duration: FLIGHT, ease: "calmInOut" }, start)
          .to(m.piece, { z: peak, duration: FLIGHT * 0.36 }, start)
          .to(m.piece, { z: 0, duration: FLIGHT * 0.64, ease: "calmInOut" }, start + FLIGHT * 0.36)
          .to(m.piece, { opacity: 0, duration: 0.3, ease: "none" }, start + FLIGHT - 0.22)
          .to(m.row, { opacity: 1, duration: 0.4, ease: "none" }, start + FLIGHT - 0.32);
        if (m.bar) tl.to(m.bar, { scaleY: 1, duration: 0.5 }, start + FLIGHT - 0.2);
      }
      for (const [key, at] of Object.entries(FIGURE_AT)) {
        const slot = one(root, "data-hero-slot", key);
        const value = one(root, "data-hero-value", key);
        if (slot) tl.to(slot, { opacity: 0, duration: 0.3, ease: "none" }, at);
        if (value) tl.to(value, { opacity: 1, y: 0, duration: 0.6 }, at + 0.05);
      }
      // The receipt's figure lifts off as the receipt leaves and becomes the tile's figure.
      if (ghost && lift) {
        const fitScale = Number(lift.fit.scaleY ?? 1);
        tl.to(ghost, { opacity: 1, duration: 0.25, ease: "none" }, GHOST_LEAVES)
          .to(
            ghost,
            {
              x: lift.fit.x,
              y: lift.fit.y,
              z: 0,
              scaleX: fitScale,
              scaleY: fitScale,
              duration: GHOST_FLIGHT,
            },
            GHOST_LEAVES,
          )
          .to(ghost, { opacity: 0, duration: 0.25, ease: "none" }, GHOST_LEAVES + 1.95);
      }
      if (glint) {
        tl.to(glint, { opacity: 1, duration: 0.3, ease: "none" }, GLINT_AT)
          .to(glint, { xPercent: 120, duration: 1.6, ease: "calmInOut" }, GLINT_AT)
          .to(glint, { opacity: 0, duration: 0.3 }, GLINT_AT + 1.3);
      }
      tl.to({}, { duration: 0.01 }, TOTAL - 0.01);

      // Light and tilt follow a mouse while the picture is apart, and calm as it assembles.
      const tiltX = gsap.quickTo(layer, "rotationX", { duration: FOLLOW_S, ease: "calm" });
      const tiltY = gsap.quickTo(layer, "rotationY", { duration: FOLLOW_S, ease: "calm" });
      const hover = window.matchMedia("(hover: hover)").matches;
      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || !hover) return;
        const r = stage.getBoundingClientRect();
        const px = gsap.utils.clamp(0, 1, (event.clientX - r.left) / r.width);
        const py = gsap.utils.clamp(0, 1, (event.clientY - r.top) / r.height);
        const calm = 1 - tl.progress();
        tiltY((px - 0.5) * 8 * calm);
        tiltX(-(py - 0.5) * 6 * calm);
      };
      root.addEventListener("pointermove", onMove);
      removePointer = () => root.removeEventListener("pointermove", onMove);

      if (!wide) {
        const travel = (to: 0 | 1) =>
          gsap.to(tl, {
            progress: to,
            duration: to === 1 ? ASSEMBLE_S : PART_S,
            ease: "calmInOut",
            overwrite: true,
          });
        // The page opens in the tray (the server render). A stage already past the line when the
        // page loads (a phone, where the dashboard starts high) never crosses it, so it assembles
        // after the same short pause, once the trigger first knows where the line is.
        tl.progress(0);
        let placed = false;
        ScrollTrigger.create({
          trigger: stage,
          start: "top 60%",
          onEnter: () => travel(1),
          onLeaveBack: () => travel(0),
          onRefresh: (self) => {
            if (placed) return;
            placed = true;
            if (window.scrollY >= self.start && tl.progress() === 0) {
              intro = gsap.to(tl, {
                progress: 1,
                duration: ASSEMBLE_S,
                delay: INTRO_DELAY_S,
                ease: "calmInOut",
                overwrite: true,
              });
            }
          },
        });
        return;
      }

      const pin = root.querySelector<HTMLElement>("[data-hero-inner]") ?? stage;
      const startY = pin.getBoundingClientRect().top + window.scrollY - header();
      const run = () => PIN_SCREENS * window.innerHeight;
      const target = gsap.utils.clamp(0, 1, (window.scrollY - startY) / run());
      // The page opens apart (the server render); a reader who loads part-way down the pinned run
      // sees the picture follow on to where the scroll position says.
      tl.progress(0);
      if (target > 0) {
        intro = gsap.to(tl, {
          progress: target,
          duration: target < 1 ? marketingMs("hero") / 1000 : 0,
          delay: INTRO_DELAY_S,
          ease: "calmInOut",
        });
      }
      let following = false;
      ScrollTrigger.create({
        trigger: pin,
        pin,
        // Made after the bands below (it loads later), so it is measured first.
        refreshPriority: 1,
        start: () => `top top+=${header()}`,
        end: () => `+=${run()}`,
        onUpdate: (self) => {
          if (!following && Math.abs(self.progress - target) < 0.002) return;
          following = true;
          gsap.to(tl, {
            progress: self.progress,
            duration: FOLLOW_S,
            ease: "calm",
            overwrite: true,
          });
        },
      });
    }, root);
  };

  const teardown = () => {
    intro?.kill();
    intro = null;
    removePointer?.();
    removePointer = undefined;
    ctx?.revert();
    ctx = null;
  };

  const heroEnd = () => root.getBoundingClientRect().bottom + window.scrollY;
  const readerY = window.scrollY;
  const endBefore = heroEnd();
  build();
  // The pin adds length above every band below, so their triggers measure again.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  const place = placeAfterPin(readerY, endBefore, heroEnd());
  if (place !== null) window.scrollTo({ top: place, behavior: "auto" });

  let lastWidth = window.innerWidth;
  let timer = 0;
  const onResize = () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      teardown();
      build();
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    }, 200);
  };
  window.addEventListener("resize", onResize);

  return () => {
    window.removeEventListener("resize", onResize);
    window.clearTimeout(timer);
    teardown();
    delete root.dataset.heroLive;
    delete root.dataset.heroReady;
  };
}
