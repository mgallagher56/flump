import type { TermsStatusResponse } from "@flump/api-contract";

/**
 * Terms acceptance, shared by the gate, the acceptance route and the screen. The backend answers
 * 403 `terms_not_accepted` to a caller who has not agreed to the terms of use in force; the web app
 * sends them to this page, which reads GET /user-profile/terms-acceptance and posts the agreement.
 */
export type TermsStatus = TermsStatusResponse;

/** The acceptance page. Mirrors TERMS_ACCEPTANCE_PATH in features/settings/account.ts. */
export { TERMS_ACCEPTANCE_PATH } from "~/features/settings/account";

/** What the screen asks for: agreement to the terms, or only to read a changed privacy notice. */
export type TermsAsk = "agree" | "read-privacy";

/**
 * The terms need agreeing to when the person has never agreed or the terms version is new to them;
 * otherwise only the privacy notice changed, which is shown, never agreed to.
 */
export function termsAsk(status: TermsStatus): TermsAsk {
  return status.firstTime || status.terms.changed ? "agree" : "read-privacy";
}

/** The page heading for this status. */
export function termsHeading(status: TermsStatus): string {
  if (status.firstTime) return "Please read and agree to our terms";
  if (status.terms.changed && status.privacyNotice.changed) {
    return "Our terms and privacy notice have changed";
  }
  if (status.terms.changed) return "Our terms have changed";
  return "Our privacy notice has changed";
}

/** A `YYYY-MM-DD` UK date as "9 December 2026". */
export function longDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)));
}

/** A newer version is published but not yet in force: the person may agree early or carry on. */
export function isUpcoming(status: TermsStatus): boolean {
  return !status.required && !status.agreed;
}

/**
 * Where to go after agreeing: a path on this site only. Anything else (another origin, `//host`,
 * a backslash trick, the acceptance page itself) goes to the app home.
 */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/app";
  if (value.includes("\\") || [...value].some((char) => char.charCodeAt(0) < 0x20)) return "/app";
  if (value === "/terms-acceptance" || value.startsWith("/terms-acceptance?")) return "/app";
  return value;
}
