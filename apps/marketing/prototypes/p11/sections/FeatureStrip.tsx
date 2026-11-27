import { ChevronLeft, ChevronRight } from "lucide-react";
import { type FC, type ReactNode, useEffect, useRef, useState } from "react";

/*
 * The features list. From 1024px it is a plain three-column grid. Below that the tiles run
 * sideways in one row (native scroll, nothing captured), with a visible peek of the next tile,
 * Previous and Next buttons, and one dot per tile (the current one marked). The position is
 * announced in visually hidden text, not shown as a count. The controls appear only once script
 * has measured an overflow, so the server-rendered page has no dead controls.
 */
export const FeatureStrip: FC<{ names: readonly string[]; children: ReactNode }> = ({
  names,
  children,
}) => {
  const count = names.length;
  const listRef = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({ overflow: false, first: 0, last: count - 1 });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const tiles = [...list.children] as HTMLElement[];
      const box = list.getBoundingClientRect();
      const shown = tiles
        .map((tile, i) => ({ r: tile.getBoundingClientRect(), i }))
        .filter(({ r }) => r.left >= box.left - 8 && r.right <= box.right + 8)
        .map(({ i }) => i);
      setState({
        overflow: list.scrollWidth > list.clientWidth + 4,
        first: shown[0] ?? 0,
        last: shown[shown.length - 1] ?? shown[0] ?? 0,
      });
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    list.addEventListener("scroll", queue, { passive: true });
    const observer = new ResizeObserver(queue);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", queue);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const smooth = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.querySelector('.proto[data-motion="reduce"]') !== null
      ? "auto"
      : "smooth";

  const goTo = (index: number) => {
    const list = listRef.current;
    const tile = list?.children[Math.max(0, Math.min(count - 1, index))] as HTMLElement | undefined;
    if (!list || !tile) return;
    const padding = Number.parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0;
    list.scrollTo({ left: tile.offsetLeft - list.offsetLeft - padding, behavior: smooth() });
  };

  const current = state.first;
  const where =
    state.first === state.last
      ? `${names[state.first]}, ${state.first + 1} of ${count}`
      : `${names[state.first]} to ${names[state.last]}, ${state.first + 1} to ${state.last + 1} of ${count}`;

  return (
    <div className="p11-strip">
      <ul aria-label="Flump features" className="p11-features" id="p11-features-list" ref={listRef}>
        {children}
      </ul>
      <div className="p11-strip__controls" hidden={!state.overflow}>
        <button
          aria-controls="p11-features-list"
          aria-label="Previous areas"
          className="p11-strip__button"
          data-light=""
          disabled={state.first <= 0}
          onClick={() => goTo(state.first - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={20} />
        </button>
        <div className="p11-strip__dots">
          {names.map((name, i) => (
            <button
              aria-controls="p11-features-list"
              aria-current={i === current ? "true" : undefined}
              aria-label={`Go to ${name}`}
              className="p11-strip__dot"
              key={name}
              onClick={() => goTo(i)}
              type="button"
            >
              <span aria-hidden="true" className="p11-strip__pip" />
            </button>
          ))}
        </div>
        <button
          aria-controls="p11-features-list"
          aria-label="Next areas"
          className="p11-strip__button"
          data-light=""
          disabled={state.last >= count - 1}
          onClick={() => goTo(state.first + 1)}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={20} />
        </button>
        <p aria-live="polite" className="p11-sr">
          {where}
        </p>
      </div>
    </div>
  );
};
