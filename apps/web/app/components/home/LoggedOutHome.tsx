import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import ComparisonMatrix from "./ComparisonMatrix";
import FeaturePillars from "./FeaturePillars";
import HomeCTA from "./HomeCTA";
import HomeFAQ from "./HomeFAQ";
import HomeFooter from "./HomeFooter";
import HomeHero from "./HomeHero";
import InteractiveFinancialTeaser from "./InteractiveFinancialTeaser";
import SecurityPrivacySection from "./SecurityPrivacySection";
import WebHowItWorksSection from "./WebHowItWorksSection";

const pageWrapperStyle = css({
  position: "relative",
  width: "100%",
  overflowX: "hidden",
});

export const LoggedOutHome: FC = () => {
  return (
    <div className={pageWrapperStyle} data-testid="logged-out-home">
      {/* 1. Hero with Baseline Snapshot Preview */}
      <HomeHero />
      {/* 2. How It Works (3 Simple Steps) */}
      <WebHowItWorksSection />
      {/* 3. Interactive Engine Sandbox Station */}
      <InteractiveFinancialTeaser />
      {/* 4. Core Outcome Pillars */}
      <FeaturePillars />
      {/* 5. Comparison Matrix */}
      <ComparisonMatrix />
      {/* 6. Security & Privacy Reassurance */}
      <SecurityPrivacySection />
      {/* 7. FAQ & Final CTA */}
      <HomeFAQ />
      <HomeCTA />
      <HomeFooter />
    </div>
  );
};

export default LoggedOutHome;
