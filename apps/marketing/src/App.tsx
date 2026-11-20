import { Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AiConnectionPage } from "./pages/AiConnectionPage";
import { ContactPage } from "./pages/ContactPage";
import { FeaturePage } from "./pages/FeaturePage";
import { FeaturesIndexPage } from "./pages/FeaturesIndexPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PreviewPage } from "./pages/PreviewPage";
import { PricingPage } from "./pages/PricingPage";
import { SecurityPage } from "./pages/SecurityPage";
import { AI_CONNECTION, FEATURES_INDEX, MONEY_AREAS } from "./utils/featureAreas";

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path={FEATURES_INDEX.path} element={<FeaturesIndexPage />} />
        {MONEY_AREAS.map((area) => (
          <Route
            key={area.key}
            path={area.path}
            element={<FeaturePage feature={area} key={area.key} />}
          />
        ))}
        {/* /mcp answers 301 here, and /tools and the former calculator pages to the features and
            area pages (server/redirects.ts). */}
        <Route path={AI_CONNECTION.path} element={<AiConnectionPage />} />
        <Route path="/preview" element={<PreviewPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ThemeProvider>
  );
}
