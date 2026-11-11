/**
 * True only for an absolute https: URL. Used before assigning a backend-provided URL to
 * window.location so a compromised or buggy response cannot navigate to javascript:, data: or
 * plain http: targets.
 */
export function isSafeRedirectUrl(value: unknown): value is string {
  if (typeof value !== "string" || value === "") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
