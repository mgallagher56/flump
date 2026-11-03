import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiFileText, FiHome, FiLayers, FiTrendingUp } from "react-icons/fi";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const sectionContainerStyle = css({
  maxWidth: "6xl",
  margin: "0 auto",
  paddingLeft: "16px",
  paddingRight: "16px",
  marginBottom: { base: "64px", md: "96px" },
});

const headerContainerStyle = css({
  textAlign: "center",
  maxWidth: "3xl",
  margin: "0 auto 48px auto",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "repeat(2, 1fr)" },
  gap: "24px",
});

const cardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "24px", md: "32px" },
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "sm",
  transition: "all 0.25s ease",
  "&:hover": {
    borderColor: "primary",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
    transform: "translateY(-2px)",
  },
});

const iconBadgeStyle = (bgColor: string, textColor: string) =>
  css({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    height: "48px",
    borderRadius: "xl",
    backgroundColor: bgColor,
    color: textColor,
    fontSize: "22px",
    marginBottom: "20px",
  });

const tagListStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "24px",
  paddingTop: "20px",
  borderTop: "1px solid",
  borderColor: "border",
});

const tagPillStyle = css({
  fontSize: "xs",
  fontWeight: "medium",
  padding: "4px 10px",
  borderRadius: "full",
  backgroundColor: "background",
  color: "text.muted",
  border: "1px solid",
  borderColor: "border",
});

export const FeaturePillars: FC = () => {
  return (
    <section aria-labelledby="features-heading" className={sectionContainerStyle}>
      <div className={headerContainerStyle}>
        <span
          className={css({
            color: "primary",
            fontSize: "xs",
            fontWeight: "bold",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: "8px",
          })}
        >
          Built for Complexity
        </span>
        <FLPHeading as="h2" color="text.primary" id="features-heading" mb={3} size="3xl">
          Everything you need to master UK wealth & taxation
        </FLPHeading>
        <FLPText color="text.muted" fontSize="md">
          Generic budgeting apps track coffee expenses. Flump models your complete financial balance
          sheet, UK tax liabilities, and compound long-term wealth.
        </FLPText>
      </div>

      <div className={gridStyle}>
        {/* Pillar 1: UK Tax Engine */}
        <div className={cardStyle}>
          <div>
            <div className={iconBadgeStyle("rgba(59, 130, 246, 0.12)", "rgb(59, 130, 246)")}>
              <FiFileText aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" mb={2} size="xl">
              UK Tax & Self-Assessment Hub
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              Navigate UK taxation without fear. Includes HMRC fiscal-year (6 April – 5 April)
              tracking, PAYE take-home estimation, Class 4 National Insurance calculation, and
              automated Section 24 rental property mortgage interest relief cap (20% basic rate
              credit).
            </FLPText>
          </div>
          <div className={tagListStyle}>
            <span className={tagPillStyle}>£100k Taper Warning</span>
            <span className={tagPillStyle}>Section 24 Landlord Reducer</span>
            <span className={tagPillStyle}>Class 4 NI Bands</span>
            <span className={tagPillStyle}>Joint Ownership Split</span>
          </div>
        </div>

        {/* Pillar 2: Net Worth & Accounts */}
        <div className={cardStyle}>
          <div>
            <div className={iconBadgeStyle("rgba(16, 185, 129, 0.12)", "rgb(16, 185, 129)")}>
              <FiLayers aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" mb={2} size="xl">
              Complete Net Worth Aggregation
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              One unified balance sheet for your entire financial life. Aggregate current accounts,
              high-yield savings pots, Stocks & Shares ISAs, mortgages, credit cards, and personal
              loans. Distinguish liquid emergency cash from illiquid assets at a glance.
            </FLPText>
          </div>
          <div className={tagListStyle}>
            <span className={tagPillStyle}>Multi-Account Ledger</span>
            <span className={tagPillStyle}>Asset Allocation Pie</span>
            <span className={tagPillStyle}>Liquid vs Total Net Worth</span>
            <span className={tagPillStyle}>Open Banking Integration</span>
          </div>
        </div>

        {/* Pillar 3: Mortgage Scenario Engine */}
        <div className={cardStyle}>
          <div>
            <div className={iconBadgeStyle("rgba(245, 158, 11, 0.12)", "rgb(245, 158, 11)")}>
              <FiHome aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" mb={2} size="xl">
              Mortgage Optimization & ISA Comparison
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              Take the guesswork out of home loans. Accurately model amortization schedules,
              evaluate the exact interest saved by lump-sum or recurring overpayments, and directly
              compare paying down your mortgage against investing in a tax-sheltered ISA.
            </FLPText>
          </div>
          <div className={tagListStyle}>
            <span className={tagPillStyle}>Overpayment Term Shaver</span>
            <span className={tagPillStyle}>Mortgage vs ISA Arbitrage</span>
            <span className={tagPillStyle}>Equity Accumulation</span>
            <span className={tagPillStyle}>Remortgage Prep</span>
          </div>
        </div>

        {/* Pillar 4: Pensions & Long-Term Forecasting */}
        <div className={cardStyle}>
          <div>
            <div className={iconBadgeStyle("rgba(139, 92, 246, 0.12)", "rgb(139, 92, 246)")}>
              <FiTrendingUp aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" mb={2} size="xl">
              Pensions & Compound Wealth Forecaster
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              Simulate your trajectory to financial independence. Factors in UK auto-enrolment rules
              (qualifying earnings band £6,240 – £50,270 with standard 3% employer match), salary
              sacrifice NI efficiency, and multi-decade compound interest forecasts.
            </FLPText>
          </div>
          <div className={tagListStyle}>
            <span className={tagPillStyle}>Auto-Enrolment Qualifying Bands</span>
            <span className={tagPillStyle}>Salary Sacrifice Savings</span>
            <span className={tagPillStyle}>FIRE Target Age</span>
            <span className={tagPillStyle}>Cash Runway Stress Test</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturePillars;
