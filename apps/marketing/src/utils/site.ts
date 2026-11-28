import { BUSINESS_DETAILS } from "@flump/business-details";
import { getAppUrl } from "./url";

/**
 * Site-wide contact and sign-up settings (E24-T2, E24-T3). Every marketing surface reads the
 * support mailbox, the sign-up call to action and the sign-in address from here, so a closed beta
 * never links to a sign-up form that refuses people. Business details come from `@flump/business-details`.
 */
export type SignupMode = "invite-only" | "open";

/**
 * The brand tagline (owner ruling, 14 Nov 2026). Exact wording, sentence case, a colon after the
 * name and no dash. It never replaces the home h1. Copy guide section 2.1 holds the rules.
 */
export const TAGLINE = "Finance without the fog";

/** The tagline written with the name, for the home title, share titles and the footer. */
export const SITE_TAGLINE = "Flump: finance without the fog";

/** Sign-up stays invite-only until the owner opens it (E24 round 3 item 15). */
export const SIGNUP_MODE: SignupMode = "invite-only";

export const SUPPORT_EMAIL = BUSINESS_DETAILS.supportEmail.value;

/** `mailto:` link with an encoded subject. Never put financial data in the subject. */
export function mailto(address: string, subject?: string): string {
  return subject ? `mailto:${address}?subject=${encodeURIComponent(subject)}` : `mailto:${address}`;
}

export interface SignupCta {
  href: string;
  label: string;
  /** Compact label for narrow viewports. */
  shortLabel: string;
  /** True when the href leaves the marketing site. */
  external: boolean;
}

/**
 * The one sign-up call to action, for when sign-up opens. While invite-only there is none: the
 * owner shares invite links by hand (28 Nov 2026), so nothing asks for an invite.
 */
export function signupCta(
  mode: SignupMode = SIGNUP_MODE,
  appUrl: string = getAppUrl(),
): SignupCta | null {
  if (mode !== "open") return null;
  return {
    href: `${appUrl}/signup`,
    label: "Get started",
    shortLabel: "Sign up",
    external: true,
  };
}

/** The web app's sign-in, where the header's "Sign in" goes; an invite link also lands there. */
export function signInHref(appUrl: string = getAppUrl()): string {
  return `${appUrl}/login`;
}
