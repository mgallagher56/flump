import { BUSINESS_DETAILS, companyLine } from "@flump/business-details";
import { css } from "@repo/ui/styled-system/css";
import { flex, grid, stack } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiExternalLink } from "react-icons/fi";
import { Link } from "react-router-dom";
import { getAppUrl } from "../utils/url";

const footerStyle = css({
  backgroundColor: "surface.contrast",
  color: "text.onContrast",
  pt: "16",
  pb: "12",
  px: { base: "6", md: "12" },
  mt: "24",
  borderTop: "1px solid",
  borderColor: "border.strong",
});

const sectionTitleStyle = css({
  fontSize: "xs",
  fontWeight: "700",
  letterSpacing: "0.02em",
  color: "text.onContrast",
  fontFamily: "display",
  mb: "4",
});

const linkStyle = css({
  color: "text.onContrast",
  textDecoration: "none",
  fontSize: "sm",
  transition: "color 0.15s ease",
  _hover: { textDecoration: "underline" },
});

const brandStyle = css({
  fontSize: "1.75rem",
  fontWeight: "800",
  letterSpacing: "-0.03em",
  color: "text.onContrast",
});

const brandDotStyle = css({ color: "primary" });

const taglineStyle = css({ fontSize: "14px", lineHeight: "1.6", color: "text.onContrast" });

const legalStyle = css({
  borderTop: "1px solid",
  borderColor: "border.strong",
  paddingTop: "24px",
  fontSize: "12px",
  lineHeight: "1.7",
  color: "text.onContrast",
  fontVariantNumeric: "tabular-nums",
});

const placeholderStyle = css({
  fontWeight: "600",
  color: "status.warning.text",
  backgroundColor: "status.warning.bg",
  border: "1px solid",
  borderColor: "status.warning.border",
  borderRadius: "md",
  padding: "1 2",
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
              <span className={brandStyle}>
                Flump<span className={brandDotStyle}>.</span>
              </span>
            </div>
            <p className={taglineStyle}>
              A UK personal finance planner for tax thresholds, pension optimisation and debt
              payoff.
            </p>
          </div>

          {/* Calculators */}
          <div className={stack({ gap: "3" })}>
            <h2 className={sectionTitleStyle}>Calculators</h2>
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
            <h2 className={sectionTitleStyle}>Platform</h2>
            <a href={`${appUrl}/sandbox`} className={linkStyle} target="_blank" rel="noreferrer">
              Live interactive demo <FiExternalLink style={{ display: "inline" }} size={11} />
            </a>
            <Link to="/mcp" className={linkStyle}>
              AI & MCP Protocol
            </Link>
            <Link to="/pricing" className={linkStyle}>
              Pricing plans
            </Link>
            <a href={`${appUrl}/login`} className={linkStyle}>
              Sign in to web app
            </a>
            <a href={`${appUrl}/signUp`} className={linkStyle}>
              Create an account
            </a>
          </div>

          {/* Security and privacy */}
          <div className={stack({ gap: "3" })}>
            <h2 className={sectionTitleStyle}>Security and privacy</h2>
            <Link to="/security" className={linkStyle}>
              Security and privacy
            </Link>
          </div>
        </div>

        {/* Company details: read from @flump/business-details (placeholders until the owner edits it). */}
        <div className={legalStyle}>
          <div className={flex({ justify: "space-between", flexWrap: "wrap", gap: "4" })}>
            <span
              className={BUSINESS_DETAILS.legalName.isPlaceholder ? placeholderStyle : undefined}
            >
              {companyLine(currentYear)}
            </span>
            <a href={`mailto:${BUSINESS_DETAILS.supportEmail.value}`} className={linkStyle}>
              {BUSINESS_DETAILS.supportEmail.value}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
