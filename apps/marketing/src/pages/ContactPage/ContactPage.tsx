import { BUSINESS_DETAILS } from "@flump/business-details";
import { Card } from "@repo/ui";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import { mailto, SUPPORT_EMAIL } from "../../utils/site";
import {
  addressLine,
  body,
  card,
  cardHeading,
  container,
  headerBlock,
  heading,
  intro,
  link,
  mainContent,
  pageShell,
  placeholderNote,
} from "./ContactPage.styles";

const SUPPORT_SUBJECT = "Flump support";

/**
 * Contact (E16 PR 12, R2-10): one card with the address on its own line and one short note, then
 * the security route as a plain line. One mailbox, one mailto link and no response-time promise.
 * Privacy requests and complaints go to the same mailbox (E19 holds any further wording). Mail
 * subjects never carry financial data.
 */
export const ContactPage: FC = () => (
  <div className={pageShell()}>
    <PageMeta
      title="Contact | Flump"
      description="Email Flump to ask for a beta invite, with a question or feedback, or to raise a complaint."
    />

    <Header />

    <main className={mainContent()} id="main" tabIndex={-1}>
      <div className={container()}>
        <div className={headerBlock()}>
          <h1 className={heading()}>Contact Flump</h1>
          <p className={intro()}>Email us for an invite, with a question or with feedback.</p>
        </div>

        <Card
          aria-labelledby="contact-email"
          as="section"
          className={card()}
          id="beta"
          padding="lg"
        >
          <h2 className={cardHeading()} id="contact-email">
            Email
          </h2>
          <p className={addressLine()}>
            <a className={link()} href={mailto(SUPPORT_EMAIL, SUPPORT_SUBJECT)}>
              {SUPPORT_EMAIL}
            </a>
            {BUSINESS_DETAILS.supportEmail.isPlaceholder && (
              <span className={placeholderNote()}>A placeholder, not monitored yet.</span>
            )}
          </p>
          <p className={body()}>
            Sign-up is invite-only, so ask here. Privacy requests and complaints come here too.
            Please leave out account numbers, balances and other financial details.
          </p>
        </Card>

        <p className={body()}>
          To report a security issue, see{" "}
          <Link className={link()} to="/security">
            Security and privacy
          </Link>
          .
        </p>
      </div>
    </main>

    <Footer />
  </div>
);
