import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { Link as RouterLink } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { APP_VERSION, feedbackMailto } from "~/utils/support";

const footerContainerStyle = css({
  borderTop: "1px solid",
  borderColor: "border",
  paddingTop: "48px",
  paddingBottom: "48px",
  marginTop: "40px",
  color: "text.muted",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", md: "2fr 1fr 1fr 1fr" },
  gap: "32px",
  marginBottom: "36px",
});

const linkListStyle = css({
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  fontSize: "sm",
});

const linkStyle = css({
  color: "text.muted",
  textDecoration: "none",
  transition: "color 0.15s ease",
  cursor: "pointer",
  backgroundColor: "transparent",
  border: "none",
  padding: 0,
  font: "inherit",
  textAlign: "left",
  display: "inline-block",
  "&:hover": {
    color: "primary",
  },
});

const bottomRowStyle = css({
  display: "flex",
  flexDirection: { base: "column", sm: "row" },
  alignItems: { base: "flex-start", sm: "center" },
  justifyContent: "space-between",
  gap: "16px",
  fontSize: "xs",
  borderTop: "1px solid",
  borderColor: "border",
  paddingTop: "24px",
});

export const HomeFooter: FC = () => {
  return (
    <footer className={footerContainerStyle}>
      <div className={gridStyle}>
        <div>
          <FLPHeading as="h3" color="text.primary" mb={2} size="md">
            Flump
          </FLPHeading>
          <FLPText color="text.muted" fontSize="sm" lineHeight="1.6" style={{ maxWidth: "380px" }}>
            The UK wealth intelligence, tax optimisation, and long-term financial decision platform.
            Open-source architecture engineered for clarity and privacy.
          </FLPText>
        </div>

        <div>
          <FLPHeading as="h4" color="text.primary" mb={3} size="sm">
            Platform
          </FLPHeading>
          <ul className={linkListStyle}>
            <li>
              <a className={linkStyle} href="#features-heading">
                Feature pillars
              </a>
            </li>
            <li>
              <a className={linkStyle} href="#interactive-demo">
                Live tax sandbox
              </a>
            </li>
            <li>
              <a className={linkStyle} href="#comparison-heading">
                Spreadsheet comparison
              </a>
            </li>
            <li>
              <a className={linkStyle} href="#faq-heading">
                Frequently asked questions
              </a>
            </li>
          </ul>
        </div>

        <div>
          <FLPHeading as="h4" color="text.primary" mb={3} size="sm">
            Free calculators
          </FLPHeading>
          <ul className={linkListStyle}>
            <li>
              <RouterLink className={linkStyle} to="/tools/uk-100k-tax-trap-calculator">
                £100k tax trap
              </RouterLink>
            </li>
            <li>
              <RouterLink className={linkStyle} to="/tools/mortgage-overpay-vs-isa">
                Mortgage vs ISA
              </RouterLink>
            </li>
            <li>
              <RouterLink className={linkStyle} to="/tools/section-24-landlord-calculator">
                Section 24 landlord
              </RouterLink>
            </li>
            <li>
              <RouterLink
                className={linkStyle}
                to="/tools/uk-debt-snowball-vs-avalanche-calculator"
              >
                Snowball vs avalanche
              </RouterLink>
            </li>
            <li>
              <RouterLink
                className={linkStyle}
                to="/tools/0-percent-balance-transfer-payoff-calculator"
              >
                0% balance transfer expiry
              </RouterLink>
            </li>
            <li>
              <RouterLink className={linkStyle} to="/tools">
                All calculators →
              </RouterLink>
            </li>
          </ul>
        </div>

        <div>
          <FLPHeading as="h4" color="text.primary" mb={3} size="sm">
            Account and support
          </FLPHeading>
          <ul className={linkListStyle}>
            <li>
              <RouterLink className={linkStyle} to="/signUp">
                Sign up
              </RouterLink>
            </li>
            <li>
              <RouterLink className={linkStyle} to="/login">
                Sign in
              </RouterLink>
            </li>
            <li>
              <a className={linkStyle} href={feedbackMailto("home", APP_VERSION)}>
                Send feedback
              </a>
            </li>
            <li>
              <a
                className={linkStyle}
                href="https://github.com/marcgallagher/flump"
                rel="noreferrer"
                target="_blank"
              >
                GitHub monorepo
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className={bottomRowStyle}>
        <div>© {new Date().getFullYear()} Flump. Open-source personal finance platform.</div>
        <div>Built with React 19, React Router 7, Panda CSS, and WorkOS AuthKit.</div>
      </div>
    </footer>
  );
};

export default HomeFooter;
