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
import { GlassOrb, type OrbTone } from "../GlassOrb";
import { Header } from "../Header";
import { PageMeta } from "../PageMeta";
import {
  container,
  headerBlock,
  headerOrbs,
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

/**
 * The header band's three orb colours, biggest first. Privacy and terms are the approved
 * prototypes'; cookies and accessibility have no prototype of their own (a listed deviation).
 */
export const LEGAL_ORB_TONES: Record<LegalPageKey, readonly [OrbTone, OrbTone, OrbTone]> = {
  privacy: ["teal", "violet", "sky"],
  terms: ["violet", "sky", "teal"],
  cookies: ["sky", "teal", "violet"],
  accessibility: ["teal", "sky", "violet"],
};

const ORB_SLOTS = [0, 1, 2] as const;

/**
 * Still glass orbs in the header band only (the approved privacy and terms prototypes, MP8): in
 * the margins beside the reading column on wide screens, two small ones above the title on phones,
 * never beside or behind the text below. CSS only: no script, so neither motion library can load.
 */
const HeaderOrbs: FC<{ page: LegalPageKey }> = ({ page }) => (
  <span aria-hidden="true" className={headerOrbs} data-legal-orbs="">
    {ORB_SLOTS.map((slot) => (
      <span data-legal-orb={slot} key={slot}>
        <GlassOrb tone={LEGAL_ORB_TONES[page][slot]} />
      </span>
    ))}
  </span>
);

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
            <HeaderOrbs page={page} />
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
