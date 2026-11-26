import type { GsapKit } from "../shared/gsapKit";
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
  card: { x: -0.27, y: -0.3, z: 140, rx: 16, ry: -22, rz: -9 },
  payslip: { x: 0.27, y: -0.24, z: 40, rx: 8, ry: 20, rz: 5 },
  receipt: { x: -0.25, y: 0.02, z: 190, rx: -10, ry: 16, rz: -4 },
  statement: { x: 0.25, y: 0.06, z: -30, rx: 12, ry: -14, rz: 3 },
  pension: { x: -0.22, y: 0.27, z: 90, rx: -6, ry: 12, rz: 2 },
  credit: { x: 0.24, y: 0.31, z: 230, rx: 18, ry: -26, rz: 8 },
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
export function buildAssemble(kit: GsapKit, root: HTMLElement): () => void {
  const { gsap, ScrollTrigger, Flip, CustomEase } = kit;
  CustomEase.create("p4Fly", "M0,0 C0.38,0 0.24,0.62 0.5,0.86 0.66,1 0.82,1 1,1");
  CustomEase.create("p4Settle", "M0,0 C0.18,0.7 0.3,0.94 0.5,0.98 0.7,1 0.86,1 1,1");

  let ctx: gsap.Context | null = null;
  let introTween: gsap.core.Tween | null = null;

  const build = () => {
    const stage = root.querySelector<HTMLElement>(".p4-stage");
    const dash = root.querySelector<HTMLElement>(".p4-dash");
    const layer = root.querySelector<HTMLElement>(".p4-pieces");
    const ghost = root.querySelector<HTMLElement>(".p4-ghost");
    const leftFrom = root.querySelector<HTMLElement>('[data-p4-from="left"]');
    if (!stage || !dash || !layer || !ghost || !leftFrom) return;

    ctx = gsap.context(() => {
      const header = () => document.querySelector("header")?.offsetHeight ?? 0;
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const s = stage.getBoundingClientRect();
      // A narrow stage keeps the outer pieces on the screen.
      const spreadX = s.width < 480 ? 0.8 : 1;
      const piece = (k: PieceKey) => root.querySelector<HTMLElement>(`[data-p4-piece="${k}"]`);
      const row = (k: PieceKey) => root.querySelector<HTMLElement>(`[data-p4-row="${k}"]`);
      const glyph = (k: PieceKey) => root.querySelector<HTMLElement>(`[data-p4-glyph="${k}"]`);
      const value = (k: string) => root.querySelector<HTMLElement>(`[data-p4-value="${k}"]`);
      const slot = (k: string) => root.querySelector<HTMLElement>(`[data-p4-slot="${k}"]`);

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
      gsap.set(dash, { z: -300, rotationX: 10, y: 24, transformOrigin: "50% 40%" });
      gsap.set(root.querySelectorAll("[data-p4-value]"), { opacity: 0, y: 10 });
      gsap.set(root.querySelectorAll("[data-p4-slot]"), { opacity: 1 });
      gsap.set(root.querySelectorAll("[data-p4-row]"), { opacity: 0 });
      gsap.set(root.querySelectorAll("[data-p4-row] .p4-made__bar"), { scaleY: 0 });
      gsap.set(root.querySelector(".p4-dash__glint"), { xPercent: -120, opacity: 0 });

      // 3. The run.
      const tl = gsap.timeline({ paused: true, defaults: { ease: "flump" } });
      tl.to(dash, { z: 0, rotationX: 0, y: 0, duration: 2.9, ease: "flumpInOut" }, 0.1);
      // The first half screen: everything drifts a little nearer before anything leaves.
      tl.to(
        [...layer.querySelectorAll<HTMLElement>("[data-p4-piece]")].map((p) => p.firstElementChild),
        { y: -14, rotationZ: (i: number) => (i % 2 ? 3 : -3), duration: 1.2, ease: "sine.inOut" },
        0,
      );

      const reveal = (k: string, at: number) => {
        const v = value(k);
        const sl = slot(k);
        if (sl) tl.to(sl, { opacity: 0, duration: 0.3, ease: "none" }, at);
        if (v) tl.to(v, { opacity: 1, y: 0, duration: 0.6, ease: "p4Settle" }, at + 0.05);
      };

      for (const [k, t] of FLIGHTS) {
        const p = piece(k);
        const d = docks.get(k);
        const r = row(k);
        if (!p || !d || !r) continue;
        const peak = SCATTER[k].z + 160;
        tl.to(
          p,
          {
            x: d.x,
            y: d.y,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            duration: FLIGHT,
            ease: "p4Fly",
          },
          t,
        )
          // Size holds while the piece travels and lies flat, then it shrinks into its row.
          .to(p, { scale: d.scale, duration: FLIGHT, ease: "power3.in" }, t)
          .to(p, { z: peak, duration: FLIGHT * 0.36, ease: "power2.out" }, t)
          .to(p, { z: 0, duration: FLIGHT * 0.64, ease: "p4Settle" }, t + FLIGHT * 0.36)
          .to(p, { opacity: 0, duration: 0.3, ease: "none" }, t + FLIGHT - 0.22)
          .to(r, { opacity: 1, duration: 0.4, ease: "none" }, t + FLIGHT - 0.32)
          .to(
            r.querySelector(".p4-made__bar"),
            { scaleY: 1, duration: 0.5, ease: "p4Settle" },
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
              ease: "p4Fly",
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
      tl.to(root.querySelector(".p4-dash__glint"), { opacity: 1, duration: 0.3, ease: "none" }, 7.7)
        .to(
          root.querySelector(".p4-dash__glint"),
          { xPercent: 120, duration: 1.6, ease: "flumpInOut" },
          7.7,
        )
        .to(root.querySelector(".p4-dash__glint"), { opacity: 0, duration: 0.3 }, 9.0)
        .to({}, { duration: TOTAL - 9.3 }, 9.3);

      // Light follows the pointer; on touch it follows the scroll.
      const tiltX = gsap.quickTo(layer, "rotationX", { duration: 0.8, ease: "power3.out" });
      const tiltY = gsap.quickTo(layer, "rotationY", { duration: 0.8, ease: "power3.out" });
      const hoverOk = window.matchMedia("(hover: hover)").matches;
      let pointer = { x: 0.5, y: 0.5 };
      const light = (x: number, y: number) => {
        stage.style.setProperty("--p4-lx", x.toFixed(3));
        stage.style.setProperty("--p4-ly", y.toFixed(3));
      };
      const applyTilt = () => {
        const calm = 1 - tl.progress();
        tiltY((pointer.x - 0.5) * 10 * calm);
        tiltX(-(pointer.y - 0.5) * 8 * calm);
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
      const pinEl = (wide ? root.querySelector<HTMLElement>(".p4-hero__inner") : stage) ?? stage;
      const startY = pinEl.getBoundingClientRect().top + window.scrollY - header();
      const run = () => Math.round(window.innerHeight * 1.4);
      const target = gsap.utils.clamp(0, 1, (window.scrollY - startY) / run());
      tl.progress(1);
      introTween = gsap.to(tl, {
        progress: target,
        duration: target < 1 ? 1.6 : 0,
        delay: 0.25,
        ease: "flumpInOut",
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
            duration: 0.6,
            ease: "power3.out",
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
          { rotationX: 14, y: 30 },
          {
            rotationX: 0,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: stage,
              start: "top bottom",
              end: () => `top top+=${header()}`,
              scrub: 0.6,
            },
          },
        );
      }

      return () => root.removeEventListener("pointermove", onMove);
    }, root);
  };

  build();
  root.dataset.p4Live = "true";
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
    delete root.dataset.p4Live;
  };
}
