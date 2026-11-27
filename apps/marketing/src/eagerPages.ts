import type { PageSet } from "./pageSet";
import { AccessibilityPage } from "./pages/AccessibilityPage";
import { AiConnectionPage } from "./pages/AiConnectionPage";
import { ContactPage } from "./pages/ContactPage";
import { CookiesPage } from "./pages/CookiesPage";
import { FeaturePage } from "./pages/FeaturePage";
import { FeaturesIndexPage } from "./pages/FeaturesIndexPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PreviewPage } from "./pages/PreviewPage";
import { PricingPage } from "./pages/PricingPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { SecurityPage } from "./pages/SecurityPage";
import { TermsPage } from "./pages/TermsPage";

/** Every page, imported up front: the server render and the tests. The browser uses `lazyPages`. */
export const eagerPages: PageSet = {
  HomePage,
  FeaturesIndexPage,
  FeaturePage,
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
};
