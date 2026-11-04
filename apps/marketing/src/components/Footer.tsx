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
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "slate.400",
  mb: "4",
});

const linkStyle = css({
  color: "slate.300",
  textDecoration: "none",
  fontSize: "14px",
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
            columns: { base: 1, sm: 2, lg: 5 },
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
              The UK personal finance engine engineered specifically for HMRC rules, high marginal
              tax rates, and debt-to-wealth transitions.
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
                <FiLock size={12} /> Bank-Grade 256-bit AES
              </span>
            </div>
          </div>

          {/* Calculators */}
          <div className={stack({ gap: "3" })}>
            <h4 className={sectionTitleStyle}>Free UK Calculators</h4>
            <Link to="/tools/uk-100k-tax-trap-calculator" className={linkStyle}>
              £100k Tax Trap Calculator
            </Link>
            <Link to="/tools/uk-debt-snowball-vs-avalanche-calculator" className={linkStyle}>
              Snowball vs. Avalanche
            </Link>
            <Link to="/tools/0-percent-balance-transfer-payoff-calculator" className={linkStyle}>
              0% Balance Transfer Cliff
            </Link>
            <Link to="/tools/mortgage-overpayment-vs-isa-calculator" className={linkStyle}>
              Mortgage vs. S&S ISA
            </Link>
            <Link to="/tools/section-24-landlord-tax-calculator" className={linkStyle}>
              Section 24 Landlord Tax
            </Link>
            <Link to="/tools/overdraft-cost-and-payoff-calculator" className={linkStyle}>
              Arranged Overdraft EAR
            </Link>
          </div>

          {/* Platform */}
          <div className={stack({ gap: "3" })}>
            <h4 className={sectionTitleStyle}>Platform</h4>
            <a href={`${appUrl}/sandbox`} className={linkStyle} target="_blank" rel="noreferrer">
              Live Interactive Sandbox <FiExternalLink style={{ display: "inline" }} size={11} />
            </a>
            <Link to="/pricing" className={linkStyle}>
              Pricing & Tier Matrix
            </Link>
            <a href={`${appUrl}/login`} className={linkStyle}>
              Sign In to Web App
            </a>
            <a href={`${appUrl}/signUp`} className={linkStyle}>
              Create Free Account
            </a>
          </div>

          {/* Security & Compliance */}
          <div className={stack({ gap: "3" })}>
            <h4 className={sectionTitleStyle}>Security & Compliance</h4>
            <Link to="/security" className={linkStyle}>
              FCA AISP Read-Only Scope
            </Link>
            <Link to="/security" className={linkStyle}>
              UK GDPR Data Policies
            </Link>
            <Link to="/security" className={linkStyle}>
              Manual-Only Privacy Mode
            </Link>
            <Link to="/security" className={linkStyle}>
              Encryption Standards
            </Link>
          </div>

          {/* Financial Playbooks */}
          <div className={stack({ gap: "3" })}>
            <h4 className={sectionTitleStyle}>UK Playbooks</h4>
            <Link to="/guides/how-to-escape-the-60-percent-tax-trap" className={linkStyle}>
              Escape the 60% Tax Trap
            </Link>
            <Link to="/guides/snowball-vs-avalanche-uk-overdrafts-cards" className={linkStyle}>
              Card & Overdraft Payoff
            </Link>
            <Link to="/guides/mortgage-fix-ending-overpay-vs-invest" className={linkStyle}>
              Mortgage Fix Ending Strategy
            </Link>
            <Link to="/guides/section-24-landlord-tax-survival" className={linkStyle}>
              Section 24 BTL Survival
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
              FCA Open Banking Read-Only & Regulatory Notice:
            </strong>
          </div>
          <p style={{ margin: "0 0 12px 0" }}>
            Flump is a personal finance analytics, projection, and modeling platform. Flump connects
            to UK financial institutions via regulated Open Banking Account Information Services
            (AISP) on a strictly read-only basis. Flump cannot initiate payments, move funds, or
            alter account configurations. Flump does not provide regulated financial, tax, or
            investment advice. Tax calculations reflect UK EWNI and Scottish HMRC rules for current
            tax years as reference models.
          </p>
          <div className={flex({ justify: "space-between", flexWrap: "wrap", gap: "4" })}>
            <span>
              © {currentYear} Flump Technologies Ltd. All rights reserved. Registered in England &
              Wales.
            </span>
            <div className={flex({ gap: "4" })}>
              <Link to="/security" style={{ color: "#94a3b8", textDecoration: "none" }}>
                Privacy & Data Deletion
              </Link>
              <Link to="/security" style={{ color: "#94a3b8", textDecoration: "none" }}>
                Security Whitepaper
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
