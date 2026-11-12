import { ProjectionNotice } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { FaCreditCard, FaFire, FaGraduationCap, FaMoneyBillWave } from "react-icons/fa";
import { FiArrowRight, FiDollarSign, FiHome, FiPercent } from "react-icons/fi";
import { type MetaFunction, Link as RouterLink } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import HomeFooter from "~/components/home/HomeFooter";

export const meta: MetaFunction = () => [
  { title: "Free UK financial and tax calculators | Flump" },
  {
    name: "description",
    content:
      "Free interactive UK wealth and tax calculators. Model the £100k tax trap, compare mortgage overpayment with ISA investing, and calculate Section 24 buy-to-let mortgage interest relief.",
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
    boxShadow: "0 12px 28px color-mix(in srgb, var(--colors-surface-contrast) 8%, transparent)",
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
        <div style={{ marginBottom: "24px" }}>
          <ProjectionNotice />
        </div>
        <div className={heroHeaderStyle}>
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "full",
              backgroundColor: "color-mix(in srgb, var(--colors-primary) 12%, transparent)",
              color: "var(--colors-primary)",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              display: "inline-block",
              marginBottom: "12px",
            }}
          >
            Free UK calculators
          </span>
          <FLPHeading as="h1" color="text.primary" mb={3} size="3xl">
            Free UK wealth, tax, and mortgage calculators
          </FLPHeading>
          <FLPText color="text.muted" fontSize="md">
            Calculation tools built specifically for UK tax rules, HMRC thresholds, and allowances.
            No account or email address required.
          </FLPText>
        </div>

        <div className={toolsGridStyle}>
          {/* Tool 1 */}
          <RouterLink className={toolCardStyle} to="/tools/uk-100k-tax-trap-calculator">
            <div>
              <div
                className={iconBadgeStyle(
                  "color-mix(in srgb, var(--colors-primary) 12%, transparent)",
                  "var(--colors-primary)",
                )}
              >
                <FiPercent />
              </div>
              <FLPHeading as="h2" color="text.primary" mb={2} size="lg">
                £100k–£125k tax trap calculator
              </FLPHeading>
              <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
                Calculate your effective 60% marginal tax rate, Personal Allowance taper, and the
                salary sacrifice required to retain tax-free childcare.
              </FLPText>
            </div>
            <div
              style={{
                marginTop: "24px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--colors-primary)",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Open calculator <FiArrowRight size={14} />
            </div>
          </RouterLink>

          {/* Tool 2 */}
          <RouterLink className={toolCardStyle} to="/tools/mortgage-overpay-vs-isa">
            <div>
              <div
                className={iconBadgeStyle(
                  "color-mix(in srgb, var(--colors-chart-warning) 12%, transparent)",
                  "var(--colors-chart-warning)",
                )}
              >
                <FiHome />
              </div>
              <FLPHeading as="h2" color="text.primary" mb={2} size="lg">
                Mortgage overpay vs ISA calculator
              </FLPHeading>
              <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
                Compare the interest saved by overpaying a mortgage with possible growth in a UK
                Stocks and Shares ISA.
              </FLPText>
            </div>
            <div
              style={{
                marginTop: "24px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--colors-status-warning-text)",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Open calculator <FiArrowRight size={14} />
            </div>
          </RouterLink>

          {/* Tool 3 */}
          <RouterLink className={toolCardStyle} to="/tools/section-24-landlord-calculator">
            <div>
              <div
                className={iconBadgeStyle(
                  "color-mix(in srgb, var(--colors-chart-series2) 12%, transparent)",
                  "var(--colors-chart-series2)",
                )}
              >
                <FiDollarSign />
              </div>
              <FLPHeading as="h2" color="text.primary" mb={2} size="lg">
                Section 24 landlord tax calculator
              </FLPHeading>
              <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
                Calculate buy-to-let tax under Section 24 rules, including the 20% basic rate
                finance cost credit and true net cash flow.
              </FLPText>
            </div>
            <div
              style={{
                marginTop: "24px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--colors-chart-series2)",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Open calculator <FiArrowRight size={14} />
            </div>
          </RouterLink>

          {/* Tool 4: Debt Snowball vs Avalanche */}
          <RouterLink
            className={toolCardStyle}
            to="/tools/uk-debt-snowball-vs-avalanche-calculator"
          >
            <div>
              <div
                className={iconBadgeStyle(
                  "color-mix(in srgb, var(--colors-status-danger-text) 12%, transparent)",
                  "var(--colors-status-danger-text)",
                )}
              >
                <FaFire />
              </div>
              <FLPHeading as="h2" color="text.primary" mb={2} size="lg">
                Debt payoff: snowball vs avalanche calculator
              </FLPHeading>
              <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
                Compare mathematical interest savings against psychological momentum across your UK
                credit cards and loans.
              </FLPText>
            </div>
            <div
              style={{
                marginTop: "24px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--colors-status-danger-text)",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Open calculator <FiArrowRight size={14} />
            </div>
          </RouterLink>

          {/* Tool 5: 0% Balance Transfer Cliff */}
          <RouterLink
            className={toolCardStyle}
            to="/tools/0-percent-balance-transfer-payoff-calculator"
          >
            <div>
              <div
                className={iconBadgeStyle(
                  "color-mix(in srgb, var(--colors-chart-wealth) 12%, transparent)",
                  "var(--colors-chart-wealth)",
                )}
              >
                <FaCreditCard />
              </div>
              <FLPHeading as="h2" color="text.primary" mb={2} size="lg">
                0% balance transfer promotional expiry calculator
              </FLPHeading>
              <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
                Calculate the monthly payment required to clear your credit card balance before
                promotional 0% interest rates expire.
              </FLPText>
            </div>
            <div
              style={{
                marginTop: "24px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--colors-status-positive-text)",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Open calculator <FiArrowRight size={14} />
            </div>
          </RouterLink>

          {/* Tool 6: Arranged Overdraft Cost */}
          <RouterLink className={toolCardStyle} to="/tools/overdraft-cost-and-payoff-calculator">
            <div>
              <div
                className={iconBadgeStyle(
                  "color-mix(in srgb, var(--colors-chart-warning) 12%, transparent)",
                  "var(--colors-chart-warning)",
                )}
              >
                <FaMoneyBillWave />
              </div>
              <FLPHeading as="h2" color="text.primary" mb={2} size="lg">
                Overdraft interest cost calculator
              </FLPHeading>
              <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
                Calculate the true annual cost of arranged overdraft interest charges at standard UK
                rates of up to 39.9% EAR.
              </FLPText>
            </div>
            <div
              style={{
                marginTop: "24px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--colors-status-warning-text)",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Open calculator <FiArrowRight size={14} />
            </div>
          </RouterLink>

          {/* Tool 7: Student Loan Overpay or Invest */}
          <RouterLink
            className={toolCardStyle}
            to="/tools/uk-student-loan-overpay-or-invest-calculator"
          >
            <div>
              <div
                className={iconBadgeStyle(
                  "color-mix(in srgb, var(--colors-chart-accent-purple) 12%, transparent)",
                  "var(--colors-chart-accent-purple)",
                )}
              >
                <FaGraduationCap />
              </div>
              <FLPHeading as="h2" color="text.primary" mb={2} size="lg">
                UK student loan: overpay vs invest calculator
              </FLPHeading>
              <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
                Determine whether voluntary student loan repayments save you money before loan
                cancellation or whether investing yields more.
              </FLPText>
            </div>
            <div
              style={{
                marginTop: "24px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--colors-chart-accent-purple)",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              Open calculator <FiArrowRight size={14} />
            </div>
          </RouterLink>
        </div>
      </div>

      <HomeFooter />
    </div>
  );
};

export default ToolsIndex;
