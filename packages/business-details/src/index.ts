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
    value: { monthly: 4.99, annual: 49, label: "Introductory price, subject to change" },
    isPlaceholder: true,
  },
};

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
