import { BUSINESS_DETAILS } from "@flump/business-details";
import { Button } from "@repo/ui";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import { mailto, SUPPORT_EMAIL } from "../../utils/site";
import {
  bodyStyle,
  buttonLinkStyle,
  containerStyle,
  eyebrowStyle,
  headingStyle,
  introStyle,
  linkStyle,
  mainStyle,
  noteStyle,
  pageStyle,
  sectionHeadingStyle,
  sectionStyle,
} from "./ContactPage.styles";

const INVITE_SUBJECT = "Flump beta invite request";
const SUPPORT_SUBJECT = "Flump support";
const FEEDBACK_SUBJECT = "Flump feedback";
const COMPLAINT_SUBJECT = "Flump complaint";

/**
 * Support, feedback, beta invite request, security and complaints (E24-T2). One mailbox, no
 * response-time promise. The complaints wording is held for the owner (E19), so that section is
 * a heading and the mailbox only. Mail subjects never carry financial data.
 */
export const ContactPage: FC = () => (
  <div className={pageStyle()}>
    <PageMeta
      title="Contact | Flump"
      description="Contact Flump for support or feedback, to ask for a beta invite, or to raise a complaint."
    />

    <Header />

    <main className={mainStyle()}>
      <div className={containerStyle()}>
        <span className={eyebrowStyle()}>Contact</span>
        <h1 className={headingStyle()}>Contact Flump</h1>
        <p className={introStyle()}>
          Flump is a free, invite-only beta. Email is the only way to reach us for now.
        </p>

        <section className={sectionStyle()} aria-labelledby="contact-support">
          <h2 id="contact-support" className={sectionHeadingStyle()}>
            Support
          </h2>
          <p className={bodyStyle()}>
            Email{" "}
            <a href={mailto(SUPPORT_EMAIL, SUPPORT_SUBJECT)} className={linkStyle()}>
              {SUPPORT_EMAIL}
            </a>{" "}
            with a question or a problem. Please do not include account numbers, balances or other
            financial details in your message.
          </p>
          {BUSINESS_DETAILS.supportEmail.isPlaceholder && (
            <p className={noteStyle()}>
              This is a placeholder address while we finish setting up, so it is not monitored yet.
            </p>
          )}
        </section>

        <section className={sectionStyle()} aria-labelledby="contact-feedback">
          <h2 id="contact-feedback" className={sectionHeadingStyle()}>
            Feedback
          </h2>
          <p className={bodyStyle()}>
            Tell us what is unclear, missing or wrong in a calculator or on this site.{" "}
            <a href={mailto(SUPPORT_EMAIL, FEEDBACK_SUBJECT)} className={linkStyle()}>
              Send feedback
            </a>
            .
          </p>
        </section>

        <section id="beta" className={sectionStyle()} aria-labelledby="contact-beta">
          <h2 id="contact-beta" className={sectionHeadingStyle()}>
            Request a beta invite
          </h2>
          <p className={bodyStyle()}>
            Sign-up is invite-only while we test with a small group. Ask for an invite by email and
            we will add you to the list. Nothing is charged during the beta.
          </p>
          <a href={mailto(SUPPORT_EMAIL, INVITE_SUBJECT)} className={buttonLinkStyle()}>
            <Button size="md" variant="primary">
              Email for an invite
            </Button>
          </a>
        </section>

        <section className={sectionStyle()} aria-labelledby="contact-security">
          <h2 id="contact-security" className={sectionHeadingStyle()}>
            Security
          </h2>
          <p className={bodyStyle()}>
            To report a vulnerability, see{" "}
            <Link to="/security" className={linkStyle()}>
              Security and privacy
            </Link>
            .
          </p>
        </section>

        <section className={sectionStyle()} aria-labelledby="contact-complaints">
          <h2 id="contact-complaints" className={sectionHeadingStyle()}>
            Complaints
          </h2>
          <p className={bodyStyle()}>
            <a href={mailto(SUPPORT_EMAIL, COMPLAINT_SUBJECT)} className={linkStyle()}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </main>

    <Footer />
  </div>
);
