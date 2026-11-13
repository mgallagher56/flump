import type { NextFunction, Request, Response } from "express";
import { NON_DOCUMENT_CSP, SECURITY_HEADERS } from "../app/security/headers.server";

const CSP = "content-security-policy";
const DEFAULT_CSP = SECURITY_HEADERS["Content-Security-Policy"];

/**
 * Content types that get `NON_DOCUMENT_CSP` instead of the `frame-ancestors`-only default when the
 * app did not set its own CSP. An ALLOW-list on purpose: every type here is data or a passive
 * subresource that is never rendered as a document and never runs script, so `default-src 'none'`
 * cannot break anything.
 *
 * Deliberately NOT listed (they keep the `frame-ancestors`-only default):
 * - `text/html`, `application/xhtml+xml`, `image/svg+xml`, `*xml`: documents. A blanket
 *   `default-src 'none'` would break inline styles and scripts they legitimately contain.
 * - JavaScript: a CSP on a script response is ignored for `<script>`, but it IS the policy of a
 *   Worker or Service Worker created from that script (its `connect-src` falls back to
 *   `default-src 'none'`), so it could silently break a future worker.
 * - Raster images: inert, and a direct visit renders through the browser's image viewer, whose
 *   inline styles `default-src 'none'` blocks (Chromium logs "Applying inline style violates"
 *   errors and loses the viewer styling; verified). No security gain, so no policy.
 * - `application/pdf` (Chrome's viewer breaks under `default-src 'none'`), `octet-stream`, `wasm`
 *   and any other type.
 *
 * A MISSING Content-Type qualifies only on an error status (>= 400): Bun adds the default
 * `text/plain` of `new Response("Bad Request")` when serialising, not in `headers`, so the
 * document-level CSRF 400 reaches this middleware without a type, and an untyped error body is the
 * one a browser might sniff. 204, 304 and redirects have no body and keep the default.
 */
export function wantsNonDocumentCsp(contentType: string | undefined, status = 200): boolean {
  const type = contentType?.split(";")[0]?.trim().toLowerCase();
  if (!type) return status >= 400;
  if (type === "application/json" || type.endsWith("+json")) return true;
  if (type === "text/plain" || type === "text/css") return true;
  if (type.startsWith("font/")) return true;
  return false;
}

type WriteHeadArgs = Parameters<Response["writeHead"]>;

function headerFromObject(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) return undefined;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name) return Array.isArray(value) ? value.join(", ") : String(value);
  }
  return undefined;
}

/**
 * First middleware (E20 D4 reopened, see docs/audit/plans/DECISIONS.md). React Router builds some
 * responses outside any supported hook (the document CSRF 400, document-level catch 500s,
 * `/__manifest`) and `express.static` serves files without touching the app, so none of them carry
 * the security headers. This stamps the full set from `SECURITY_HEADERS` (the single source) on
 * every response before anything else runs.
 *
 * Set-if-absent semantics for the app: `@react-router/express` copies the app's headers onto the
 * response with `res.append`, which would duplicate our defaults. The first `append` of a default
 * header therefore replaces the default instead, so a header the app sets itself (for example the
 * nonce CSP of E20-N11) always wins and is never doubled.
 *
 * Non-document responses (see `wantsNonDocumentCsp`) the app did not give a CSP are upgraded, at
 * header-flush time when the Content-Type is known, from the `frame-ancestors`-only default to
 * `NON_DOCUMENT_CSP`. A CSP the app set (appended, `setHeader`ed or passed to `writeHead`) is never
 * touched, so documents keep exactly the app's enforced `frame-ancestors 'none'` header.
 */
export function securityHeaders() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const pending = new Set<string>();
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(name, value);
      pending.add(name.toLowerCase());
    }
    const append = res.append.bind(res);
    res.append = ((field: string, value?: string | string[]) => {
      const key = field.toLowerCase();
      if (pending.delete(key)) res.removeHeader(key);
      return append(field, value as string | string[]);
    }) as Response["append"];

    const writeHead = res.writeHead.bind(res) as (...args: WriteHeadArgs) => Response;
    res.writeHead = ((...args: WriteHeadArgs) => {
      const headersArg = args.find((arg) => typeof arg === "object" && arg !== null);
      // A raw header array cannot be inspected cheaply; never touch the default in that case.
      const appSetCsp =
        headerFromObject(headersArg, CSP) !== undefined || Array.isArray(headersArg);
      if (
        !res.headersSent &&
        !appSetCsp &&
        pending.has(CSP) &&
        res.getHeader(CSP) === DEFAULT_CSP &&
        wantsNonDocumentCsp(
          headerFromObject(headersArg, "content-type") ??
            String(res.getHeader("content-type") ?? ""),
          typeof args[0] === "number" ? args[0] : res.statusCode,
        )
      ) {
        res.setHeader(CSP, NON_DOCUMENT_CSP);
      }
      return writeHead(...args);
    }) as Response["writeHead"];
    next();
  };
}
