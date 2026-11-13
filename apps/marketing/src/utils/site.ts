import { BUSINESS_DETAILS } from "@flump/business-details";
import { getAppUrl } from "./url";

/**
 * Site-wide contact and sign-up settings (E24-T2, E24-T3). Every marketing surface reads the
 * support mailbox and the sign-up call to action from here, so a closed beta never links to a
 * sign-up form that refuses people. Business details come from `@flump/business-details`.
 */
export type SignupMode = "invite-only" | "open";

/** Sign-up stays invite-only until the owner opens it (E24 round 3 item 15). */
export const SIGNUP_MODE: SignupMode = "invite-only";

export const SUPPORT_EMAIL = BUSINESS_DETAILS.supportEmail.value;

/** Becomes privacy@ when that mailbox exists (DECISIONS round 3 item 11). Support until then. */
export const PRIVACY_EMAIL = SUPPORT_EMAIL;

/** Page and anchor where a visitor asks for a beta invite. */
export const BETA_INVITE_PATH = "/contact#beta";

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

/** The one sign-up call to action. Invite-only points at the invite request, open at the web app. */
export function signupCta(mode: SignupMode = SIGNUP_MODE, appUrl: string = getAppUrl()): SignupCta {
  if (mode === "open") {
    return {
      href: `${appUrl}/signup`,
      label: "Get started",
      shortLabel: "Sign up",
      external: true,
    };
  }
  return {
    href: BETA_INVITE_PATH,
    label: "Request an invite",
    shortLabel: "Request invite",
    external: false,
  };
}
