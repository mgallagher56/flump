import type { GsapKit } from "../../shared/gsapKit";
import { type PaceState, SCROLL, TIMING } from "../../shared/pace";
import type { PieceKey } from "./pieceData";

/**
 * Where each piece floats before the picture assembles: a share of the stage's width and height
 * from its centre, a depth in px and a tilt in degrees. Hand-placed so no two pieces cover the
 * same figure, and the nearer pieces are the more tilted (they feel closer to the hand).
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

/** Arrival order and start time of each flight, in timeline units (the whole run is 10). */
const FLIGHTS: readonly [PieceKey, number][] = [
  ["card", 0.8],
  ["pension", 1.6],
  ["payslip", 2.4],
  ["receipt", 3.2],
  ["statement", 4.0],
  ["credit", 4.8],
];
const FLIGHT = 2.4;
const TOTAL = 10;

const centre = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/**
 * The hero's one orchestrated idea: six pieces of a household's money float in depth, then fly
 * together and lock into the one dashboard as the reader scrolls. The receipt's "left over"
 * figure lifts off and becomes the dashboard tile's figure (Flip.fit). Every position is
 * measured with nothing transformed, so the pieces land exactly on their rows; a resize rebuilds.
 *
 * The page loads already assembled (that is the server-rendered page). Once GSAP is ready the
 * picture comes gently apart to where the scroll position says it should be, so nothing jumps.
 */
export function buildAssemble(kit: GsapKit, root: HTMLElement, pace: PaceState): () => void {
  const { gsap, ScrollTrigger, Flip, CustomEase } = kit;
  // Round three: the same flight, calmer. A gentle start and a long, soft landing; no overshoot.
  CustomEase.create("p11Fly", "M0,0 C0.4,0 0.3,0.5 0.52,0.8 0.7,0.98 0.84,1 1,1");
  CustomEase.create("p11Settle", "M0,0 C0.25,0.5 0.35,0.9 0.55,0.98 0.75,1 0.88,1 1,1");

  let ctx: gsap.Context | null = null;
  let introTween: gsap.core.Tween | null = null;

  const build = () => {
    const stage = root.querySelector<HTMLElement>(".p11-stage");
    const dash = root.querySelector<HTMLElement>(".p11-dash");
    const layer = root.querySelector<HTMLElement>(".p11-pieces");
    const ghost = root.querySelector<HTMLElement>(".p11-ghost");
    const leftFrom = root.querySelector<HTMLElement>('[data-p11-from="left"]');
    if (!stage || !dash || !layer || !ghost || !leftFrom) return;

    ctx = gsap.context(() => {
      const header = () => document.querySelector("header")?.offsetHeight ?? 0;
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const s = stage.getBoundingClientRect();
      // A narrow stage keeps the outer pieces on the screen.
      const spreadX = s.width < 480 ? 0.8 : 1;
      const piece = (k: PieceKey) => root.querySelector<HTMLElement>(`[data-p11-piece="${k}"]`);
      const row = (k: PieceKey) => root.querySelector<HTMLElement>(`[data-p11-row="${k}"]`);
      const glyph = (k: PieceKey) => root.querySelector<HTMLElement>(`[data-p11-glyph="${k}"]`);
      const value = (k: string) => root.querySelector<HTMLElement>(`[data-p11-value="${k}"]`);
      const slot = (k: string) => root.querySelector<HTMLElement>(`[data-p11-slot="${k}"]`);

      // 1. Measure, with everything at rest (a rebuild starts from a reverted page).
      const docks = new Map<PieceKey, { x: number; y: number; scale: number }>();
      for (const [k] of FLIGHTS) {
        const p = piece(k);
        const g = glyph(k);
        if (!p || !g) continue;
        const pr = p.getBoundingClientRect();
        const gr = g.getBoundingClientRect();
        docks.set(k, {
          x: centre(gr).x - centre(pr).x,
          y: centre(gr).y - centre(pr).y,
          scale: gr.width / pr.width,
        });
      }
      // Stacked (phone and tablet): the rows are one list, and the pieces rest in a tidy tray over
      // them, so at rest no piece hides the dashboard's own figures.
      const phone = !wide;
      const trayFor = () => {
        const slots = new Map<
          PieceKey,
          { x: number; y: number; scale: number; cx: number; cy: number }
        >();
        const rows = FLIGHTS.map(([k]) => row(k)?.getBoundingClientRect());
        const list = root.querySelector(".p11-made__list")?.getBoundingClientRect();
        if (!list || rows.some((r) => !r)) return null;
        const gap = 8;
        const cellW = (list.width - gap) / 2;
        FLIGHTS.forEach(([k], i) => {
          const p = piece(k);
          const top = rows[i - (i % 2)];
          const bottom = rows[i - (i % 2) + 1] ?? top;
          if (!p || !top || !bottom) return;
          const pr = p.getBoundingClientRect();
          const cellH = bottom.bottom - top.top - 6;
          const scale = Math.min(0.8, (cellW - 6) / pr.width, cellH / pr.height);
          const cx = list.left + (i % 2 ? cellW + gap : 0) + cellW / 2;
          const cy = top.top + 3 + cellH / 2;
          const pc = centre(pr);
          slots.set(k, { x: cx - pc.x, y: cy - pc.y, scale, cx, cy });
        });
        return slots;
      };
      const receipt = piece("receipt");
      const ghostAt = { x: 0, y: 0 };
      let ghostScale = 1;
      if (receipt) {
        const rc = centre(receipt.getBoundingClientRect());
        const fc = centre(leftFrom.getBoundingClientRect());
        const slot = phone ? trayFor()?.get("receipt") : undefined;
        if (slot) {
          ghostAt.x = slot.x + (fc.x - rc.x) * slot.scale;
          ghostAt.y = slot.y + (fc.y - rc.y) * slot.scale;
          ghostScale = slot.scale;
        } else {
          ghostAt.x = SCATTER.receipt.x * s.width * spreadX + (fc.x - rc.x);
          ghostAt.y = SCATTER.receipt.y * s.height + (fc.y - rc.y);
        }
      }
      const leftValue = value("left");
      // The ghost's landing, fitted to the tile's figure while the dashboard is flat.
      const fit = leftValue
        ? (Flip.fit(ghost, leftValue, { getVars: true, scale: true }) as gsap.TweenVars)
        : null;
      const fitScale = Number(fit?.scaleY ?? 1);

      // 2. The scattered state. On a phone the pieces rest in a tidy tray instead: two to a
      // shelf over the hidden "Made from" rows, each pair over the two rows it will fill, so no
      // piece covers any visible text at rest and the rows appear only where pieces have left.
      const tray = phone ? trayFor() : null;
      for (const [k] of FLIGHTS) {
        const p = piece(k);
        const at = SCATTER[k];
        if (!p) continue;
        const slot = tray?.get(k);
        gsap.set(
          p,
          slot
            ? { x: slot.x, y: slot.y, z: 0, scale: slot.scale, rotation: 0, opacity: 1 }
            : {
                x: at.x * s.width * spreadX,
                y: at.y * s.height,
                z: at.z,
                rotationX: at.rx,
                rotationY: at.ry,
                rotationZ: at.rz,
                opacity: 1,
              },
        );
        // GSAP folds the piece's CSS centring into its own transform, which can shift some
        // pieces: measure where each landed and correct it onto its shelf.
        if (slot) {
          const landed = centre(p.getBoundingClientRect());
          const dx = slot.cx - landed.x;
          const dy = slot.cy - landed.y;
          gsap.set(p, { x: slot.x + dx, y: slot.y + dy });
          // The same shift applies to its landing on the row.
          const dock = docks.get(k);
          if (dock) docks.set(k, { ...dock, x: dock.x + dx, y: dock.y + dy });
        }
      }
      gsap.set(ghost, {
        x: ghostAt.x,
        y: ghostAt.y,
        z: tray ? 2 : SCATTER.receipt.z + 2,
        scale: ghostScale,
        opacity: 0,
      });
      gsap.set(
        dash,
        tray
          ? { y: 0, transformOrigin: "50% 40%" }
          : { z: -120, rotationX: 4, y: 16, transformOrigin: "50% 40%" },
      );
      gsap.set(root.querySelectorAll("[data-p11-value]"), { opacity: 0, y: 10 });
      gsap.set(root.querySelectorAll("[data-p11-slot]"), { opacity: 1 });
      gsap.set(root.querySelectorAll("[data-p11-row]"), { opacity: 0 });
      gsap.set(root.querySelectorAll("[data-p11-row] .p11-made__bar"), { scaleY: 0 });
      gsap.set(root.querySelector(".p11-dash__glint"), { xPercent: -120, opacity: 0 });

      // 3. The run.
      const tl = gsap.timeline({ paused: true, defaults: { ease: "calm" } });
      tl.to(dash, { z: 0, rotationX: 0, y: 0, duration: 3.4, ease: "calmInOut" }, 0.1);
      // The first half screen: everything drifts a little nearer before anything leaves.
      // (Not on a phone, where the tray's shelves sit close together.)
      if (!phone) {
        tl.to(
          [...layer.querySelectorAll<HTMLElement>("[data-p11-piece]")].map(
            (p) => p.firstElementChild,
          ),
          {
            y: -8,
            rotationZ: (i: number) => (i % 2 ? 1.5 : -1.5),
            duration: 1.4,
            ease: "sine.inOut",
          },
          0,
        );
      }

      const reveal = (k: string, at: number) => {
        const v = value(k);
        const sl = slot(k);
        if (sl) tl.to(sl, { opacity: 0, duration: 0.3, ease: "none" }, at);
        if (v) tl.to(v, { opacity: 1, y: 0, duration: 0.6, ease: "p11Settle" }, at + 0.05);
      };

      for (const [k, t] of FLIGHTS) {
        const p = piece(k);
        const d = docks.get(k);
        const r = row(k);
        if (!p || !d || !r) continue;
        const peak = phone ? 40 : SCATTER[k].z + 50;
        tl.to(
          p,
          {
            x: d.x,
            y: d.y,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            duration: FLIGHT,
            ease: "p11Fly",
          },
          t,
        )
          // Size holds while the piece travels and lies flat, then it shrinks into its row.
          .to(p, { scale: d.scale, duration: FLIGHT, ease: "power2.in" }, t)
          .to(p, { z: peak, duration: FLIGHT * 0.36, ease: "power2.out" }, t)
          .to(p, { z: 0, duration: FLIGHT * 0.64, ease: "p11Settle" }, t + FLIGHT * 0.36)
          .to(p, { opacity: 0, duration: 0.3, ease: "none" }, t + FLIGHT - 0.22)
          .to(r, { opacity: 1, duration: 0.4, ease: "none" }, t + FLIGHT - 0.32)
          .to(
            r.querySelector(".p11-made__bar"),
            { scaleY: 1, duration: 0.5, ease: "p11Settle" },
            t + FLIGHT - 0.2,
          );
      }

      // Savings land: breathing room is known.
      reveal("room", 0.8 + FLIGHT);
      // The receipt's figure lifts off as the receipt leaves, and becomes the tile's figure.
      if (fit) {
        const leave = 3.0;
        tl.to(ghost, { opacity: 1, duration: 0.25, ease: "none" }, leave)
          .to(
            ghost,
            {
              x: fit.x,
              y: fit.y,
              z: 0,
              scaleX: fitScale,
              scaleY: fitScale,
              duration: 2.0,
              ease: "p11Fly",
            },
            leave,
          )
          .to(ghost, { opacity: 0, duration: 0.25, ease: "none" }, leave + 1.95);
        reveal("left", leave + 1.9);
      } else {
        reveal("left", 5.2);
      }
      // The last piece lands: net worth is the sum of everything, so it comes last.
      reveal("net", 4.8 + FLIGHT + 0.1);
      // The lock: one sweep of light across the finished frame.
      tl.to(
        root.querySelector(".p11-dash__glint"),
        { opacity: 1, duration: 0.3, ease: "none" },
        7.7,
      )
        .to(
          root.querySelector(".p11-dash__glint"),
          { xPercent: 120, duration: 1.6, ease: "calmInOut" },
          7.7,
        )
        .to(root.querySelector(".p11-dash__glint"), { opacity: 0, duration: 0.3 }, 9.0)
        .to({}, { duration: TOTAL - 9.3 }, 9.3);

      // Light follows the pointer; on touch it follows the scroll.
      const tiltX = gsap.quickTo(layer, "rotationX", {
        duration: pace.s(TIMING.hover * 3),
        ease: "calm",
      });
      const tiltY = gsap.quickTo(layer, "rotationY", {
        duration: pace.s(TIMING.hover * 3),
        ease: "calm",
      });
      const hoverOk = window.matchMedia("(hover: hover)").matches;
      let pointer = { x: 0.5, y: 0.5 };
      const light = (x: number, y: number) => {
        stage.style.setProperty("--p11-lx", x.toFixed(3));
        stage.style.setProperty("--p11-ly", y.toFixed(3));
      };
      const applyTilt = () => {
        const calm = 1 - tl.progress();
        tiltY((pointer.x - 0.5) * 8 * calm);
        tiltX(-(pointer.y - 0.5) * 6 * calm);
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse" || !hoverOk) return;
        const r = stage.getBoundingClientRect();
        pointer = {
          x: gsap.utils.clamp(0, 1, (e.clientX - r.left) / r.width),
          y: gsap.utils.clamp(0, 1, (e.clientY - r.top) / r.height),
        };
        light(pointer.x, pointer.y);
        applyTilt();
      };
      root.addEventListener("pointermove", onMove);

      // Stacked layouts (phones and tablets, under 1024px): never scrubbed. Crossing a line under
      // the stage triggers the assembly, which then plays to the end in its own time; scrolling back
      // above the line plays it back to the tray. Wherever the reader stops, every piece is either
      // in the tray or docked, never part-way (the journey's rule). The page loads assembled from
      // the server and parts to the tray only if the stage has not been reached yet.
      if (!wide) {
        const flight = (to: 0 | 1) =>
          gsap.to(tl, {
            progress: to,
            duration: pace.s(to === 1 ? 2400 : 1600),
            ease: "calmInOut",
            overwrite: true,
          });
        tl.progress(1);
        const trigger = ScrollTrigger.create({
          trigger: stage,
          // The assembly starts once the stage's top has risen past 60% of the screen.
          start: "top 60%",
          onEnter: () => flight(1),
          onLeaveBack: () => flight(0),
        });
        if (!trigger.isActive && trigger.progress === 0 && window.scrollY < trigger.start) {
          introTween = gsap.to(tl, {
            progress: 0,
            duration: pace.s(TIMING.hero * 0.5),
            delay: pace.s(500),
            ease: "calmInOut",
          });
        }
        return () => root.removeEventListener("pointermove", onMove);
      }

      // Two columns (1024px and up): load assembled, then part to where the scroll position says
      // (no jump on hydration).
      const pinEl = root.querySelector<HTMLElement>(".p11-hero__inner") ?? stage;
      const startY = pinEl.getBoundingClientRect().top + window.scrollY - header();
      // Shorter than round three's heroPin: prototype 11 keeps the whole page near 11 screens.
      const run = () => pace.px(SCROLL.heroPin * 0.4);
      const target = gsap.utils.clamp(0, 1, (window.scrollY - startY) / run());
      tl.progress(1);
      introTween = gsap.to(tl, {
        progress: target,
        duration: target < 1 ? pace.s(TIMING.hero) : 0,
        delay: pace.s(500),
        ease: "calmInOut",
      });

      // The pin exists from the start (so the page's length never changes); the timeline follows
      // the scroll with a short soft lag, which also takes over from the opening tween.
      const hover = window.matchMedia("(hover: hover)").matches;
      let following = false;
      ScrollTrigger.create({
        trigger: pinEl,
        pin: pinEl,
        // Created after the bands below (it loads later), so it must be measured first.
        refreshPriority: 1,
        start: () => `top top+=${header()}`,
        end: () => `+=${run()}`,
        onUpdate: (self) => {
          if (!following && Math.abs(self.progress - target) < 0.002) return;
          following = true;
          gsap.to(tl, {
            progress: self.progress,
            duration: pace.s(1000),
            ease: "calm",
            overwrite: true,
          });
          if (hover) applyTilt();
          else light(0.25 + self.progress * 0.5, 0.3);
        },
      });

      return () => root.removeEventListener("pointermove", onMove);
    }, root);
  };

  build();
  root.dataset.p11Live = "true";
  // The pin adds length above every band below, so their triggers measure again.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  // A width change moves every dock target: rebuild from a clean page.
  let lastWidth = window.innerWidth;
  let timer = 0;
  const onResize = () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      introTween?.kill();
      ctx?.revert();
      build();
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    }, 200);
  };
  window.addEventListener("resize", onResize);

  return () => {
    window.removeEventListener("resize", onResize);
    window.clearTimeout(timer);
    introTween?.kill();
    ctx?.revert();
    delete root.dataset.p11Live;
  };
}
