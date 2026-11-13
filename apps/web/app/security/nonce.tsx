import { createContext, type ReactNode, useContext } from "react";

/**
 * The CSP nonce for this request's inline scripts (E20-N11). The server provides the real value
 * (`entry.server.tsx`). The client never provides one: browsers hide a `nonce` attribute's value
 * after parsing (the DOM attribute reads back as an empty string), so the client render uses the
 * default `""` and matches the DOM it hydrates. This is the standard Remix/React Router pattern.
 */
const NonceContext = createContext<string>("");

export function NonceProvider({ nonce, children }: { nonce: string; children: ReactNode }) {
  return <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>;
}

/** The nonce to put on an inline `<script>` (and on RR's `Scripts`/`ScrollRestoration`). */
export function useNonce(): string {
  return useContext(NonceContext);
}
