/**
 * OWNER PLACEHOLDERS. Every value here is an obvious stand-in, not a real detail.
 * Replace each one before launch (grep for "PLACEHOLDER" or "example.invalid").
 * Owner decisions: docs/audit/plans/DECISIONS.md (E7).
 */

/** Security contact. `.invalid` can never resolve. */
export const SECURITY_CONTACT_EMAIL = "security@example.invalid";

export function securityMailto(subject = "Security enquiry"): string {
  return `mailto:${SECURITY_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/** Pricing is not set. Shown on the pricing page exactly like this. */
export const PRICE_PLACEHOLDER = "£X";
export const PRICE_PLACEHOLDER_ANNUAL = "£Y";

/** Footer company details. Never invent real details. */
export const COMPANY_NAME_PLACEHOLDER = "[Company name PLACEHOLDER]";
export const COMPANY_NUMBER_PLACEHOLDER = "[Company number PLACEHOLDER]";
export const COMPANY_ADDRESS_PLACEHOLDER = "[Registered office address PLACEHOLDER]";
