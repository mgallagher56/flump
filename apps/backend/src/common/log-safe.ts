/**
 * Log-safe error summary (E19 A5). Provider and identity errors can echo response bodies,
 * tokens, account data or names, so logs carry only the error class and the leading phrase of
 * the message (text before the first colon, where providers append the remote body). Never log
 * the error object itself.
 */
export function safeErrorSummary(err: unknown): string {
  const name = err instanceof Error ? err.name : typeof err;
  const message = err instanceof Error ? err.message : "";
  const phrase = (message.split(":")[0] ?? "").trim().slice(0, 80);
  const status = (err as { status?: unknown; statusCode?: unknown } | null)?.status;
  const statusCode = typeof status === "number" ? ` status=${status}` : "";
  return `${name}${phrase ? ` (${phrase})` : ""}${statusCode}`;
}
