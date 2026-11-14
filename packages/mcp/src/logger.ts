/**
 * The logger the MCP package writes through (L6). The host passes its own (the backend passes a
 * Nest `Logger`); without one, messages go to stderr. Never stdout: on the stdio transport stdout
 * carries the protocol, so a stray line there would break the client.
 *
 * Callers must keep messages free of tokens, arguments, user data and record ids: an error's
 * name, a correlation id or a fixed sentence only.
 */
export interface McpLogger {
  warn(message: string): void;
  error(message: string): void;
}

/** The default: stderr only (`console.error` writes to stderr for both levels). */
export const stderrLogger: McpLogger = {
  warn: (message) => console.error(message),
  error: (message) => console.error(message),
};

/** Drops every message. For tests and hosts that want silence. */
export const noopLogger: McpLogger = {
  warn: () => {},
  error: () => {},
};

/** An error's name for a log line, never its message or stack (either may echo user data). */
export function errorName(err: unknown): string {
  return err instanceof Error ? err.name : "error";
}
