import { BUSINESS_DETAILS } from "@flump/business-details";
import { Card } from "@repo/ui";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import { mailto, SUPPORT_EMAIL } from "../../utils/site";
import {
  body,
  card,
  cardGrid,
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
 * Contact (E16 PR 12): two cards in one column, general and security. One mailbox, one mailto
 * link per card and no response-time promise. Privacy requests and complaints go to the same
 * mailbox (E19 holds any further wording). Mail subjects never carry financial data.
 */
export const ContactPage: FC = () => (
  <div className={pageShell()}>
    <PageMeta
      title="Contact | Flump"
      description="Contact Flump for support or feedback, to ask for a beta invite, or to raise a complaint."
    />

    <Header />

    <main className={mainContent()} id="main" tabIndex={-1}>
      <div className={container()}>
        <div className={headerBlock()}>
          <h1 className={heading()}>Contact Flump</h1>
          <p className={intro()}>Flump is free during the beta. You can reach us by email.</p>
        </div>

        <div className={cardGrid()}>
          <Card
            aria-labelledby="contact-general"
            as="section"
            className={card()}
            id="beta"
            padding="lg"
          >
            <h2 className={cardHeading()} id="contact-general">
              General
            </h2>
            <p className={body()}>
              Email{" "}
              <a className={link()} href={mailto(SUPPORT_EMAIL, SUPPORT_SUBJECT)}>
                {SUPPORT_EMAIL}
              </a>{" "}
              to ask for an invite (sign-up is invite-only), or with a question, a problem,
              feedback, a privacy request or a complaint.
              {BUSINESS_DETAILS.supportEmail.isPlaceholder && (
                <span className={placeholderNote()}>
                  {" "}
                  This is a placeholder address while we finish setting up, so it is not monitored
                  yet.
                </span>
              )}{" "}
              Please do not include account numbers, balances or other financial details in your
              message.
            </p>
          </Card>

          <Card aria-labelledby="contact-security" as="section" className={card()} padding="lg">
            <h2 className={cardHeading()} id="contact-security">
              Security
            </h2>
            <p className={body()}>
              To report a vulnerability, see{" "}
              <Link className={link()} to="/security">
                Security and privacy
              </Link>
              .
            </p>
          </Card>
        </div>
      </div>
    </main>

    <Footer />
  </div>
);
