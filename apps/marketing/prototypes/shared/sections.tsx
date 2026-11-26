import { Button, Card, Illustration } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ClosingCta } from "../../src/components/ClosingCta";
import { FeatureTiles } from "../../src/components/FeatureTiles";
import { HomeFAQ } from "../../src/components/HomeFAQ";
import { MarketingSection } from "../../src/components/MarketingSection";
import { PayRiseTeaser } from "../../src/components/PayRiseTeaser";
import { SecurityPrivacySection } from "../../src/components/SecurityPrivacySection";
import {
  bandFooter,
  bandIllustration,
  bandLink,
  ctaRow,
  depthItem,
  depthList,
  finalCtaIllustration,
  stepBody,
  stepGrid,
  stepLayout,
  stepTitle,
} from "../../src/pages/HomePage/HomePage.styles";
import { FEATURES_INDEX, MONEY_AREAS, type MoneyAreaKey } from "../../src/utils/featureAreas";
import { signupCta } from "../../src/utils/site";

/*
 * The real home page's content, split into sections each prototype can wrap or replace. Copied
 * from HomePage.tsx (26 Nov 2026) so the production page stays untouched.
 */

export const ROUGH_FIGURE_STEPS = [
  {
    id: "enter",
    title: "Enter rough figures",
    body: "Type in rough totals for what you own, what you owe, what comes in and what goes out. No bank login is needed.",
  },
  {
    id: "see",
    title: "See where you stand",
    body: "Your Home page shows your net worth, what is left over each month and your breathing room.",
  },
  {
    id: "check-in",
    title: "Check in once a month",
    body: "A short check-in asks for the new balances, and the history page shows how they have changed.",
  },
] as const;

export const HOME_DEPTH: readonly { area: MoneyAreaKey; text: string }[] = [
  {
    area: "pay",
    text: "Self Assessment: income and costs for each tax year, with an estimate of your tax bill",
  },
  {
    area: "savings-and-pension",
    text: "A retirement plan: an estimate of your yearly income against a target you set",
  },
  {
    area: "debt-and-borrowing",
    text: "Overpay or save, compared, and an estimate of your payment when a fixed rate ends",
  },
  {
    area: "accounts",
    text: "Your share of a joint account, and a choice of what counts towards net worth",
  },
];

export const areaFor = (key: MoneyAreaKey) => MONEY_AREAS.find((area) => area.key === key);

export const HeroCtas: FC = () => {
  const cta = signupCta();
  return (
    <div className={ctaRow()}>
      <Button asChild size="lg" variant="primary">
        <a data-proto="cta-primary" href={cta.href}>
          {cta.label}
        </a>
      </Button>
      <Button asChild size="lg" variant="outline">
        <a data-proto="cta-secondary" href="/preview">
          Interactive preview
        </a>
      </Button>
    </div>
  );
};

/** A wrapper the prototype CSS can hook (reveal, depth) without touching the real component. */
export const Reveal: FC<{ children: ReactNode; kind?: string }> = ({
  children,
  kind = "section",
}) => (
  <div className="proto-reveal" data-reveal={kind}>
    {children}
  </div>
);

export const FeaturesSection: FC = () => (
  <MarketingSection
    id="features"
    subtitle="The same five areas as the app. Use one or all five."
    title={FEATURES_INDEX.title}
    tone="card"
  >
    <div className="proto-tiles">
      <FeatureTiles headingLevel={3} />
    </div>
    <p className={bandFooter()}>
      <Link className={bandLink()} to={FEATURES_INDEX.path}>
        All Flump features on one page
      </Link>
    </p>
  </MarketingSection>
);

export const RoughFiguresSection: FC = () => (
  <MarketingSection id="rough-figures" title="Start with rough figures">
    <div className={stepLayout()}>
      <ol className={`${stepGrid()} proto-steps`}>
        {ROUGH_FIGURE_STEPS.map((step, index) => (
          <Card
            as="li"
            aria-labelledby={`step-${step.id}`}
            key={step.id}
            padding="lg"
            style={{ "--proto-i": index } as React.CSSProperties}
          >
            <h3 className={stepTitle()} id={`step-${step.id}`}>
              {step.title}
            </h3>
            <p className={stepBody()}>{step.body}</p>
          </Card>
        ))}
      </ol>
      <div className={bandIllustration()}>
        <Illustration scene="check-in" size="xl" settle={false} />
      </div>
    </div>
  </MarketingSection>
);

export const MoreDetailSection: FC = () => (
  <MarketingSection
    id="more-detail"
    subtitle="Each area starts simple and has more underneath for when you want it."
    title="More detail when you want it"
    tone="card"
  >
    <ul className={`${depthList()} proto-depth`}>
      {HOME_DEPTH.map((item, index) => {
        const area = areaFor(item.area);
        return (
          <li
            className={depthItem()}
            key={item.area}
            style={{ "--proto-i": index } as React.CSSProperties}
          >
            <span>{item.text}</span>
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
);

export const PaySection: FC = () => <PayRiseTeaser link="area" />;

export const SecuritySection: FC = () => <SecurityPrivacySection />;

export const FaqSection: FC = () => (
  <MarketingSection id="faq" title="Frequently asked questions" tone="card" width="narrow">
    <HomeFAQ />
  </MarketingSection>
);

export const ClosingSection: FC = () => {
  const cta = signupCta();
  return (
    <ClosingCta
      cta={cta}
      id="get-started"
      illustration={
        <div className={finalCtaIllustration()}>
          <Illustration scene="onboarding" size="xl" settle={false} />
        </div>
      }
      text="Start with a few rough numbers."
      title="Ready to see where you stand?"
      titleId="home-cta-title"
    />
  );
};
