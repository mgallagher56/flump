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

const pageWrapperStyle = css({
  position: "relative",
  width: "100%",
  overflowX: "hidden",
});

export const LoggedOutHome: FC = () => {
  return (
    <div className={pageWrapperStyle} data-testid="logged-out-home">
      <HomeHero />
      <InteractiveFinancialTeaser />
      <FeaturePillars />
      <ComparisonMatrix />
      <SecurityPrivacySection />
      <HomeFAQ />
      <HomeCTA />
      <HomeFooter />
    </div>
  );
};

export default LoggedOutHome;
