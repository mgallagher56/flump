import { formatPrice } from "@flump/business-details";
import { Button } from "@repo/ui";
import { type FC, useState } from "react";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import { PRICING } from "../../utils/pricing";
import { signupCta } from "../../utils/site";
import {
  cardGridStyle,
  cardStyle,
  checkStyle,
  containerStyle,
  eyebrowStyle,
  featureItemStyle,
  featureListStyle,
  featureStyle,
  fullWidthButtonStyle,
  headerBlockStyle,
  headingStyle,
  introStyle,
  linkResetStyle,
  mainStyle,
  pageStyle,
  pendingStyle,
  placeholderNoteStyle,
  planDescStyle,
  planNameStyle,
  priceRowStyle,
  priceSpacerStyle,
  priceStyle,
  priceUnitStyle,
  toggleLabelStyle,
  toggleRowStyle,
  toggleThumbStyle,
  toggleTrackStyle,
} from "./PricingPage.styles";

const featureIcon = (kind: "check" | "clock", className: string) => (
  <svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {kind === "check" ? (
      <polyline points="20 6 9 17 4 12" />
    ) : (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    )}
  </svg>
);

const FREE_FEATURES = [
  "£100k–£125k tax trap and childcare calculator",
  "Debt snowball vs avalanche payoff",
  "0% balance transfer payoff calculator",
  "Section 24 landlord tax calculator",
  "Mortgage overpayment vs Stocks and Shares ISA",
  "Arranged overdraft cost and payoff modeller",
  "Student loan overpayment comparison",
];

const BETA_STATEMENT =
  "Flump is a free, invite-only beta. Nothing is charged. A paid plan may come later and its price is not set.";

export const PricingPage: FC = () => {
  const cta = signupCta();
  const [isAnnual, setIsAnnual] = useState(false);
  // Build-time constant (vite.config.ts): false in a launch build with no price set, so the paid
  // card, toggle and placeholder price are dropped from the bundle.
  const paid = import.meta.env.VITE_SHOW_PAID_PLAN !== "false";

  return (
    <div className={pageStyle}>
      <PageMeta
        title="Pricing | Flump"
        description="Flump is a free, invite-only beta and nothing is charged. A paid plan may come later and its price is not set."
      />

      <Header />

      <main className={mainStyle}>
        <section className={containerStyle}>
          <div className={headerBlockStyle}>
            <span className={eyebrowStyle}>Pricing</span>
            <h1 className={headingStyle}>Pricing</h1>
            <p className={introStyle}>{BETA_STATEMENT}</p>

            {paid && (
              <div className={toggleRowStyle}>
                <span className={toggleLabelStyle({ active: !isAnnual })}>Monthly billing</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAnnual}
                  aria-label="Annual billing"
                  className={toggleTrackStyle}
                  onClick={() => setIsAnnual((v) => !v)}
                >
                  <span className={toggleThumbStyle({ checked: isAnnual })} />
                </button>
                <span className={toggleLabelStyle({ active: isAnnual })}>Annual billing</span>
              </div>
            )}
          </div>

          <div className={cardGridStyle({ paid })}>
            <div className={cardStyle} data-featured="false">
              <div>
                <h2 className={planNameStyle}>Free</h2>
                <p className={planDescStyle}>The calculators listed on the Flump tools page.</p>

                <div className={priceRowStyle}>
                  <span className={priceStyle}>Free today</span>
                </div>
                <div className={priceSpacerStyle} />

                <ul className={featureListStyle}>
                  {FREE_FEATURES.map((feature) => (
                    <li key={feature} className={featureItemStyle}>
                      {featureIcon("check", checkStyle)}
                      <span className={featureStyle}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <a href={cta.href} className={linkResetStyle}>
                <Button size="lg" variant="outline" className={fullWidthButtonStyle}>
                  {cta.label}
                </Button>
              </a>
            </div>

            {paid && (
              <div className={cardStyle} data-featured="true">
                <div>
                  <h2 className={planNameStyle}>Paid plan</h2>
                  <p className={planDescStyle}>
                    A possible future paid plan. Nothing is charged today and it cannot be
                    purchased.
                  </p>

                  <div className={priceRowStyle}>
                    <span className={priceStyle}>
                      {formatPrice(isAnnual ? PRICING.annual : PRICING.monthly)}
                    </span>
                    <span className={priceUnitStyle}>
                      {isAnnual ? "per year, billed annually" : "per month"}
                    </span>
                  </div>
                  <span className={placeholderNoteStyle}>{PRICING.label}</span>

                  <ul className={featureListStyle}>
                    <li className={featureItemStyle}>
                      {featureIcon("check", checkStyle)}
                      <span className={featureStyle}>Everything in Free</span>
                    </li>
                    <li className={featureItemStyle}>
                      {featureIcon("clock", pendingStyle)}
                      <span className={featureStyle}>Bank connection (planned, not available)</span>
                    </li>
                  </ul>
                </div>

                <Button size="lg" variant="primary" disabled className={fullWidthButtonStyle}>
                  Not available
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
