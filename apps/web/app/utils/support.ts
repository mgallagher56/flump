/**
 * Placeholder support mailbox. The `.invalid` TLD can never resolve, so nothing can be sent to an
 * address we do not own. E24-T8 swaps in the real mailbox once the domain and routing are live;
 * the E24-T1 launch guard blocks a launch build until then.
 */
export const SUPPORT_EMAIL = "support@example.invalid";

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
