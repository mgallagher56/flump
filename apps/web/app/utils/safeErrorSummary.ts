/**
 * Log-safe error summary (E19 A5), the web twin of the backend helper: error class plus the
 * leading phrase of the message (before the first colon), never the error object or its body.
 */
export function safeErrorSummary(err: unknown): string {
  const name = err instanceof Error ? err.name : typeof err;
  const message = err instanceof Error ? err.message : "";
  const phrase = message.split(":")[0].trim().slice(0, 80);
  return `${name}${phrase ? ` (${phrase})` : ""}`;
}
