import { createContext, type ReactNode, useContext } from "react";

/**
 * The CSP nonce for this request's inline scripts (E20-N11). The server provides the real value
 * (`entry.server.tsx`); the client provides the same value read back from the DOM
 * (`readNonceFromDom`, used by `entry.client.tsx`).
 *
 * Why the client must not render `""`: browsers may hide the `nonce` ATTRIBUTE after parsing, but
 * the `.nonce` IDL property always keeps the real value, and React 19 compares against that
 * property (`node.nonce`) when hydrating. A client render of `""` therefore logs a development-only
 * "attributes of the server rendered HTML didn't match" error on every page (verified in Chromium
 * with the report-only policy). It never affects production builds.
 */
const NonceContext = createContext<string>("");

export function NonceProvider({ nonce, children }: { nonce: string; children: ReactNode }) {
  return <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>;
}

/** The nonce to put on an inline `<script>` (and on RR's `Scripts`/`ScrollRestoration`). */
export function useNonce(): string {
  return useContext(NonceContext);
}

/**
 * The nonce the server rendered, read from the first nonce-bearing script in the document (via the
 * `.nonce` property, which survives attribute hiding). `""` when there is none (no document, or the
 * page was served without a nonce), which matches a server render with no nonce.
 */
export function readNonceFromDom(doc: Document | undefined = globalThis.document): string {
  return doc?.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? "";
}
