import { type FC, type ReactNode, type RefObject, useRef } from "react";
import { Link } from "react-router-dom";
import { bandLink } from "../../src/pages/HomePage/HomePage.styles";
import { MONEY_AREAS, type MoneyAreaKey } from "../../src/utils/featureAreas";
import { useGsap } from "../shared/useGsap";

const SHORT: Record<MoneyAreaKey, string> = {
  accounts: "Accounts",
  budget: "Budget",
  pay: "Pay",
  "savings-and-pension": "Savings",
  "debt-and-borrowing": "Debt",
};

/**
 * One area's section: its heading, lead, a sentence on the example, the link to its feature page,
 * and a stage with the area's scene. The section is the section-nav stop (normal flow); `pinRef`
 * wraps the content so a scene can pin that inner element.
 */
export const Scene: FC<{
  areaKey: MoneyAreaKey;
  note: ReactNode;
  children: ReactNode;
  layout?: "left" | "right" | "wide";
  setup: Parameters<typeof useGsap>[1];
}> = ({ areaKey, note, children, layout = "left", setup }) => {
  const area = MONEY_AREAS.find((a) => a.key === areaKey);
  const ref = useRef<HTMLElement>(null);
  useGsap(ref as RefObject<HTMLElement | null>, setup);
  if (!area) return null;
  const titleId = `p5-${areaKey}-title`;
  return (
    <section
      aria-labelledby={titleId}
      className={`p5-scene p5-scene--${layout}`}
      data-enhanced="false"
      data-proto-name={SHORT[areaKey]}
      data-proto-section=""
      id={`p5-${areaKey}`}
      ref={ref}
    >
      <div className="p5-scene__inner">
        <div className="p5-scene__text">
          <h2 className="p5-scene__title" id={titleId}>
            {area.h1}
          </h2>
          <p className="p5-scene__lead">{area.lead}</p>
          <p className="p5-scene__note">{note}</p>
          <Link className={`${bandLink()} p5-scene__link`} to={area.path}>
            About {area.name.toLowerCase()} in Flump
          </Link>
        </div>
        <div className="p5-scene__stage">{children}</div>
      </div>
    </section>
  );
};

/** Text for screen readers only (the visible copy is an animated, hidden duplicate). */
export const Sr: FC<{ children: ReactNode }> = ({ children }) => (
  <span className="p5-sr">{children}</span>
);
