import { type FC, type RefObject, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { PrivacyPage } from "../../../src/pages/PrivacyPage";
import { OTHER_NAMES, OtherShell } from "../OtherShell";
import { legalLayout, pageLayout } from "../scene/layouts";
import { HeroOrbs, PageOrbs } from "../scene/SceneLayers";

/*
 * One legal page (family G): production's privacy notice itself, unchanged, rendered whole. The
 * rule for legal text is tokens and material only, and nothing moving near it: no entrances, no
 * counting, no bubbles, no tilt. The switch shows the four choices for the header band:
 *
 * - Nothing: the page as production has it.
 * - S0: still glass orbs in the header band only, in the margins beside the reading column on wide
 *   screens and small above the title on phones. Never beside or behind the text below.
 * - S1: the same orbs live (offered so the owner can see it; not recommended).
 * - S2: the whole-page canvas behind the long text (offered to show why not).
 */

/** Measures where the header band ends: from the top of main to just below the title block. */
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

const LegalHeaderOrbs: FC<{ wrapper: RefObject<HTMLDivElement | null> }> = ({ wrapper }) => {
  const band = useHeaderBand(wrapper);
  if (!band) return null;
  return (
    <div className="o1-legal__band" style={{ top: band.top, height: band.height }}>
      <HeroOrbs layout={legalLayout(["teal", "violet", "sky", "rose"])} />
    </div>
  );
};

const Body: FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="o1-legal" ref={ref}>
      <LegalHeaderOrbs wrapper={ref} />
      <PrivacyPage />
    </div>
  );
};

export const PrivacyProto: FC = () => (
  <OtherShell defaultLevel="s0" id="privacy" levels={["none", "s0", "s1", "s2"]}>
    <PageOrbs layout={pageLayout(["teal", "violet", "sky", "rose"])} />
    <Body />
    {/* After the page's own title, so the tab says it is the prototype. */}
    <Helmet>
      <title>{`${OTHER_NAMES.privacy} | Flump motion prototype`}</title>
    </Helmet>
  </OtherShell>
);
