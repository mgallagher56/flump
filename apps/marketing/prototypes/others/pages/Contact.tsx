import { BUSINESS_DETAILS } from "@flump/business-details";
import { type FC, useRef } from "react";
import { Link } from "react-router-dom";
import { mainContent } from "../../../src/pages/HomePage/HomePage.styles";
import { mailto, SUPPORT_EMAIL } from "../../../src/utils/site";
import { usePointerLightAndTilt } from "../../shared/round3";
import { arriveAll, OBand, OHero } from "../blocks";
import { ProtoFooter } from "../chrome/ProtoFooter";
import { ProtoHeader } from "../chrome/ProtoHeader";
import { OtherShell } from "../OtherShell";
import { heroLayout, pageLayout } from "../scene/layouts";
import { PageOrbs } from "../scene/SceneLayers";

/*
 * Contact (family F). Production's content: the title and its line, one card with the address on
 * its own line and one short note, then the security route as a plain line. In round one's
 * language: the compact hero with still orbs, the card as a glass card that arrives once. No
 * picture (the plan gives family F the security card only), no bubbles behind text. Copy:
 * production's ContactPage, word for word. Mail subjects never carry financial data.
 */

const TONES = ["violet", "teal", "rose", "sky"] as const;
const SUPPORT_SUBJECT = "Flump support";

const Body: FC = () => {
  const ref = useRef<HTMLElement>(null);
  usePointerLightAndTilt(ref, 6);
  return (
    <main className={mainContent()} id="main" ref={ref} tabIndex={-1}>
      <OHero
        compact
        ctas={null}
        layout={heroLayout(TONES)}
        lead="Email us for an invite, with a question or with feedback."
        title="Contact Flump"
        titleId="contact-title"
      />
      <OBand
        id="beta"
        labelledBy="contact-email"
        moment={arriveAll(".o2-contact, .o2-contact-after", 14)}
        tone="card"
        width="narrow"
      >
        <section aria-labelledby="contact-email" className="o2-contact p11-soft-card" data-tilt="">
          <h2 className="o1-plan__name" id="contact-email">
            Email
          </h2>
          <p className="o2-contact__address">
            <a href={mailto(SUPPORT_EMAIL, SUPPORT_SUBJECT)}>{SUPPORT_EMAIL}</a>
            {BUSINESS_DETAILS.supportEmail.isPlaceholder && (
              <span className="o2-contact__note">A placeholder, not monitored yet.</span>
            )}
          </p>
          <p className="o2-prose">
            Sign-up is invite-only, so ask here. Privacy requests and complaints come here too.
            Please leave out account numbers, balances and other financial details.
          </p>
        </section>
        <p className="o2-prose o2-contact-after">
          To report a security issue, see <Link to="/security">Security and privacy</Link>.
        </p>
      </OBand>
    </main>
  );
};

export const ContactProto: FC = () => (
  <OtherShell defaultLevel="s0" id="contact">
    <PageOrbs layout={pageLayout(TONES)} />
    <ProtoHeader />
    <Body />
    <ProtoFooter />
  </OtherShell>
);
