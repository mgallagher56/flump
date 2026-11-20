import { Button, Card, Illustration } from "@repo/ui";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { BaselineSnapshotPreview } from "../../components/BaselineSnapshotPreview";
import { FeatureTiles } from "../../components/FeatureTiles";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { HomeFAQ } from "../../components/HomeFAQ";
import { MarketingSection } from "../../components/MarketingSection";
import { PageMeta } from "../../components/PageMeta";
import { PayRiseTeaser } from "../../components/PayRiseTeaser";
import { SecurityPrivacySection } from "../../components/SecurityPrivacySection";
import { FEATURES_INDEX, MONEY_AREAS, type MoneyAreaKey } from "../../utils/featureAreas";
import { SITE_TAGLINE, signupCta } from "../../utils/site";
import {
  bandFooter,
  bandIllustration,
  bandLink,
  ctaRow,
  depthItem,
  depthList,
  finalCta,
  finalCtaBody,
  finalCtaIllustration,
  finalCtaTitle,
  hero,
  heroHeading,
  heroInner,
  heroLead,
  heroText,
  mainContent,
  pageShell,
  stepBody,
  stepGrid,
  stepTitle,
} from "./HomePage.styles";

/** "Start with rough figures" (E42 S5): what the reader does, in three steps. */
const ROUGH_FIGURE_STEPS = [
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

/** "More detail when you want it": one deeper tool from four areas, each linked to its page. */
const HOME_DEPTH: readonly { area: MoneyAreaKey; text: string }[] = [
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

const areaFor = (key: MoneyAreaKey) => MONEY_AREAS.find((area) => area.key === key);

/**
 * Marketing home (E42 S5, D2): the hero with the decided headline and the sample dashboard; "Flump
 * features" (the five area tiles and the AI connection tile); "Start with rough figures"; "More
 * detail when you want it"; the two-slider pay rise tool; the security strip; then one band holding
 * the FAQ and the final call to action. "Request an invite" appears twice in the page body (hero
 * and end).
 */
export const HomePage: FC = () => {
  const cta = signupCta();

  return (
    <div className={pageShell()}>
      <PageMeta
        title={SITE_TAGLINE}
        description={`${SITE_TAGLINE}. Accounts, budget, pay, savings, pension and debts in one place, under UK rules, from figures you type in.`}
      />

      <Header />

      <main className={mainContent()} id="main" tabIndex={-1}>
        <section aria-labelledby="home-title" className={hero()} data-testid="home-hero">
          <div className={heroInner()}>
            <div className={heroText()}>
              <h1 className={heroHeading()} id="home-title">
                All your money. One clear picture.
              </h1>
              <p className={heroLead()}>
                Accounts, budget, pay, savings, pension and debts in one place.
              </p>
              <div className={ctaRow()}>
                <Button asChild size="lg" variant="primary">
                  <a href={cta.href}>{cta.label}</a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="/preview">Interactive preview</a>
                </Button>
              </div>
            </div>
            <BaselineSnapshotPreview />
          </div>
        </section>

        <MarketingSection
          id="features"
          subtitle="The same five areas as the app. Use one or all five."
          title={FEATURES_INDEX.title}
          tone="apricot"
        >
          <FeatureTiles headingLevel={3} />
          <p className={bandFooter()}>
            <Link className={bandLink()} to={FEATURES_INDEX.path}>
              All Flump features on one page
            </Link>
          </p>
        </MarketingSection>

        <MarketingSection id="rough-figures" title="Start with rough figures">
          <ol className={stepGrid()}>
            {ROUGH_FIGURE_STEPS.map((step) => (
              <Card as="li" aria-labelledby={`step-${step.id}`} key={step.id} padding="lg">
                <h3 className={stepTitle()} id={`step-${step.id}`}>
                  {step.title}
                </h3>
                <p className={stepBody()}>{step.body}</p>
              </Card>
            ))}
          </ol>
          {/* No figures in this band, so the scene pushes nothing down on a phone (B10). */}
          <div className={bandIllustration()} data-testid="rough-figures-illustration">
            <Illustration scene="check-in" size="sm" settle={false} />
          </div>
        </MarketingSection>

        <MarketingSection
          id="more-detail"
          subtitle="Each area starts simple and has more underneath for when you want it."
          title="More detail when you want it"
        >
          <ul className={depthList()}>
            {HOME_DEPTH.map((item) => {
              const area = areaFor(item.area);
              return (
                <li className={depthItem()} key={item.area}>
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

        <PayRiseTeaser link="area" />

        <SecurityPrivacySection />

        {/* The fifth band: FAQ, then the final call to action in the same band (R2-10). The
            heading starts at the left like every other band's (P74). */}
        <MarketingSection id="faq" title="Frequently asked questions" tone="sage" width="narrow">
          <HomeFAQ />
          <div className={finalCta()} data-testid="home-final-cta" id="get-started">
            <div className={finalCtaIllustration()} data-testid="home-final-cta-illustration">
              <Illustration scene="onboarding" size="sm" settle={false} />
            </div>
            <h3 className={finalCtaTitle()} id="home-cta-title">
              Ready to see where you stand?
            </h3>
            <p className={finalCtaBody()}>Start with a few rough numbers.</p>
            <Button asChild size="lg" variant="primary">
              <a href={cta.href}>{cta.label}</a>
            </Button>
          </div>
        </MarketingSection>
      </main>

      <Footer />
    </div>
  );
};
