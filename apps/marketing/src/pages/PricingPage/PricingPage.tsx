import { Button, Icon, marketingMs } from "@repo/ui";
import { Check } from "lucide-react";
import { type FC, useRef } from "react";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { HeroBand } from "../../components/HeroBand";
import { MarketingBand } from "../../components/MarketingBand";
import { MarketingPageShell } from "../../components/MarketingPageShell";
import { PageMeta } from "../../components/PageMeta";
import { SoftCard } from "../../components/SoftCard";
import { type HeroOrbTones, StillHeroOrbs } from "../../components/StillHeroOrbs";
import type { GsapKit } from "../../motion/loadGsapKit";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { PRICING } from "../../utils/pricing";
import { signupCta } from "../../utils/site";
import {
  featureIcon,
  featureItem,
  featureList,
  mainContent,
  paidLine,
  paidName,
  paidNote,
  paidPrice,
  planBand,
  planCard,
  planName,
  stack,
} from "./PricingPage.styles";

/**
 * The intro. "Free during the beta" is said once, in the plan card (R2-10); the home FAQ says the
 * same in its own words.
 */
export const BETA_STATEMENT = "One plan you can use today.";

/** What the beta includes: the five areas, as the app names them, and how figures get in (E42 S6). */
export const BETA_FEATURES = [
  "All five areas of the Flump app: accounts, budget, pay, savings and pension, and debt and borrowing",
  "Your own figures, typed in. No bank login is needed",
] as const;

/** The hero's orbs, biggest first (the approved pricing prototype). */
const PRICING_HERO_TONES: HeroOrbTones = ["sky", "violet", "teal", "rose"];

/**
 * The plan arrives once, then its ticks in turn, then the paid line (the approved prototype's
 * `planMoment`): on time, never tied to scroll, and nothing counts (MK2). Cleared at rest (MK3).
 */
function planMoment({ gsap }: GsapKit, root: HTMLElement): undefined {
  const stagger = marketingMs("stagger") / 1000;
  const card = root.querySelector("[data-plan='beta']");
  if (!card) return;
  gsap
    .timeline({
      scrollTrigger: { trigger: card, start: "top 88%", once: true },
      defaults: {
        ease: "calm",
        duration: marketingMs("entry") / 1000,
        clearProps: "transform,opacity",
      },
    })
    .from(card, { y: 16, opacity: 0 }, 0)
    .from(card.querySelectorAll("li"), { y: 8, opacity: 0, stagger }, stagger * 2)
    .from(root.querySelectorAll("[data-plan='paid']"), { y: 8, opacity: 0 }, stagger * 4);
}

/**
 * Pricing (E16 PR 12, D10 b; the approved pricing prototype, 27 Nov 2026, OTHER-PAGES-PLAN slice
 * P2): the compact hero with still orbs (scene level S0, no script), then the beta plan as a glass
 * card, first and prominent, and the possible paid plan as one quiet line with "Price not set". By
 * the rules for prices: no picture beside it, no tilt, no counting, nothing scroll-driven, and the
 * bubbles stay at the band's far edges (none under 64rem, where they would sit behind the card).
 */
export const PricingPage: FC = () => {
  const cta = signupCta();
  const ref = useRef<HTMLDivElement>(null);
  useGsapMoment(ref, planMoment);
  // Build-time constant (vite.config.ts): false in a launch build with no price set, so the paid
  // line is dropped from the bundle.
  const paid = import.meta.env.VITE_SHOW_PAID_PLAN !== "false";

  return (
    <MarketingPageShell>
      <PageMeta
        title="Pricing | Flump"
        description="Flump is free during the beta and nothing is charged. A paid plan may come later and its price is not set."
      />

      <Header />

      <main className={mainContent} id="main" tabIndex={-1}>
        <HeroBand
          compact
          data-testid="pricing-hero"
          lead={BETA_STATEMENT}
          orbs={<StillHeroOrbs tones={PRICING_HERO_TONES} />}
          title="Pricing"
          titleId="pricing-title"
        />
        <MarketingBand bubbles="c" className={planBand} id="plans" tone="card" width="narrow">
          <div className={stack} ref={ref}>
            <SoftCard
              aria-labelledby="plan-beta"
              as="section"
              className={planCard}
              data-plan="beta"
            >
              <h2 className={planName} id="plan-beta">
                Free during the beta
              </h2>
              <ul className={featureList}>
                {BETA_FEATURES.map((feature) => (
                  <li className={featureItem} key={feature}>
                    <span aria-hidden="true" className={featureIcon}>
                      <Icon icon={Check} size="sm" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div>
                <Button asChild size="lg" variant="primary">
                  <a href={cta.href}>{cta.label}</a>
                </Button>
              </div>
            </SoftCard>

            {paid && (
              <section aria-labelledby="plan-paid" className={paidLine} data-plan="paid">
                <h2 className={paidName} id="plan-paid">
                  Paid plan
                </h2>
                <span className={paidPrice}>{PRICING.display}</span>
                <p className={paidNote}>A possible future plan. It cannot be bought today.</p>
              </section>
            )}
          </div>
        </MarketingBand>
      </main>

      <Footer />
    </MarketingPageShell>
  );
};
