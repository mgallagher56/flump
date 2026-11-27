import { marketingMs } from "@repo/ui";
import type { GsapKit } from "../../motion/loadGsapKit";
import type { PieceKey } from "./heroData";

/**
 * Where each piece floats before the picture assembles: a share of the stage's width and height
 * from its centre, a depth in px and a tilt in degrees. Hand-placed (prototype 11) so no two pieces
 * cover the same figure; the nearer pieces are the more tilted.
 */
const SCATTER: Record<
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

/*
 * The run, in units: the whole run is `TOTAL` units long and lasts `durations.marketing.hero`.
 * 0 to LEAVE: the finished rows step back and the pieces appear where they float. Then each piece
 * flies to its row, one after another, and the dashboard's three figures arrive as the pieces they
 * come from land: breathing room with the savings, left over with the budget, net worth last.
 */
const LEAVE = 0.6;
const FLIGHTS: readonly (readonly [PieceKey, number])[] = [
  ["card", 0.8],
  ["pension", 1.6],
  ["payslip", 2.4],
  ["receipt", 3.2],
  ["statement", 4.0],
  ["credit", 4.8],
];
const FLIGHT = 2.4;
const REVEAL = 0.6;
const FIGURE_AT: Record<"room" | "left" | "net", number> = {
  room: 0.8 + FLIGHT,
  left: 3.2 + FLIGHT,
  net: 4.8 + FLIGHT + 0.1,
};
/** The last figure's arrival ends the run. */
export const ASSEMBLY_UNITS = FIGURE_AT.net + REVEAL;
/** Where the flights begin: the state a hero below the fold waits in until it is seen. */
export const FLIGHTS_START = FLIGHTS[0]?.[1] ?? LEAVE;

/** Share of the stage that must be on screen before a waiting hero plays. */
const IN_VIEW = 0.25;

const all = (root: HTMLElement, attr: string) =>
  Array.from(root.querySelectorAll<HTMLElement>(`[${attr}]`));
const one = (root: HTMLElement, attr: string, key: string) =>
  root.querySelector<HTMLElement>(`[${attr}="${key}"]`);

/**
 * The hero's one orchestrated idea (prototype 11): six pieces of a household's money float in
 * depth, then fly together and settle into the dashboard's "Made from" rows. Played by time, never
 * by scroll (MK2, owner ruling 10): it starts once, the first time the stage is in view, plays
 * forward to the end over `durations.marketing.hero` on the calm easings and is never reversed or
 * scrubbed. Scrolling away mid-run does not stop it.
 *
 * The server HTML is the finished picture, and this run ends on exactly that picture, then hands it
 * back by reverting every inline style. If the page loads with the hero scrolled past, nothing
 * plays. A width change before the end shows the finished picture at once. Set-up is one read pass
 * (every rect measured once, before any write), one write pass and one timeline.
 *
 * Returns a clean-up that leaves the finished picture.
 */
export function armHeroAssembly(kit: GsapKit, root: HTMLElement): () => void {
  const { gsap } = kit;
  const stage = root.querySelector<HTMLElement>("[data-hero-stage]");
  if (!stage || typeof IntersectionObserver === "undefined") return () => undefined;

  let ctx: gsap.Context | null = null;
  let tl: gsap.core.Timeline | null = null;
  let done = false;
  let observer: IntersectionObserver | null = null;
  const startWidth = window.innerWidth;

  const finish = () => {
    if (done) return;
    done = true;
    observer?.disconnect();
    window.removeEventListener("resize", onResize);
    tl?.kill();
    // Reverting restores the server's inline styles: the finished, still picture.
    ctx?.revert();
    delete root.dataset.heroLive;
    delete root.dataset.heroReady;
  };

  function onResize() {
    // Every landing was measured at the old width: show the finished picture instead.
    if (window.innerWidth !== startWidth) finish();
  }

  /** Measures once, then sets the scattered pieces and builds the paused timeline. */
  const build = (): gsap.core.Timeline => {
    const unit = marketingMs("hero") / 1000 / ASSEMBLY_UNITS;

    // 0. The pieces take no layout at rest (the first paint lays out less); give them their
    // boxes, still invisible, so they can be measured.
    root.dataset.heroReady = "true";

    // 1. Read: every rect, before anything is written.
    const s = stage.getBoundingClientRect();
    const measured = FLIGHTS.map(([k]) => {
      const piece = one(root, "data-hero-piece", k);
      const glyph = one(root, "data-hero-glyph", k);
      const row = one(root, "data-hero-row", k);
      if (!piece || !glyph || !row) return null;
      const pr = piece.getBoundingClientRect();
      const gr = glyph.getBoundingClientRect();
      // A piece's top-left sits on the stage's centre until GSAP centres it with xPercent and
      // yPercent, so its centre will be (pr.left, pr.top): the dock is measured from there.
      return {
        k,
        piece,
        row,
        bar: row.querySelector<HTMLElement>("[data-hero-bar]"),
        dock: {
          x: gr.left + gr.width / 2 - pr.left,
          y: gr.top + gr.height / 2 - pr.top,
          scale: pr.width > 0 ? gr.width / pr.width : 1,
        },
      };
    });
    const narrow = s.width < 480;
    const spreadX = narrow ? 0.8 : 1;
    // Pieces are drawn at their full size; a narrow stage floats them smaller.
    const restScale = gsap.utils.clamp(0.55, 1, s.width / 640);

    // 2. Write: the scattered state, then the run.
    const t = gsap.timeline({ paused: true, defaults: { ease: "calm" }, onComplete: finish });
    ctx = gsap.context(() => {
      root.dataset.heroLive = "true";
      const values = all(root, "data-hero-value");
      const slots = all(root, "data-hero-slot");

      for (const m of measured) {
        if (!m) continue;
        const at = SCATTER[m.k];
        gsap.set(m.piece, {
          xPercent: -50,
          yPercent: -50,
          x: at.x * s.width * spreadX,
          y: at.y * s.height,
          z: at.z,
          rotationX: at.rx,
          rotationY: at.ry,
          rotationZ: at.rz,
          scale: restScale,
          opacity: 0,
        });
      }

      // Leave: the rows and figures step back as the pieces appear.
      const pieces = measured.flatMap((m) => (m ? [m.piece] : []));
      const rows = measured.flatMap((m) => (m ? [m.row] : []));
      const bars = measured.flatMap((m) => (m?.bar ? [m.bar] : []));
      t.to(pieces, { opacity: 1, duration: LEAVE * unit }, 0)
        .to(rows, { opacity: 0, duration: LEAVE * unit }, 0)
        .to(bars, { scaleY: 0, duration: LEAVE * unit }, 0)
        .to(values, { opacity: 0, duration: LEAVE * unit }, 0)
        .to(slots, { opacity: 1, duration: LEAVE * unit }, 0);

      // Flights: travel, a gentle lift towards the viewer and back, then settle into the row.
      for (const [index, [, start]] of FLIGHTS.entries()) {
        const m = measured[index];
        if (!m) continue;
        const peak = narrow ? 40 : SCATTER[m.k].z + 50;
        const at = start * unit;
        const flight = FLIGHT * unit;
        t.to(
          m.piece,
          {
            x: m.dock.x,
            y: m.dock.y,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            duration: flight,
          },
          at,
        )
          .to(m.piece, { scale: m.dock.scale, duration: flight, ease: "calmInOut" }, at)
          .to(m.piece, { z: peak, duration: flight * 0.36 }, at)
          .to(m.piece, { z: 0, duration: flight * 0.64, ease: "calmInOut" }, at + flight * 0.36)
          .to(m.piece, { opacity: 0, duration: 0.3 * unit }, at + flight - 0.22 * unit)
          .to(m.row, { opacity: 1, duration: 0.4 * unit }, at + flight - 0.32 * unit);
        if (m.bar) t.to(m.bar, { scaleY: 1, duration: 0.5 * unit }, at + flight - 0.2 * unit);
      }

      // Figures: each slot line gives way to its figure, rising a little into place.
      for (const [key, start] of Object.entries(FIGURE_AT)) {
        const value = one(root, "data-hero-value", key);
        const slot = one(root, "data-hero-slot", key);
        if (slot) t.to(slot, { opacity: 0, duration: 0.3 * unit }, start * unit);
        if (value) {
          t.fromTo(
            value,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: REVEAL * unit, immediateRender: false },
            start * unit,
          );
        }
      }
    }, root);
    // The timeline is made outside the context, but every tween in it inside, so reverting the
    // context undoes them all; finish also kills the timeline.
    return t;
  };

  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry || done) return;
      let run = tl;
      if (!run) {
        const top = entry.rootBounds?.top ?? 0;
        if (!entry.isIntersecting && entry.boundingClientRect.bottom <= top) {
          // Loaded with the hero scrolled past: keep the finished picture.
          finish();
          return;
        }
        run = build();
        tl = run;
        if (!entry.isIntersecting) {
          // Below the fold and unseen: wait, scattered, where the flights begin.
          run.progress(FLIGHTS_START / ASSEMBLY_UNITS);
          return;
        }
      }
      if (entry.isIntersecting && (entry.intersectionRatio >= IN_VIEW || run.progress() === 0)) {
        observer?.disconnect();
        run.play();
      }
    },
    { threshold: [0, IN_VIEW] },
  );
  observer.observe(stage);
  window.addEventListener("resize", onResize);

  return finish;
}
