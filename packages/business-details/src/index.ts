/**
 * THE single source of truth for Flump's business details. Every legal entity, contact and price
 * string shown anywhere (marketing site, web app footer, legal copy) reads from here. Do not
 * hardcode these values elsewhere.
 *
 * Each field carries `isPlaceholder`. While any field is a placeholder the launch guard
 * (scripts/check-launch-placeholders.ts and `assertLaunchReady`) fails a public launch, which means
 * a build or boot with ALLOW_INDEXING=true or FLUMP_LAUNCH=true.
 *
 * To go live: replace the `value` and set `isPlaceholder: false`. Owner steps:
 * docs/runbooks/business-details.md.
 */

export interface BusinessField<T> {
  value: T;
  /** True while `value` is a stand-in, not a real detail. */
  isPlaceholder: boolean;
}

export interface BusinessPrice {
  /** Monthly price in pounds, billed monthly. */
  monthly: number;
  /** Annual price in pounds, billed annually. */
  annual: number;
  /** Shown beside the price. */
  label: string;
}

export interface BusinessDetails {
  legalName: BusinessField<string>;
  tradingName: BusinessField<string>;
  companyNumber: BusinessField<string>;
  registeredOffice: BusinessField<string>;
  supportEmail: BusinessField<string>;
  securityContact: BusinessField<string>;
  price: BusinessField<BusinessPrice>;
}

/**
 * Tidy stand-ins that read naturally but cannot be mistaken for a real registration: an all-zero
 * company number, and RFC 2606 `.invalid` mailboxes that can never resolve.
 */
export const BUSINESS_DETAILS: BusinessDetails = {
  legalName: { value: "Flump Finance Ltd", isPlaceholder: true },
  tradingName: { value: "Flump", isPlaceholder: false },
  companyNumber: { value: "00000000", isPlaceholder: true },
  registeredOffice: { value: "Registered office address to be confirmed", isPlaceholder: true },
  supportEmail: { value: "support@example.invalid", isPlaceholder: true },
  securityContact: { value: "security@example.invalid", isPlaceholder: true },
  price: {
    value: { monthly: 4.99, annual: 49, label: "Example figure only. No price is set." },
    isPlaceholder: true,
  },
};

export type LegalPageKey = "privacy" | "terms" | "cookies" | "accessibility";

/** One version of a legal page. */
export interface LegalPageVersion {
  /** Bumped with every change to the page's wording. */
  version: string;
  /** The day this version was written, en-GB long form. */
  updated: string;
  /**
   * The UK date this version applies from, `YYYY-MM-DD`. The terms promise at least 14 days'
   * notice of a change, so a new terms version normally sets a date 14 days after it is published.
   * Until then the version before it still applies and people may agree to the new one early.
   */
  effectiveFrom: string;
}

export interface LegalPage {
  key: LegalPageKey;
  /** Path on the marketing site, which is the one home of the legal pages. */
  path: string;
  /** Link text in footers and in the pages' own navigation. */
  label: string;
  /** The page's h1. */
  title: string;
  /** The newest version: the one the page shows. Always `history[0].version`. */
  version: string;
  /** The day the newest version was written. Always `history[0].updated`. */
  updated: string;
  /** Every version, newest first. */
  history: readonly LegalPageVersion[];
}

function withVersion(fields: Omit<LegalPage, "version" | "updated">): LegalPage {
  const [newest] = fields.history;
  if (!newest) throw new Error(`Legal page ${fields.key} has no version`);
  return { ...fields, version: newest.version, updated: newest.updated };
}

/**
 * The legal pages (E19). Both apps' footers and the pages themselves read paths, names and version
 * lines from here, and the backend reads the terms and privacy versions people must agree to or be
 * shown (terms acceptance). Change a page's wording and add a version at the top of its `history`
 * in the same commit.
 */
export const LEGAL_PAGES: readonly LegalPage[] = [
  withVersion({
    key: "privacy",
    path: "/privacy",
    label: "Privacy",
    title: "Privacy notice",
    history: [
      { version: "0.3", updated: "25 November 2026", effectiveFrom: "2026-11-25" },
      { version: "0.2", updated: "25 November 2026", effectiveFrom: "2026-11-25" },
      { version: "0.1", updated: "25 November 2026", effectiveFrom: "2026-11-25" },
    ],
  }),
  withVersion({
    key: "terms",
    path: "/terms",
    label: "Terms",
    title: "Terms of use",
    history: [{ version: "0.1", updated: "25 November 2026", effectiveFrom: "2026-11-25" }],
  }),
  withVersion({
    key: "cookies",
    path: "/cookies",
    label: "Cookies and storage",
    title: "Cookies and browser storage",
    history: [{ version: "0.1", updated: "25 November 2026", effectiveFrom: "2026-11-25" }],
  }),
  withVersion({
    key: "accessibility",
    path: "/accessibility",
    label: "Accessibility",
    title: "Accessibility statement",
    history: [{ version: "0.1", updated: "25 November 2026", effectiveFrom: "2026-11-25" }],
  }),
];

export function legalPage(key: LegalPageKey): LegalPage {
  const page = LEGAL_PAGES.find((candidate) => candidate.key === key);
  if (!page) throw new Error(`Unknown legal page: ${key}`);
  return page;
}

/** A page from a list of pages (`LEGAL_PAGES`, or a test's own list with other versions). */
export function pageIn(pages: readonly LegalPage[], key: LegalPageKey): LegalPage {
  const page = pages.find((candidate) => candidate.key === key);
  if (!page) throw new Error(`Unknown legal page: ${key}`);
  return page;
}

/** Builds a page entry from its history (tests use it for versions not yet published). */
export const legalPageFromHistory = (fields: Omit<LegalPage, "version" | "updated">): LegalPage =>
  withVersion(fields);

/** The pages a person agrees to or is shown before using Flump (terms acceptance). */
export type AcceptanceDocument = "terms" | "privacy";

/** Today's date in the UK, `YYYY-MM-DD`: version dates are UK dates. */
export function ukDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * The version of a page that applies on this date: the newest whose `effectiveFrom` has come. The
 * first version has nothing before it, so it applies to any earlier date too (a test clock, or a
 * date before the page was published); there is always a version in force.
 */
export function versionInEffect(
  key: AcceptanceDocument,
  now: Date,
  pages: readonly LegalPage[] = LEGAL_PAGES,
): LegalPageVersion {
  const today = ukDate(now);
  const history = pageIn(pages, key).history;
  const found = history.find((entry) => entry.effectiveFrom <= today) ?? history.at(-1);
  if (!found) throw new Error(`Legal page ${key} has no version`);
  return found;
}

/**
 * Versions that satisfy the one in effect: it and every newer one (an early agreement to a version
 * not yet in force counts). Newest first.
 */
export function versionsAtLeastInEffect(
  key: AcceptanceDocument,
  now: Date,
  pages: readonly LegalPage[] = LEGAL_PAGES,
): string[] {
  const history = pageIn(pages, key).history;
  const inEffect = versionInEffect(key, now, pages);
  return history.slice(0, history.indexOf(inEffect) + 1).map((entry) => entry.version);
}

/**
 * Who reviewed the legal pages. Stated on every page so nobody takes them for a solicitor's work.
 * Change it only when a different review has actually happened.
 */
export const LEGAL_REVIEW_NOTE =
  "Written and checked with AI tools for Flump's test phase. A solicitor has not reviewed this page.";

/** Formats a price in pounds, en-GB: whole pounds without pence, otherwise two decimals. */
export function formatPrice(amount: number): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

/** One line for footers: "(c) 2026 Flump Finance Ltd. Company number 00000000. Registered office ...". */
export function companyLine(year: number, details: BusinessDetails = BUSINESS_DETAILS): string {
  return `© ${year} ${details.legalName.value}. Company number ${details.companyNumber.value}. ${details.registeredOffice.value}.`;
}

/**
 * The short form for a one-line footer: "© 2026 Flump Ltd". The full `companyLine` (number and
 * registered office) stays on the marketing and signed-out footers.
 */
export function shortCompanyLine(
  year: number,
  details: BusinessDetails = BUSINESS_DETAILS,
): string {
  return `© ${year} ${details.legalName.value}`;
}

export interface PlaceholderField {
  key: keyof BusinessDetails;
  /** Text that would appear in a build if this placeholder reached it. */
  strings: string[];
}

function stringsFor(key: keyof BusinessDetails, details: BusinessDetails): string[] {
  const field = details[key];
  if (key === "price") return [details.price.value.label];
  return [field.value as string];
}

/** Fields still marked as placeholders. Empty means the config is launch-ready. */
export function placeholderFields(details: BusinessDetails = BUSINESS_DETAILS): PlaceholderField[] {
  return (Object.keys(details) as (keyof BusinessDetails)[])
    .filter((key) => details[key].isPlaceholder)
    .map((key) => ({ key, strings: stringsFor(key, details) }));
}

type Env = Record<string, string | undefined>;

/** A public launch: indexing allowed or the launch flag set (both exactly "true"). */
export function isPublicLaunch(env: Env): boolean {
  return env.ALLOW_INDEXING === "true" || env.FLUMP_LAUNCH === "true";
}

/**
 * Throws when this is a public launch and any business detail is still a placeholder. A no-op
 * otherwise, so development, CI and noindex staging keep working.
 */
export function assertLaunchReady(env: Env, details: BusinessDetails = BUSINESS_DETAILS): void {
  if (!isPublicLaunch(env)) return;
  const remaining = placeholderFields(details).map((f) => f.key);
  if (remaining.length > 0) {
    throw new Error(
      `Launch blocked: business details are still placeholders (${remaining.join(", ")}). ` +
        "Edit packages/business-details/src/index.ts, see docs/runbooks/business-details.md.",
    );
  }
}

/**
 * True when the terms or the privacy notice has a version published but not yet in effect, so the
 * apps can offer it early without asking the backend on every page while nothing is coming.
 */
export function hasUpcomingAcceptanceChange(
  now: Date,
  pages: readonly LegalPage[] = LEGAL_PAGES,
): boolean {
  const today = ukDate(now);
  return (["terms", "privacy"] as const).some(
    (key) => (pageIn(pages, key).history[0]?.effectiveFrom ?? today) > today,
  );
}
