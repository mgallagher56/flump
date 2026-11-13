import { BUSINESS_DETAILS } from "@flump/business-details";

/** Support mailbox. Read from the central business details config (a placeholder until the owner edits it). */
export const SUPPORT_EMAIL: string = BUSINESS_DETAILS.supportEmail.value;

/** Build identifier for feedback emails. Falls back to "dev" when no version is injected. */
export const APP_VERSION: string = import.meta.env?.VITE_APP_VERSION || "dev";

/**
 * A mailto link for feedback. The subject carries the route key and app version only. It never
 * includes amounts or free text from app state, and no body is prefilled.
 */
export function feedbackMailto(routeKey: string, appVersion: string): string {
  const subject = `Flump feedback [${routeKey}] [${appVersion}]`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
