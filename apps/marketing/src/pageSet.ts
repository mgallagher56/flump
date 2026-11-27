import type { ComponentType } from "react";
import { AI_CONNECTION, FEATURES_INDEX, type Feature, MONEY_AREAS } from "./utils/featureAreas";

/**
 * Every page component, by name. The server renders from the eager set (`eagerPages.ts`); the
 * browser loads each page as its own chunk (`lazyPages.ts`), so a visit to one page never
 * downloads the others (ROLLOUT-PLAN section 3, M1 notes). Pure data and types: no page imports.
 */
export interface PageSet {
  HomePage: ComponentType;
  FeaturesIndexPage: ComponentType;
  // The routes pass only `feature`; the page's other props are for the AI connection page.
  FeaturePage: ComponentType<{ feature: Feature }>;
  AiConnectionPage: ComponentType;
  PreviewPage: ComponentType;
  PricingPage: ComponentType;
  SecurityPage: ComponentType;
  ContactPage: ComponentType;
  PrivacyPage: ComponentType;
  TermsPage: ComponentType;
  CookiesPage: ComponentType;
  AccessibilityPage: ComponentType;
  NotFoundPage: ComponentType;
}

export type PageName = keyof PageSet;

/** Each page's module, relative to the app root: the key Vite's build manifest uses. */
export const pageSource = (name: PageName) => `src/pages/${name}/index.ts`;

const FIXED: Record<string, PageName> = {
  "/": "HomePage",
  [FEATURES_INDEX.path]: "FeaturesIndexPage",
  [AI_CONNECTION.path]: "AiConnectionPage",
  "/preview": "PreviewPage",
  "/pricing": "PricingPage",
  "/security": "SecurityPage",
  "/contact": "ContactPage",
  "/privacy": "PrivacyPage",
  "/terms": "TermsPage",
  "/cookies": "CookiesPage",
  "/accessibility": "AccessibilityPage",
};

/**
 * The page a path renders, matching `App.tsx`'s routes (case-insensitive, trailing slash ignored,
 * like the router). Used to load the right chunk before hydrating and to preload it from the server.
 */
export function pageForPath(pathname: string): PageName {
  const lower = (pathname.split(/[?#]/)[0] || "/").toLowerCase();
  const path = lower.length > 1 ? lower.replace(/\/+$/, "") : lower;
  const fixed = FIXED[path];
  if (fixed) return fixed;
  if (MONEY_AREAS.some((area) => area.path === path)) return "FeaturePage";
  return "NotFoundPage";
}
