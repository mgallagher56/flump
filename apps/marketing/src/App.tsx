import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import type { PageSet } from "./pageSet";
import { AI_CONNECTION, FEATURES_INDEX, MONEY_AREAS } from "./utils/featureAreas";

/**
 * The routes. `pages` is the eager set on the server and in tests, and the lazy set in the browser,
 * where each page is its own chunk (`lazyPages.tsx`); `pageForPath` in `pageSet.ts` mirrors these
 * routes so the current page's chunk loads before hydration.
 */
export default function App({ pages }: { pages: PageSet }) {
  const {
    HomePage,
    FeaturesIndexPage,
    AreaPage,
    AiConnectionPage,
    PreviewPage,
    PricingPage,
    SecurityPage,
    ContactPage,
    PrivacyPage,
    TermsPage,
    CookiesPage,
    AccessibilityPage,
    NotFoundPage,
  } = pages;
  return (
    <ThemeProvider>
      {/* A page reached by a link suspends while its chunk loads; the router's transition keeps
          the old page on screen, so the fallback is never seen in practice. */}
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path={FEATURES_INDEX.path} element={<FeaturesIndexPage />} />
          {MONEY_AREAS.map((area) => (
            <Route
              key={area.key}
              path={area.path}
              element={<AreaPage feature={area} key={area.key} />}
            />
          ))}
          {/* /mcp answers 301 here, and /tools and the former calculator pages to the features and
            area pages (server/redirects.ts). */}
          <Route path={AI_CONNECTION.path} element={<AiConnectionPage />} />
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/cookies" element={<CookiesPage />} />
          <Route path="/accessibility" element={<AccessibilityPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}
