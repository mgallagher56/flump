import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { Link as RouterLink } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

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
  gridTemplateColumns: { base: "1fr", md: "2fr 1fr 1fr" },
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
  "&:hover": {
    color: "primary",
  },
});

const disclaimerBoxStyle = css({
  padding: "16px",
  borderRadius: "xl",
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  fontSize: "xs",
  lineHeight: "1.5",
  marginBottom: "28px",
  color: "text.muted",
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
            The UK wealth intelligence, tax optimization, and long-term financial decision platform.
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
                Feature Pillars
              </a>
            </li>
            <li>
              <a className={linkStyle} href="#interactive-demo">
                Live Tax Sandbox
              </a>
            </li>
            <li>
              <a className={linkStyle} href="#comparison-heading">
                Spreadsheet Comparison
              </a>
            </li>
            <li>
              <a className={linkStyle} href="#faq-heading">
                FAQ
              </a>
            </li>
          </ul>
        </div>

        <div>
          <FLPHeading as="h4" color="text.primary" mb={3} size="sm">
            Account & Access
          </FLPHeading>
          <ul className={linkListStyle}>
            <li>
              <RouterLink className={linkStyle} to="/signUp">
                Sign Up
              </RouterLink>
            </li>
            <li>
              <RouterLink className={linkStyle} to="/login">
                Log In
              </RouterLink>
            </li>
            <li>
              <a
                className={linkStyle}
                href="https://github.com/marcgallagher/flump"
                rel="noreferrer"
                target="_blank"
              >
                GitHub Monorepo
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className={disclaimerBoxStyle}>
        <strong>Financial & Legal Disclaimer:</strong> Flump provides wealth forecasting, mortgage
        scenario simulations, and UK tax liability estimations for educational and decision-support
        purposes only. Flump is not an authorized or regulated financial advisory firm under the
        Financial Conduct Authority (FCA). HMRC tax legislation changes annually; please verify all
        tax filings with a certified tax accountant (CTA) or independent financial advisor (IFA).
      </div>

      <div className={bottomRowStyle}>
        <div>© {new Date().getFullYear()} Flump. Open-source personal finance platform.</div>
        <div>Built with React 19, React Router 7, Panda CSS, and WorkOS AuthKit.</div>
      </div>
    </footer>
  );
};

export default HomeFooter;
