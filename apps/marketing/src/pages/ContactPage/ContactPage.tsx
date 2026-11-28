import { BUSINESS_DETAILS } from "@flump/business-details";
import { type FC, useRef } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { HeroBand } from "../../components/HeroBand";
import { MarketingBand } from "../../components/MarketingBand";
import { MarketingPageShell } from "../../components/MarketingPageShell";
import { PageMeta } from "../../components/PageMeta";
import { SoftCard } from "../../components/SoftCard";
import { type HeroOrbTones, StillHeroOrbs } from "../../components/StillHeroOrbs";
import { TiltLight } from "../../components/TiltLight";
import { arriveMoment } from "../../motion/moments/bandMoments";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { mailto, SUPPORT_EMAIL } from "../../utils/site";
import {
  addressLine,
  card,
  cardHeading,
  link,
  mainContent,
  placeholderNote,
  prose,
  stack,
} from "./ContactPage.styles";

const SUPPORT_SUBJECT = "Flump support";

/** The hero's orbs, biggest first (the approved contact prototype). */
const CONTACT_HERO_TONES: HeroOrbTones = ["violet", "teal", "rose", "sky"];

const contactArrives = arriveMoment("[data-arrive-item]", 14);

/**
 * Contact (E16 PR 12, R2-10; the approved contact prototype, 27 Nov 2026, OTHER-PAGES-PLAN slice
 * P2): the compact hero with still orbs (scene level S0, no script), one glass card with the
 * address on its own line and one short note, then the security route as a plain line. No picture
 * and no bubbles behind the text. One mailbox, one mailto link and no response-time promise.
 * Privacy requests and complaints go to the same mailbox (E19 holds any further wording). Mail
 * subjects never carry financial data.
 */
export const ContactPage: FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useGsapMoment(ref, contactArrives);
  return (
    <MarketingPageShell>
      <PageMeta
        title="Contact | Flump"
        description="Email Flump to ask for a beta invite, with a question or feedback, or to raise a complaint."
      />

      <Header />

      <main className={mainContent} id="main" tabIndex={-1}>
        <HeroBand
          compact
          data-testid="contact-hero"
          lead="Email us for an invite, with a question or with feedback."
          orbs={<StillHeroOrbs tones={CONTACT_HERO_TONES} />}
          title="Contact Flump"
          titleId="contact-title"
        />
        <MarketingBand id="beta" tone="card" width="narrow">
          <div className={stack} ref={ref}>
            <TiltLight data-arrive-item="">
              <SoftCard aria-labelledby="contact-email" as="section" className={card}>
                <h2 className={cardHeading} id="contact-email">
                  Email
                </h2>
                <p className={addressLine}>
                  <a className={link} href={mailto(SUPPORT_EMAIL, SUPPORT_SUBJECT)}>
                    {SUPPORT_EMAIL}
                  </a>
                  {BUSINESS_DETAILS.supportEmail.isPlaceholder && (
                    <span className={placeholderNote}>A placeholder, not monitored yet.</span>
                  )}
                </p>
                <p className={prose}>
                  Sign-up is invite-only, so ask here. Privacy requests and complaints come here
                  too. Please leave out account numbers, balances and other financial details.
                </p>
              </SoftCard>
            </TiltLight>
            <p className={prose} data-arrive-item="">
              To report a security issue, see{" "}
              <Link className={link} to="/security">
                Security and privacy
              </Link>
              .
            </p>
          </div>
        </MarketingBand>
      </main>

      <Footer />
    </MarketingPageShell>
  );
};
