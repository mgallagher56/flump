import { etagFor } from "@flump/api-contract";
import type { ShouldRevalidateFunction } from "react-router";
import { BackendError } from "./backend-error";

/**
 * Conditional writes on the web (BE-16, audit M7). Every edit of a saved record sends the version
 * the page read (`If-Match: "<updatedAt>"`). When the record changed somewhere else in the
 * meantime (another tab, an AI connection) the API answers 412 and writes nothing; the page then
 * says so, reloads its saved data and keeps what the person typed, so they can check and save again.
 */

/** The status the API answers when the version sent in `If-Match` is no longer current. */
export const CONFLICT_STATUS = 412;

/** Form field carrying the `updatedAt` of the record a form edits. */
export const VERSION_FIELD = "version";
/** Form field carrying the `updatedAt` of the profile, for forms that also save profile fields. */
export const PROFILE_VERSION_FIELD = "profileVersion";

/** Shown wherever a save was refused because the record changed somewhere else. */
export const CONFLICT_MESSAGE =
  "We did not save this because it was changed somewhere else. The latest version is now loaded. Check it and save again.";

/** The same message as a toast. */
export const CONFLICT_TOAST = {
  title: "We did not save this because it was changed somewhere else",
  description: "The latest version is now loaded. Check it and save again.",
} as const;

/** The `If-Match` value for a record last changed at `updatedAt`, or undefined when unknown. */
export function versionEtag(updatedAt: unknown): string | undefined {
  if (typeof updatedAt !== "string" || Number.isNaN(Date.parse(updatedAt))) return undefined;
  return etagFor(updatedAt);
}

/**
 * The form field that carries a saved record's version, for spreading into a submission. Loader
 * data carries `updatedAt` on every record; a record without one sends no field.
 */
export function versionField(
  record: unknown,
  field: string = VERSION_FIELD,
): Record<string, string> {
  const updatedAt = (record as { updatedAt?: unknown } | null | undefined)?.updatedAt;
  return typeof updatedAt === "string" && updatedAt !== "" ? { [field]: updatedAt } : {};
}

/** The `If-Match` value a form posted in `field`, or undefined when it sent none. */
export function ifMatchFromForm(formData: FormData, field: string = VERSION_FIELD) {
  return versionEtag(formData.get(field));
}

/** True when a write failed because the record changed since it was read. */
export function isConflict(err: unknown): boolean {
  return err instanceof BackendError && err.status === CONFLICT_STATUS;
}

let reloadSavedData: (() => void) | null = null;

/** The app shell registers how to reload every loader's saved data (the router's revalidate). */
export function registerSavedDataReload(reload: (() => void) | null): void {
  reloadSavedData = reload;
}

/**
 * Reloads saved data after a browser-side write was refused with 412, so the page shows the
 * latest figures and the next save sends their version. No-op outside the app shell (tests).
 */
export function reloadAfterConflict(): void {
  reloadSavedData?.();
}

/**
 * Route `shouldRevalidate`: React Router skips reloading loaders after an action that answers 4xx,
 * but a 412 means the saved data on screen is out of date, so reload it.
 */
export const revalidateOnConflict: ShouldRevalidateFunction = ({
  actionStatus,
  defaultShouldRevalidate,
}) => actionStatus === CONFLICT_STATUS || defaultShouldRevalidate;
