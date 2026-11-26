import { useEffect, useRef, useState } from "react";
import { useMotion } from "../../shared/motion";
import { TIMING, usePace } from "../../shared/pace";

/**
 * A number that glides to each new value (prototype 5's counting, paced): up or down, eased out,
 * never past the value. It starts at zero and counts up once `node` is well in view. With reduced
 * motion it is always the value itself.
 */
export function useTweened(value: number, node: Element | null, calmMs = TIMING.count * 0.6) {
  const { reduced } = useMotion();
  const pace = usePace();
  const [shown, setShown] = useState(value);
  const [armed, setArmed] = useState(false);
  const shownRef = useRef(value);
  const raf = useRef(0);

  // Before arrival the figure waits at zero, then counts up when it comes into view.
  useEffect(() => {
    if (reduced || !node) return;
    const top = node.getBoundingClientRect().top;
    if (top < window.innerHeight * 0.8) {
      setArmed(true);
      return;
    }
    shownRef.current = 0;
    setShown(0);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        setArmed(true);
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, reduced]);

  useEffect(() => {
    if (reduced) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    if (!armed) return;
    const from = shownRef.current;
    const start = performance.now();
    const duration = pace.ms(calmMs);
    cancelAnimationFrame(raf.current);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (value - from) * eased;
      shownRef.current = next;
      setShown(next);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, armed, reduced, pace, calmMs]);

  return shown;
}
