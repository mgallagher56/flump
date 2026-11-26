import { type FC, type ReactNode, useRef } from "react";
import { Link } from "react-router-dom";
import { ClosingCta } from "../../src/components/ClosingCta";
import { MarketingSection } from "../../src/components/MarketingSection";
import { bandFooter, bandLink } from "../../src/pages/HomePage/HomePage.styles";
import { FEATURES_INDEX, MONEY_AREAS, type MoneyAreaKey } from "../../src/utils/featureAreas";
import { signupCta } from "../../src/utils/site";
import {
  areaFor,
  FaqSection,
  HOME_DEPTH,
  PaySection,
  ROUGH_FIGURE_STEPS,
  SecuritySection,
} from "../shared/sections";
import { useGsap } from "../shared/useGsap";
import { Piece } from "./Pieces";
import type { PieceKey } from "./pieceData";
import {
  areasMoment,
  closingMoment,
  depthMoment,
  faqMoment,
  payMoment,
  securityMoment,
  stepsMoment,
} from "./sectionMoments";

/** Each area keeps the piece it is made from in the hero, so the page reads as one story. */
const AREA_PIECE: Record<MoneyAreaKey, PieceKey> = {
  accounts: "card",
  budget: "receipt",
  pay: "payslip",
  "savings-and-pension": "pension",
  "debt-and-borrowing": "statement",
};

/** A section stop for SectionNav, in normal flow, with one GSAP moment scoped to it. */
const Stop: FC<{
  name: string;
  labelledBy: string;
  className?: string;
  moment: Parameters<typeof useGsap>[1];
  children: ReactNode;
}> = ({ name, labelledBy, className = "", moment, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useGsap(ref, moment);
  return (
    // biome-ignore lint/a11y/useSemanticElements: a labelled scroll stop for SectionNav, not a form group.
    <div
      aria-labelledby={labelledBy}
      className={`p4-stop ${className}`}
      role="group"
      data-proto-name={name}
      data-proto-section=""
      ref={ref}
    >
      {children}
    </div>
  );
};

const AreasSection: FC = () => (
  <Stop className="p4-areas-stop" labelledBy="areas-title" moment={areasMoment} name="Five areas">
    <MarketingSection
      id="areas"
      subtitle="The same five areas as the app. Use one or all five."
      title={FEATURES_INDEX.title}
      tone="card"
    >
      <ul className="p4-areas">
        {MONEY_AREAS.map((area) => (
          <li className="p4-area" key={area.key}>
            <div aria-hidden="true" className="p4-area__piece">
              <Piece className="p4-piece--mini" k={AREA_PIECE[area.key]} />
            </div>
            <div className="p4-area__text">
              <h3 className="p4-area__name">
                <Link className="p4-area__link" to={area.path}>
                  {area.name}
                </Link>
              </h3>
              <p className="p4-area__lead">{area.lead}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className={bandFooter()}>
        <Link className={bandLink()} to={FEATURES_INDEX.path}>
          All Flump features on one page
        </Link>
      </p>
    </MarketingSection>
  </Stop>
);

const StepsSection: FC = () => (
  <Stop labelledBy="rough-figures-title" moment={stepsMoment} name="Rough figures">
    <MarketingSection id="rough-figures" title="Start with rough figures">
      <div className="p4-steps">
        <span aria-hidden="true" className="p4-steps__track">
          <span className="p4-steps__line" />
        </span>
        <ol className="p4-steps__list">
          {ROUGH_FIGURE_STEPS.map((step, index) => (
            <li aria-labelledby={`p4-step-${step.id}`} className="p4-step" key={step.id}>
              <span aria-hidden="true" className="p4-step__node tabular-nums">
                {index + 1}
              </span>
              <h3 className="p4-step__title" id={`p4-step-${step.id}`}>
                {step.title}
              </h3>
              <p className="p4-step__body">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </MarketingSection>
  </Stop>
);

const DepthSection: FC = () => (
  <Stop labelledBy="more-detail-title" moment={depthMoment} name="More detail">
    <MarketingSection
      id="more-detail"
      subtitle="Each area starts simple and has more underneath for when you want it."
      title="More detail when you want it"
      tone="card"
    >
      <ul className="p4-depth">
        {HOME_DEPTH.map((item) => {
          const area = areaFor(item.area);
          return (
            <li className="p4-depth__sheet" key={item.area}>
              <span className="p4-depth__text">{item.text}</span>
              {area && (
                <Link className={bandLink()} to={area.path}>
                  About {area.name.toLowerCase()} in Flump
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </MarketingSection>
  </Stop>
);

const MiniDeck: FC = () => (
  <div aria-hidden="true" className="p4-deck">
    {(["statement", "payslip", "receipt", "pension", "credit", "card"] as const).map((k) => (
      <Piece className="p4-piece--mini p4-deck__piece" k={k} key={k} />
    ))}
  </div>
);

/** Everything below the hero: compact bands, each with one moment. */
export const P4Sections: FC = () => {
  const cta = signupCta();
  return (
    <>
      <AreasSection />
      <StepsSection />
      <DepthSection />
      <Stop labelledBy="pay-rise-title" moment={payMoment} name="Pay rise">
        <PaySection />
      </Stop>
      <Stop labelledBy="security-title" moment={securityMoment} name="Security">
        <SecuritySection />
      </Stop>
      <Stop labelledBy="faq-title" moment={faqMoment} name="Questions">
        <FaqSection />
      </Stop>
      <Stop labelledBy="home-cta-title" moment={closingMoment} name="Get started">
        <ClosingCta
          cta={cta}
          id="get-started"
          illustration={<MiniDeck />}
          text="Start with a few rough numbers."
          title="Ready to see where you stand?"
          titleId="home-cta-title"
        />
      </Stop>
    </>
  );
};
