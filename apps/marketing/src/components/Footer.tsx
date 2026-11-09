import { css } from "@repo/ui/styled-system/css";
import { flex, grid, stack } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiExternalLink, FiLock, FiShield } from "react-icons/fi";
import { Link } from "react-router-dom";
import { getAppUrl } from "../utils/url";

const footerStyle = css({
  backgroundColor: "slate.900",
  color: "slate.300",
  pt: "16",
  pb: "12",
  px: { base: "6", md: "12" },
  mt: "24",
  borderTop: "1px solid",
  borderColor: "slate.800",
});

const sectionTitleStyle = css({
  fontSize: "xs",
  fontWeight: "700",
  letterSpacing: "0.02em",
  color: "slate.400",
  fontFamily: "display",
  mb: "4",
});

const linkStyle = css({
  color: "slate.300",
  textDecoration: "none",
  fontSize: "sm",
  transition: "color 0.15s ease",
  _hover: { color: "#ffffff" },
});

export const Footer: FC = () => {
  const appUrl = getAppUrl();
  const currentYear = new Date().getFullYear();

  return (
    <footer className={footerStyle}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          className={grid({
            columns: { base: 1, sm: 2, lg: 4 },
            gap: "8",
            mb: "12",
          })}
        >
          {/* Brand Col */}
          <div style={{ gridColumn: "span 1" }} className={stack({ gap: "4" })}>
            <div className={flex({ align: "center", gap: "2" })}>
              <span
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "800",
                  letterSpacing: "-0.03em",
                  color: "#ffffff",
                }}
              >
                Flump<span style={{ color: "#818cf8" }}>.</span>
              </span>
            </div>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#94a3b8" }}>
              The UK personal finance platform built for HMRC tax thresholds, pension optimisation,
              and clear debt payoff.
            </p>
            <div className={flex({ gap: "3", align: "center" })}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "#a5b4fc",
                  backgroundColor: "rgba(99, 102, 241, 0.15)",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                <FiLock size={12} /> 256-bit AES encryption
              </span>
            </div>
          </div>

          {/* Calculators */}
          <div className={stack({ gap: "3" })}>
            <h4 className={sectionTitleStyle}>Calculators</h4>
            <Link to="/tools/uk-100k-tax-trap-calculator" className={linkStyle}>
              £100k tax trap calculator
            </Link>
            <Link to="/tools/uk-debt-snowball-vs-avalanche-calculator" className={linkStyle}>
              Snowball vs avalanche
            </Link>
            <Link to="/tools/0-percent-balance-transfer-payoff-calculator" className={linkStyle}>
              0% balance transfer calculator
            </Link>
            <Link to="/tools/mortgage-overpayment-vs-isa-calculator" className={linkStyle}>
              Mortgage vs Stocks and Shares ISA
            </Link>
            <Link to="/tools/section-24-landlord-tax-calculator" className={linkStyle}>
              Section 24 landlord tax
            </Link>
            <Link to="/tools/overdraft-cost-and-payoff-calculator" className={linkStyle}>
              Overdraft cost and payoff
            </Link>
          </div>

          {/* Platform */}
          <div className={stack({ gap: "3" })}>
            <h4 className={sectionTitleStyle}>Platform</h4>
            <a href={`${appUrl}/sandbox`} className={linkStyle} target="_blank" rel="noreferrer">
              Live interactive demo <FiExternalLink style={{ display: "inline" }} size={11} />
            </a>
            <Link to="/pricing" className={linkStyle}>
              Pricing plans
            </Link>
            <a href={`${appUrl}/login`} className={linkStyle}>
              Sign in to web app
            </a>
            <a href={`${appUrl}/signUp`} className={linkStyle}>
              Create free account
            </a>
          </div>

          {/* Security & Compliance */}
          <div className={stack({ gap: "3" })}>
            <h4 className={sectionTitleStyle}>Security and compliance</h4>
            <Link to="/security" className={linkStyle}>
              FCA AISP read-only scope
            </Link>
            <Link to="/security" className={linkStyle}>
              UK GDPR data policies
            </Link>
            <Link to="/security" className={linkStyle}>
              Manual privacy mode
            </Link>
            <Link to="/security" className={linkStyle}>
              Security architecture
            </Link>
          </div>
        </div>

        {/* Regulatory & Disclaimer Notice */}
        <div
          style={{
            borderTop: "1px solid #1e293b",
            paddingTop: "24px",
            fontSize: "12px",
            lineHeight: "1.7",
            color: "#64748b",
          }}
        >
          <div className={flex({ gap: "2", align: "center", mb: "2", color: "#94a3b8" })}>
            <FiShield size={14} style={{ color: "#10b981" }} />
            <strong style={{ color: "#cbd5e1" }}>
              FCA Open Banking read-only and regulatory notice:
            </strong>
          </div>
          <p style={{ margin: "0 0 12px 0" }}>
            Flump is a personal finance analytics, projection, and modelling platform. Flump
            connects to UK financial institutions via regulated Open Banking Account Information
            Services (AISP) on a strictly read-only basis. Flump cannot initiate payments, move
            funds, or alter account configurations. Flump does not provide regulated financial, tax,
            or investment advice. Tax calculations reflect UK HMRC rules for current tax years as
            reference models.
          </p>
          <div className={flex({ justify: "space-between", flexWrap: "wrap", gap: "4" })}>
            <span>
              © {currentYear} Flump Technologies Ltd. All rights reserved. Registered in England &
              Wales.
            </span>
            <div className={flex({ gap: "4" })}>
              <Link to="/security" style={{ color: "#94a3b8", textDecoration: "none" }}>
                Security & Data Policies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
