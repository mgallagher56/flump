import { ChevronDown } from "lucide-react";
import { type CSSProperties, type FC, type RefObject, useEffect, useState } from "react";
import { HOME_FAQS } from "../../src/components/HomeFAQ/HomeFAQ";
import type { GsapKit } from "./gsapKit";
import { useMotion } from "./motion";
import { type PaceState, SCROLL, TIMING, usePace } from "./pace";
import "./kit3.css";

/*
 * Round three's shared pieces (prototypes 8 to 10). Everything takes its timing from pace.tsx.
 */

/* ---------------------------------------------------------------------------------------------
 * Pointer light and tilt (from 1b). Mark buttons `data-light` and cards `data-tilt`; call
 * `usePointerLightAndTilt(rootRef)` once per page. Touch: a press tilts toward the finger.
 * ------------------------------------------------------------------------------------------- */

export function usePointerLightAndTilt(root: RefObject<HTMLElement | null>, maxDeg = 4): void {
  const { reduced } = useMotion();
  useEffect(() => {
    const element = root.current;
    if (!element || reduced) return;
    let raf = 0;
    let pending: PointerEvent | null = null;
    const apply = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const light = target?.closest<HTMLElement>("[data-light]");
      if (light && event.pointerType !== "touch") {
        const r = light.getBoundingClientRect();
        const x = event.clientX - r.left;
        const y = event.clientY - r.top;
        light.style.setProperty("--lx", `${x}px`);
        light.style.setProperty("--ly", `${y}px`);
        light.style.setProperty("--tx", `${((x / r.width - 0.5) * 4).toFixed(2)}px`);
        light.style.setProperty("--ty", `${((y / r.height - 0.5) * 3).toFixed(2)}px`);
      }
      const card = target?.closest<HTMLElement>("[data-tilt]");
      if (card) {
        const r = card.getBoundingClientRect();
        const px = (event.clientX - r.left) / r.width;
        const py = (event.clientY - r.top) / r.height;
        card.style.setProperty("--ry", `${((px - 0.5) * 2 * maxDeg).toFixed(2)}deg`);
        card.style.setProperty("--rx", `${((0.5 - py) * 2 * maxDeg).toFixed(2)}deg`);
        card.style.setProperty("--hx", `${(px * 100).toFixed(1)}%`);
        card.style.setProperty("--hy", `${(py * 100).toFixed(1)}%`);
        card.dataset.tilting = "on";
      }
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pending = event;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (pending) apply(pending);
        });
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") apply(event);
    };
    const settle = (node: HTMLElement | null) => {
      if (!node) return;
      node.style.setProperty("--rx", "0deg");
      node.style.setProperty("--ry", "0deg");
      node.style.setProperty("--tx", "0px");
      node.style.setProperty("--ty", "0px");
      node.dataset.tilting = "off";
    };
    const onOut = (event: PointerEvent) => {
      const from = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-tilt], [data-light]",
      );
      const to = (event.relatedTarget as HTMLElement | null)?.closest?.(
        "[data-tilt], [data-light]",
      );
      if (from && from !== to) settle(from);
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerType === "touch")
        settle((event.target as HTMLElement | null)?.closest<HTMLElement>("[data-tilt]") ?? null);
    };
    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointerout", onOut);
    element.addEventListener("pointerup", onUp);
    element.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(raf);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointerout", onOut);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onUp);
    };
  }, [root, reduced, maxDeg]);
}

/* ---------------------------------------------------------------------------------------------
 * Bubble backdrop (from 2 and 3). Place first inside a positioned band; content after it sits
 * above. Colours follow the panel's Bubbles choice and the theme. Decoration only.
 * ------------------------------------------------------------------------------------------- */

type Bubble = {
  size: number;
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  travel: number;
};

const LAYOUTS: Record<"a" | "b" | "c", Bubble[]> = {
  a: [
    { size: 260, right: "-90px", top: "8%", travel: 24 },
    { size: 120, right: "12%", bottom: "6%", travel: 60 },
    { size: 70, left: "-20px", top: "34%", travel: 100 },
  ],
  b: [
    { size: 300, left: "-140px", bottom: "8%", travel: 24 },
    { size: 96, right: "4%", top: "12%", travel: 60 },
    { size: 54, right: "24%", bottom: "4%", travel: 100 },
  ],
  c: [
    { size: 180, right: "-60px", bottom: "12%", travel: 30 },
    { size: 80, left: "6%", top: "10%", travel: 80 },
  ],
};

export const Bubbles: FC<{ layout?: "a" | "b" | "c" }> = ({ layout = "a" }) => (
  <div aria-hidden="true" className="proto-bubbles">
    {LAYOUTS[layout].map((b, i) => (
      <span
        className="proto-bubbles__bubble"
        key={i}
        style={
          {
            width: b.size,
            height: b.size,
            left: b.left,
            right: b.right,
            top: b.top,
            bottom: b.bottom,
            "--from": `${b.travel}px`,
            "--to": `${-b.travel}px`,
          } as CSSProperties
        }
      />
    ))}
  </div>
);

/* ---------------------------------------------------------------------------------------------
 * The "More detail when you want it" moment from prototype 4: a stack of sheets that deals out
 * into the list as it scrolls in. Used for More detail and for the FAQ. Small, slow depth only.
 * ------------------------------------------------------------------------------------------- */

export function unstackMoment(
  { gsap }: GsapKit,
  list: HTMLElement,
  sheetSelector: string,
  pace: PaceState,
): void {
  const sheets = gsap.utils.toArray<HTMLElement>(list.querySelectorAll(sheetSelector));
  const first = sheets[0];
  if (!first) return;
  gsap.fromTo(
    sheets,
    {
      y: (i: number) => -(sheets[i]?.offsetTop ?? 0) + first.offsetTop + i * 7,
      z: (i: number) => -i * 20,
      opacity: (i: number) => (i ? 0.85 : 1),
      transformPerspective: 1200,
      transformOrigin: "50% 0%",
    },
    {
      y: 0,
      z: 0,
      opacity: 1,
      ease: "calmInOut",
      stagger: 0.12,
      scrollTrigger: {
        trigger: list,
        start: "top 85%",
        end: () => `+=${pace.px(SCROLL.moment)}`,
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    },
  );
}

/* ---------------------------------------------------------------------------------------------
 * The FAQ with smooth opening and closing (no unmounting, no height jumps). Same questions and
 * answers as the real page. The first answer starts open, as on the real page.
 * ------------------------------------------------------------------------------------------- */

export const SmoothFaq: FC = () => {
  const [openId, setOpenId] = useState<string | null>(HOME_FAQS[0]?.id ?? null);
  return (
    <ul className="proto-faq">
      {HOME_FAQS.map((faq) => {
        const open = openId === faq.id;
        return (
          <li className="proto-faq__item" key={faq.id}>
            <button
              aria-controls={`proto-faq-${faq.id}`}
              aria-expanded={open}
              className="proto-faq__question"
              id={`proto-faq-q-${faq.id}`}
              onClick={() => setOpenId(open ? null : faq.id)}
              type="button"
            >
              <span>{faq.q}</span>
              <ChevronDown aria-hidden="true" className="proto-faq__chevron" size={18} />
            </button>
            <section
              aria-labelledby={`proto-faq-q-${faq.id}`}
              className="proto-faq__answer"
              data-open={open}
              id={`proto-faq-${faq.id}`}
              inert={!open}
            >
              <div>
                <p>{faq.a}</p>
              </div>
            </section>
          </li>
        );
      })}
    </ul>
  );
};

/* ---------------------------------------------------------------------------------------------
 * A figure that counts to its value once when it arrives (from 5), paced. The final value is in
 * the markup for screen readers and with reduced motion; only an aria-hidden copy counts.
 * ------------------------------------------------------------------------------------------- */

export const CountTo: FC<{ value: number; format: (n: number) => string; className?: string }> = ({
  value,
  format,
  className,
}) => {
  const { reduced } = useMotion();
  const pace = usePace();
  const [shown, setShown] = useState<string | null>(null);
  const [node, setNode] = useState<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!node || reduced) return;
    let raf = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = pace.ms(TIMING.count);
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - (1 - t) ** 3;
          setShown(format(Math.round(value * eased)));
          if (t < 1) raf = requestAnimationFrame(step);
          else setShown(null);
        };
        setShown(format(0));
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [node, reduced, value, format, pace]);
  return (
    <span className={className} ref={setNode} style={{ fontVariantNumeric: "tabular-nums" }}>
      {shown === null ? (
        format(value)
      ) : (
        <>
          <span
            className="p1b-sr"
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              overflow: "hidden",
              clipPath: "inset(50%)",
            }}
          >
            {format(value)}
          </span>
          <span aria-hidden="true">{shown}</span>
        </>
      )}
    </span>
  );
};
