import { type FC, type ReactNode, type RefObject, useRef } from "react";
import { Link } from "react-router-dom";
import { bandLink } from "../../src/pages/HomePage/HomePage.styles";
import { MONEY_AREAS, type MoneyAreaKey } from "../../src/utils/featureAreas";
import type { GsapKit } from "../shared/gsapKit";
import { type PaceState, usePace } from "../shared/pace";
import { Bubbles } from "../shared/round3";
import { useGsap } from "../shared/useGsap";
import { arrive } from "./moments";

const SHORT: Record<MoneyAreaKey, string> = {
  accounts: "Accounts",
  budget: "Budget",
  pay: "Pay",
  "savings-and-pension": "Savings",
  "debt-and-borrowing": "Debt",
};

/**
 * One area's scene (from prototype 5, tightened): heading, lead, a sentence on the example, the
 * link to its feature page, and a stage. The text arrives like 5's cards; `setup` scrubs the
 * stage. The section is the SectionNav stop and sits in normal flow.
 */
export const Scene: FC<{
  areaKey: MoneyAreaKey;
  note: ReactNode;
  children: ReactNode;
  layout?: "left" | "right";
  tone?: "canvas" | "card";
  bubbles?: "a" | "b" | "c";
  setup: (kit: GsapKit, root: HTMLElement, pace: PaceState) => (() => void) | undefined;
}> = ({ areaKey, note, children, layout = "left", tone = "canvas", bubbles = "c", setup }) => {
  const area = MONEY_AREAS.find((a) => a.key === areaKey);
  const ref = useRef<HTMLElement>(null);
  const pace = usePace();
  useGsap(
    ref as RefObject<HTMLElement | null>,
    (kit, root) => {
      const text = root.querySelector(".p10-sc-scene__text");
      if (text) arrive(kit, text, text.children, pace);
      return setup(kit, root, pace);
    },
    [pace.pace],
  );
  if (!area) return null;
  const titleId = `p10-${areaKey}-title`;
  return (
    <section
      aria-labelledby={titleId}
      className={`p10-sc-scene p10-sc-scene--${layout} p10-tone--${tone}`}
      data-enhanced="false"
      data-proto-name={SHORT[areaKey]}
      data-proto-section=""
      id={`p10-${areaKey}`}
      ref={ref}
    >
      <Bubbles layout={bubbles} />
      <div className="p10-sc-scene__inner">
        <div className="p10-sc-scene__text">
          <h2 className="p10-sc-scene__title" id={titleId}>
            {area.h1}
          </h2>
          <p className="p10-sc-scene__lead">{area.lead}</p>
          <p className="p10-sc-scene__note">{note}</p>
          <Link className={`${bandLink()} p10-sc-scene__link`} to={area.path}>
            About {area.name.toLowerCase()} in Flump
          </Link>
        </div>
        <div className="p10-sc-scene__stage">{children}</div>
      </div>
    </section>
  );
};

/** Text for screen readers only (the visible copy is an animated, hidden duplicate). */
export const Sr: FC<{ children: ReactNode }> = ({ children }) => (
  <span className="p10-sc-sr">{children}</span>
);
