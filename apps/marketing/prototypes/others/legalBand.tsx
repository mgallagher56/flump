import { type FC, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import type { OrbLayout } from "./scene/orbScene";
import { HeroOrbs } from "./scene/SceneLayers";

/* ---------- Legal: still orbs in the header band of a production legal page ---------- */

/** Where the header band ends: from the top of main to just below the title block. */
const useHeaderBand = (wrapper: RefObject<HTMLDivElement | null>) => {
  const [band, setBand] = useState<{ top: number; height: number } | null>(null);
  // A passive effect: a child's layout effect runs before the wrapper's ref is attached.
  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const measure = () => {
      const main = element.querySelector<HTMLElement>("main");
      const block = element.querySelector<HTMLElement>("main h1")?.parentElement;
      if (!main || !block) return;
      const top = main.offsetTop;
      const bottom = block.getBoundingClientRect().bottom - element.getBoundingClientRect().top;
      setBand({ top, height: Math.round(bottom - top + 24) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [wrapper]);
  return band;
};

/** A production page rendered whole, with still orbs in its header band only. */
export const HeaderBandPage: FC<{ layout: OrbLayout; children: ReactNode }> = ({
  layout,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const band = useHeaderBand(ref);
  return (
    <div className="o1-legal" ref={ref}>
      {band && (
        <div className="o1-legal__band" style={{ top: band.top, height: band.height }}>
          <HeroOrbs layout={layout} />
        </div>
      )}
      {children}
    </div>
  );
};
