import type { NextFunction, Request, Response } from "express";
import { SECURITY_HEADERS } from "../app/security/headers.server";

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
    next();
  };
}
