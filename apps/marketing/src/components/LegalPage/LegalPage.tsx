import {
  BUSINESS_DETAILS,
  LEGAL_PAGES,
  LEGAL_REVIEW_NOTE,
  type LegalPageKey,
  legalPage,
} from "@flump/business-details";
import type { FC, ReactNode } from "react";
import { Link } from "react-router-dom";
import { mailto, SUPPORT_EMAIL } from "../../utils/site";
import { Footer } from "../Footer";
import { Header } from "../Header";
import { PageMeta } from "../PageMeta";
import {
  container,
  headerBlock,
  heading,
  intro as introStyle,
  link,
  mainContent,
  note,
  otherPages,
  otherPagesList,
  pageShell,
  section,
  sectionHeading,
  versionLine,
} from "./LegalPage.styles";

/** True while the name, address or mailbox printed on the legal pages is a stand-in. */
export const hasPlaceholderDetails = (): boolean =>
  BUSINESS_DETAILS.legalName.isPlaceholder ||
  BUSINESS_DETAILS.registeredOffice.isPlaceholder ||
  BUSINESS_DETAILS.supportEmail.isPlaceholder;

export const PLACEHOLDER_DETAILS_NOTE =
  "The name, address and email address on this page are placeholders until Flump's details are confirmed. The email address is not monitored yet.";

export interface LegalPageProps {
  page: LegalPageKey;
  /** Meta description, one sentence. */
  description: string;
  /** The short paragraph under the title. */
  intro: ReactNode;
  children: ReactNode;
}

/**
 * The shell of every legal page (E19): title, a dated version line, who checked the page, the
 * placeholder notice while business details are stand-ins, the sections, and links to the other
 * legal pages. Names, paths and versions come from `@flump/business-details`.
 */
export const LegalPage: FC<LegalPageProps> = ({ page, description, intro, children }) => {
  const current = legalPage(page);
  return (
    <div className={pageShell()}>
      <PageMeta description={description} title={`${current.title} | Flump`} />

      <Header />

      <main className={mainContent()} id="main" tabIndex={-1}>
        <div className={container()}>
          <div className={headerBlock()}>
            <h1 className={heading()}>{current.title}</h1>
            <p className={introStyle()}>{intro}</p>
            <p className={versionLine()} data-testid="legal-version">
              Version {current.version}, {current.updated}
            </p>
            <p className={note()} data-testid="legal-review-note">
              {LEGAL_REVIEW_NOTE}
            </p>
            {hasPlaceholderDetails() && (
              <p className={note()} data-placeholder data-testid="legal-placeholder-note">
                {PLACEHOLDER_DETAILS_NOTE}
              </p>
            )}
          </div>

          {children}

          <nav aria-labelledby="legal-other-pages" className={otherPages()}>
            <h2 className={sectionHeading()} id="legal-other-pages">
              Related pages
            </h2>
            <ul className={otherPagesList()}>
              {LEGAL_PAGES.filter((other) => other.key !== page).map((other) => (
                <li key={other.key}>
                  <Link className={link()} to={other.path}>
                    {other.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link className={link()} to="/security">
                  Security and privacy
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export interface LegalSectionProps {
  /** Anchor id, also used for the heading's id (`<id>-heading`). */
  id: string;
  title: string;
  children: ReactNode;
}

/** One titled section of a legal page, with an anchor so other pages can link to it. */
export const LegalSection: FC<LegalSectionProps> = ({ id, title, children }) => (
  <section aria-labelledby={`${id}-heading`} className={section()} id={id}>
    <h2 className={sectionHeading()} id={`${id}-heading`}>
      {title}
    </h2>
    {children}
  </section>
);

/** A link to another page of the marketing site, styled for running text. */
export const LegalLink: FC<{ to: string; children: ReactNode }> = ({ to, children }) => (
  <Link className={link()} to={to}>
    {children}
  </Link>
);

/** A link that leaves the site (a regulator or a provider). Opens in the same tab. */
export const ExternalLink: FC<{ href: string; children: ReactNode }> = ({ href, children }) => (
  <a className={link()} href={href} rel="noreferrer">
    {children}
  </a>
);

/** The contact mailbox as a link. Mail subjects never carry financial data. */
export const ContactEmail: FC<{ subject: string }> = ({ subject }) => (
  <a className={link()} href={mailto(SUPPORT_EMAIL, subject)}>
    {SUPPORT_EMAIL}
  </a>
);
