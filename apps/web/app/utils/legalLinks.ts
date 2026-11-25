import { LEGAL_PAGES, type LegalPageKey, legalPage } from "@flump/business-details";
import type { SiteFooterLink } from "@repo/ui";
import { useRouteLoaderData } from "react-router";

/**
 * Where the legal links point when the root loader's data is missing (the root loader itself
 * failed). The same last resort as `getMarketingUrl`.
 */
export const FALLBACK_MARKETING_ORIGIN = "https://marketing-production-d21f.up.railway.app";

/** Absolute address of a legal page on the marketing site, the one home of the legal pages. */
export const legalHref = (key: LegalPageKey, origin: string): string =>
  `${origin.replace(/\/+$/, "")}${legalPage(key).path}`;

/** Every legal page as a footer link that leaves the app. */
export const legalFooterLinks = (origin: string): SiteFooterLink[] =>
  LEGAL_PAGES.map((page) => ({
    key: page.key,
    label: page.label,
    href: legalHref(page.key, origin),
    external: true,
  }));

/**
 * Origin of the marketing site, from the root loader (`getMarketingUrl`, read from the server's
 * environment at request time), so the server render and the browser agree and the links follow
 * the deployed setting.
 */
export function useMarketingOrigin(): string {
  let rootData: { marketingUrl?: unknown } | undefined;
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: fallback when rendered outside a data router (unit tests and stories)
    rootData = useRouteLoaderData("root") as { marketingUrl?: unknown } | undefined;
  } catch {
    rootData = undefined;
  }
  return typeof rootData?.marketingUrl === "string" && rootData.marketingUrl
    ? rootData.marketingUrl
    : FALLBACK_MARKETING_ORIGIN;
}
