import type { GsapKit } from "../shared/gsapKit";
import { type PaceState, SCROLL } from "../shared/pace";
import type { PieceKey } from "./pieceData";

/**
 * Where each piece floats before the picture assembles: a share of the stage's width and height
 * from its centre, a depth in px and a tilt in degrees. Hand-placed so no two pieces cover the
 * same figure. Prototype 8 keeps every tilt at or under 6 degrees and the depth shallow, so
 * nothing swings as it travels.
 */
const SCATTER: Record<
  PieceKey,
  { x: number; y: number; z: number; rx: number; ry: number; rz: number }
> = {
  card: { x: -0.27, y: -0.3, z: 70, rx: 5, ry: -6, rz: -5 },
  payslip: { x: 0.27, y: -0.24, z: 20, rx: 3, ry: 5, rz: 3 },
  receipt: { x: -0.25, y: 0.02, z: 90, rx: -4, ry: 5, rz: -3 },
  statement: { x: 0.25, y: 0.06, z: -20, rx: 4, ry: -4, rz: 2 },
  pension: { x: -0.22, y: 0.27, z: 45, rx: -3, ry: 4, rz: 2 },
  credit: { x: 0.24, y: 0.31, z: 110, rx: 5, ry: -6, rz: 5 },
};

/** Arrival order and start time of each flight, in timeline units (the whole run is 10). */
const FLIGHTS: readonly [PieceKey, number][] = [
  ["card", 0.5],
  ["pension", 1.55],
  ["payslip", 2.6],
  ["receipt", 3.65],
  ["statement", 4.7],
  ["credit", 5.75],
];
/** Each flight lasts a good share of the run, so one piece travels across most of a screen of scroll. */
const FLIGHT = 2.5;
const LAST_LAND = 5.75 + FLIGHT;
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
  // Slow to leave, even through the middle, long soft landing: no snap at either end.
  CustomEase.create("p8Fly", "M0,0 C0.3,0 0.32,0.5 0.55,0.8 0.72,0.97 0.86,1 1,1");
  CustomEase.create("p8Settle", "0.25, 0.1, 0.2, 1");

  let ctx: gsap.Context | null = null;
  let introTween: gsap.core.Tween | null = null;

  const build = () => {
    const stage = root.querySelector<HTMLElement>(".p8-stage");
    const dash = root.querySelector<HTMLElement>(".p8-dash");
    const layer = root.querySelector<HTMLElement>(".p8-pieces");
    const ghost = root.querySelector<HTMLElement>(".p8-ghost");
    const leftFrom = root.querySelector<HTMLElement>('[data-p8-from="left"]');
    if (!stage || !dash || !layer || !ghost || !leftFrom) return;

    ctx = gsap.context(() => {
      const header = () => document.querySelector("header")?.offsetHeight ?? 0;
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const s = stage.getBoundingClientRect();
      // A narrow stage keeps the outer pieces on the screen.
      const spreadX = s.width < 480 ? 0.8 : 1;
      const piece = (k: PieceKey) => root.querySelector<HTMLElement>(`[data-p8-piece="${k}"]`);
      const row = (k: PieceKey) => root.querySelector<HTMLElement>(`[data-p8-row="${k}"]`);
      const glyph = (k: PieceKey) => root.querySelector<HTMLElement>(`[data-p8-glyph="${k}"]`);
      const value = (k: string) => root.querySelector<HTMLElement>(`[data-p8-value="${k}"]`);
      const slot = (k: string) => root.querySelector<HTMLElement>(`[data-p8-slot="${k}"]`);

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
      const receipt = piece("receipt");
      const ghostAt = { x: 0, y: 0 };
      if (receipt) {
        const rc = centre(receipt.getBoundingClientRect());
        const fc = centre(leftFrom.getBoundingClientRect());
        ghostAt.x = SCATTER.receipt.x * s.width * spreadX + (fc.x - rc.x);
        ghostAt.y = SCATTER.receipt.y * s.height + (fc.y - rc.y);
      }
      const leftValue = value("left");
      // The ghost's landing, fitted to the tile's figure while the dashboard is flat.
      const fit = leftValue
        ? (Flip.fit(ghost, leftValue, { getVars: true, scale: true }) as gsap.TweenVars)
        : null;
      const fitScale = Number(fit?.scaleY ?? 1);

      // 2. The scattered state.
      for (const [k] of FLIGHTS) {
        const p = piece(k);
        const at = SCATTER[k];
        if (!p) continue;
        gsap.set(p, {
          x: at.x * s.width * spreadX,
          y: at.y * s.height,
          z: at.z,
          rotationX: at.rx,
          rotationY: at.ry,
          rotationZ: at.rz,
          opacity: 1,
        });
      }
      gsap.set(ghost, { x: ghostAt.x, y: ghostAt.y, z: SCATTER.receipt.z + 2, opacity: 0 });
      gsap.set(dash, { z: -120, rotationX: 4, y: 16, transformOrigin: "50% 40%" });
      gsap.set(root.querySelectorAll("[data-p8-value]"), { opacity: 0, y: 8 });
      gsap.set(root.querySelectorAll("[data-p8-slot]"), { opacity: 1 });
      gsap.set(root.querySelectorAll("[data-p8-row]"), { opacity: 0 });
      gsap.set(root.querySelectorAll("[data-p8-row] .p8-made__bar"), { scaleY: 0 });
      gsap.set(root.querySelector(".p8-dash__glint"), { xPercent: -120, opacity: 0 });

      // 3. The run.
      const tl = gsap.timeline({ paused: true, defaults: { ease: "calm" } });
      tl.to(dash, { z: 0, rotationX: 0, y: 0, duration: 4.2, ease: "calmInOut" }, 0);
      // The first half screen: everything drifts a little nearer before anything leaves.
      tl.to(
        [...layer.querySelectorAll<HTMLElement>("[data-p8-piece]")].map((p) => p.firstElementChild),
        {
          y: -10,
          rotationZ: (i: number) => (i % 2 ? 1.5 : -1.5),
          duration: 1.6,
          ease: "calmInOut",
        },
        0,
      );

      const reveal = (k: string, at: number) => {
        const v = value(k);
        const sl = slot(k);
        if (sl) tl.to(sl, { opacity: 0, duration: 0.5, ease: "none" }, at);
        if (v) tl.to(v, { opacity: 1, y: 0, duration: 0.9, ease: "p8Settle" }, at + 0.1);
      };

      for (const [k, t] of FLIGHTS) {
        const p = piece(k);
        const d = docks.get(k);
        const r = row(k);
        if (!p || !d || !r) continue;
        // A small lift towards the reader mid-flight, then down onto its row.
        const peak = SCATTER[k].z + 40;
        tl.to(
          p,
          {
            x: d.x,
            y: d.y,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            duration: FLIGHT,
            ease: "p8Fly",
          },
          t,
        )
          // Size eases down evenly over the whole flight (no late rush into the row).
          .to(p, { scale: d.scale, duration: FLIGHT, ease: "calmInOut" }, t)
          .to(p, { z: peak, duration: FLIGHT * 0.45, ease: "sine.inOut" }, t)
          .to(p, { z: 0, duration: FLIGHT * 0.55, ease: "p8Settle" }, t + FLIGHT * 0.45)
          // The piece hands over to its row as a slow cross-fade.
          .to(p, { opacity: 0, duration: 0.6, ease: "none" }, t + FLIGHT - 0.5)
          .to(r, { opacity: 1, duration: 0.7, ease: "none" }, t + FLIGHT - 0.6)
          .to(
            r.querySelector(".p8-made__bar"),
            { scaleY: 1, duration: 0.8, ease: "p8Settle" },
            t + FLIGHT - 0.3,
          );
      }

      // Savings land: breathing room is known.
      reveal("room", 0.5 + FLIGHT);
      // The receipt's figure lifts off as the receipt leaves, and becomes the tile's figure.
      if (fit) {
        const leave = 3.65 + 0.3;
        tl.to(ghost, { opacity: 1, duration: 0.5, ease: "none" }, leave)
          .to(
            ghost,
            {
              x: fit.x,
              y: fit.y,
              z: 0,
              scaleX: fitScale,
              scaleY: fitScale,
              duration: 2.4,
              ease: "p8Fly",
            },
            leave,
          )
          .to(ghost, { opacity: 0, duration: 0.5, ease: "none" }, leave + 2.2);
        reveal("left", leave + 2.1);
      } else {
        reveal("left", 6.2);
      }
      // The last piece lands: net worth is the sum of everything, so it comes last.
      reveal("net", LAST_LAND - 0.2);
      // The lock: one sweep of light across the finished frame.
      const glintAt = LAST_LAND - 0.4;
      tl.to(
        root.querySelector(".p8-dash__glint"),
        { opacity: 1, duration: 0.4, ease: "none" },
        glintAt,
      )
        .to(
          root.querySelector(".p8-dash__glint"),
          { xPercent: 120, duration: 1.8, ease: "calmInOut" },
          glintAt,
        )
        .to(root.querySelector(".p8-dash__glint"), { opacity: 0, duration: 0.4 }, glintAt + 1.4)
        .to({}, { duration: Math.max(0, TOTAL - glintAt - 1.8) }, glintAt + 1.8);

      // Light follows the pointer; on touch it follows the scroll.
      const tiltX = gsap.quickTo(layer, "rotationX", { duration: pace.s(1400), ease: "calm" });
      const tiltY = gsap.quickTo(layer, "rotationY", { duration: pace.s(1400), ease: "calm" });
      const hoverOk = window.matchMedia("(hover: hover)").matches;
      let pointer = { x: 0.5, y: 0.5 };
      const light = (x: number, y: number) => {
        stage.style.setProperty("--p8-lx", x.toFixed(3));
        stage.style.setProperty("--p8-ly", y.toFixed(3));
      };
      const applyTilt = () => {
        const calm = 1 - tl.progress();
        tiltY((pointer.x - 0.5) * 6 * calm);
        tiltX(-(pointer.y - 0.5) * 5 * calm);
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

      // Load assembled, then part to where the scroll position says (no jump on hydration).
      const pinEl = (wide ? root.querySelector<HTMLElement>(".p8-hero__inner") : stage) ?? stage;
      const startY = pinEl.getBoundingClientRect().top + window.scrollY - header();
      const run = () => pace.px(SCROLL.heroPin);
      const target = gsap.utils.clamp(0, 1, (window.scrollY - startY) / run());
      tl.progress(1);
      introTween = gsap.to(tl, {
        progress: target,
        duration: target < 1 ? pace.s(2800) : 0,
        delay: 0.4,
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
            // A longer soft lag than prototype 4: a flick of the wheel cannot make a piece whip.
            duration: pace.s(1100),
            ease: "calm",
            overwrite: true,
          });
          if (hover) applyTilt();
          else light(0.25 + self.progress * 0.5, 0.3);
        },
      });

      // On a phone the stage starts below the copy: the pieces turn gently as it rises to the pin.
      if (!wide) {
        gsap.fromTo(
          layer,
          { rotationX: 5, y: 20 },
          {
            rotationX: 0,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: stage,
              start: "top bottom",
              end: () => `top top+=${header()}`,
              scrub: pace.s(1000),
            },
          },
        );
      }

      return () => root.removeEventListener("pointermove", onMove);
    }, root);
  };

  build();
  root.dataset.p8Live = "true";
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
    delete root.dataset.p8Live;
  };
}
