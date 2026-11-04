import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FiArrowRight, FiDollarSign, FiHome, FiPercent } from "react-icons/fi";
import { type MetaFunction, Link as RouterLink } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import HomeFooter from "~/components/home/HomeFooter";

export const meta: MetaFunction = () => [
  { title: "Free UK Financial Calculators & Tax Tools | Flump" },
  {
    name: "description",
    content:
      "Free interactive UK wealth and tax calculators. Model the £100k tax trap, compare mortgage overpayment vs ISA investing, and calculate Section 24 buy-to-let mortgage interest relief.",
  },
];

const containerStyle = css({
  maxWidth: "5xl",
  margin: "0 auto",
  padding: { base: "32px 16px", md: "56px 24px" },
});

const heroHeaderStyle = css({
  textAlign: "center",
  maxWidth: "720px",
  margin: "0 auto 48px auto",
});

const toolsGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
  gap: "24px",
  marginBottom: "64px",
});

const toolCardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: "28px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  textDecoration: "none",
  color: "inherit",
  transition: "all 0.25s ease",
  boxShadow: "sm",
  "&:hover": {
    borderColor: "primary",
    transform: "translateY(-3px)",
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.08)",
  },
});

const iconBadgeStyle = (bgColor: string, textColor: string) =>
  css({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    borderRadius: "xl",
    backgroundColor: bgColor,
    color: textColor,
    fontSize: "20px",
    marginBottom: "18px",
  });

export const ToolsIndex: FC = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className={containerStyle} style={{ flex: 1 }}>
        <div className={heroHeaderStyle}>
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "full",
              backgroundColor: "rgba(99, 102, 241, 0.12)",
              color: "#6366f1",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              display: "inline-block",
              marginBottom: "12px",
            }}
          >
            Open UK Financial Calculators
          </span>
          <FLPHeading as="h1" color="text.primary" mb={3} size="3xl">
            Free UK Wealth, Tax & Mortgage Decision Tools
          </FLPHeading>
          <FLPText color="text.muted" fontSize="md">
            Mathematical modeling tools built strictly for UK fiscal rules, HMRC tax bands, and
            allowances. No account or email required to test scenarios.
          </FLPText>
        </div>

        <div className={toolsGridStyle}>
          {/* Tool 1 */}
          <RouterLink className={toolCardStyle} to="/tools/uk-100k-tax-trap-calculator">
            <div>
              <div className={iconBadgeStyle("rgba(99, 102, 241, 0.12)", "#6366f1")}>
                <FiPercent />
              </div>
              <FLPHeading as="h2" color="text.primary" mb={2} size="lg">
                £100k–£125k Tax Trap Calculator
              </FLPHeading>
              <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
                Calculate your effective 60% marginal tax rate, personal allowance clawback, and the
                exact salary sacrifice needed to protect 15–30 hours free childcare.
              </FLPText>
            </div>
            <div
              style={{
                marginTop: "24px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#6366f1",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Launch Calculator <FiArrowRight size={14} />
            </div>
          </RouterLink>

          {/* Tool 2 */}
          <RouterLink className={toolCardStyle} to="/tools/mortgage-overpay-vs-isa">
            <div>
              <div className={iconBadgeStyle("rgba(245, 158, 11, 0.12)", "#f59e0b")}>
                <FiHome />
              </div>
              <FLPHeading as="h2" color="text.primary" mb={2} size="lg">
                Mortgage Overpay vs. ISA Comparator
              </FLPHeading>
              <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
                Directly compare guaranteed interest saved by overpaying your mortgage against the
                tax-free compounding growth of a UK Stocks & Shares ISA.
              </FLPText>
            </div>
            <div
              style={{
                marginTop: "24px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#f59e0b",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Launch Calculator <FiArrowRight size={14} />
            </div>
          </RouterLink>

          {/* Tool 3 */}
          <RouterLink className={toolCardStyle} to="/tools/section-24-landlord-calculator">
            <div>
              <div className={iconBadgeStyle("rgba(59, 130, 246, 0.12)", "#3b82f6")}>
                <FiDollarSign />
              </div>
              <FLPHeading as="h2" color="text.primary" mb={2} size="lg">
                Section 24 Landlord Tax Calculator
              </FLPHeading>
              <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
                Model phantom buy-to-let profit and the 20% basic rate finance relief cap. See exact
                tax owed and true cash retained in your pocket.
              </FLPText>
            </div>
            <div
              style={{
                marginTop: "24px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#3b82f6",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Launch Calculator <FiArrowRight size={14} />
            </div>
          </RouterLink>
        </div>
      </div>

      <HomeFooter />
    </div>
  );
};

export default ToolsIndex;
