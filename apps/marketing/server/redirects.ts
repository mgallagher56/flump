import { resolveToolSlug, TOOL_SLUG_ALIASES, TOOL_SLUGS, type ToolSlug } from "@repo/ui/tools";
import type { RequestHandler } from "express";
import { AI_CONNECTION, FEATURES_INDEX, MONEY_AREAS } from "../src/utils/featureAreas";

const areaPath = (key: "pay" | "debt-and-borrowing"): string =>
  MONEY_AREAS.find((area) => area.key === key)?.path ?? FEATURES_INDEX.path;

/**
 * Where each former marketing calculator page now points (D9): the area page that does the same
 * job in the app. Typed over every canonical slug, so a new calculator cannot be left out.
 */
const TOOL_AREAS: Readonly<Record<ToolSlug, string>> = {
  "uk-pay-rise-take-home-calculator": areaPath("pay"),
  "uk-student-loan-overpay-or-invest-calculator": areaPath("pay"),
  "section-24-landlord-tax-calculator": areaPath("pay"),
  "uk-100k-tax-trap-calculator": areaPath("pay"),
  "uk-debt-snowball-vs-avalanche-calculator": areaPath("debt-and-borrowing"),
  "0-percent-balance-transfer-payoff-calculator": areaPath("debt-and-borrowing"),
  "overdraft-cost-and-payoff-calculator": areaPath("debt-and-borrowing"),
  "mortgage-overpayment-vs-isa-calculator": areaPath("debt-and-borrowing"),
};

/** Every canonical slug and every alias, each resolved through the shared catalogue. */
const TOOL_REDIRECTS = [...TOOL_SLUGS, ...Object.keys(TOOL_SLUG_ALIASES)].flatMap((slug) => {
  const canonical = resolveToolSlug(slug);
  return canonical ? [[`/tools/${slug.toLowerCase()}`, TOOL_AREAS[canonical]] as const] : [];
});

/**
 * Old marketing addresses and where they now live (E42: the AI connection page in PR 1, the
 * calculators in PR 2), as [old, new] pairs. Old addresses are normalised paths (lower case, no
 * trailing slash). The address a request is sent to is always the second item of a pair here,
 * never anything read from the request, so the redirect cannot be pointed at another site. Any
 * other `/tools/...` path still answers 404.
 */
const REDIRECTS: readonly (readonly [string, string])[] = [
  ["/mcp", AI_CONNECTION.path],
  ["/tools", FEATURES_INDEX.path],
  ...TOOL_REDIRECTS,
];

/**
 * A request path in the form the table uses: query and fragment dropped, percent-decoded, lower
 * case, repeated slashes collapsed and no trailing slash, like the router. Undefined when the path
 * cannot be decoded.
 */
function normalisePath(requestUrl: string): string | undefined {
  let raw = requestUrl.split(/[?#]/)[0] || "/";
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return undefined;
  }
  const lower = raw.toLowerCase().replace(/\/{2,}/g, "/");
  return lower.length > 1 ? lower.replace(/\/+$/, "") || "/" : lower;
}

/** The page an old address moved to, or undefined when the path is not an old address. */
export function redirectTarget(requestUrl: string): string | undefined {
  const path = normalisePath(requestUrl);
  return REDIRECTS.find(([from]) => from === path)?.[1];
}

/**
 * 301 from an old address to its new page. The query string is not carried over: the target comes
 * from the table alone. GET and HEAD only; any other method falls through to the 404 page. Mounted
 * in `server.ts` after the security headers and `registerOps` (so each 301 still carries HSTS and
 * the other headers) and before analytics and SSR.
 */
export function redirectMiddleware(): RequestHandler {
  return (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const path = normalisePath(req.originalUrl);
    for (const [from, to] of REDIRECTS) {
      if (from === path) return res.redirect(301, to);
    }
    return next();
  };
}
