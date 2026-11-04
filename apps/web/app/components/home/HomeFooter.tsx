import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import { FiMail } from "react-icons/fi";
import { Link as RouterLink } from "react-router";
import FLPModal from "~/components/core/dialogs/FLPModal";
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
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSendFeedback = () => {
    if (message.trim()) {
      setFeedbackSent(true);
      setTimeout(() => {
        setIsContactOpen(false);
        setFeedbackSent(false);
        setSubject("");
        setMessage("");
      }, 1500);
    }
  };

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
            Free Calculators
          </FLPHeading>
          <ul className={linkListStyle}>
            <li>
              <RouterLink className={linkStyle} to="/tools/uk-100k-tax-trap-calculator">
                £100k Tax Trap
              </RouterLink>
            </li>
            <li>
              <RouterLink className={linkStyle} to="/tools/mortgage-overpay-vs-isa">
                Mortgage vs. ISA
              </RouterLink>
            </li>
            <li>
              <RouterLink className={linkStyle} to="/tools/section-24-landlord-calculator">
                Section 24 Landlord
              </RouterLink>
            </li>
            <li>
              <RouterLink
                className={linkStyle}
                to="/tools/uk-debt-snowball-vs-avalanche-calculator"
              >
                Snowball vs. Avalanche
              </RouterLink>
            </li>
            <li>
              <RouterLink
                className={linkStyle}
                to="/tools/0-percent-balance-transfer-payoff-calculator"
              >
                0% Balance Transfer Cliff
              </RouterLink>
            </li>
            <li>
              <RouterLink className={linkStyle} to="/tools">
                All Calculators →
              </RouterLink>
            </li>
          </ul>
        </div>

        <div>
          <FLPHeading as="h4" color="text.primary" mb={3} size="sm">
            Account & Support
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
              <button className={linkStyle} type="button" onClick={() => setIsContactOpen(true)}>
                Contact & Feedback
              </button>
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

      {isContactOpen && (
        <FLPModal
          open={isContactOpen}
          title="Contact & Feedback"
          triggerBtn={<span style={{ display: "none" }} />}
          confirmButton={{
            text: feedbackSent ? "Sent!" : "Send Feedback",
          }}
          onClose={() => setIsContactOpen(false)}
          onConfirm={handleSendFeedback}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
            <FLPText color="text.muted" fontSize="sm">
              Have a question, feature request, or need help with UK tax modeling? We'd love to hear
              from you.
            </FLPText>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                backgroundColor: "rgba(99, 102, 241, 0.08)",
                borderRadius: "8px",
                fontSize: "14px",
                color: "var(--colors-primary)",
              }}
            >
              <FiMail />
              <span>
                Direct Email: <strong>support@flump.app</strong>
              </span>
            </div>

            {feedbackSent ? (
              <div style={{ color: "#10b981", fontWeight: 600, padding: "12px 0" }}>
                Thank you! Your message has been received.
              </div>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="contact-subject"
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Subject
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    placeholder="e.g. Question about £100k tax trap or feature request"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--colors-border)",
                      backgroundColor: "var(--colors-surface)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    placeholder="Tell us what you're trying to model or what we can improve..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--colors-border)",
                      backgroundColor: "var(--colors-surface)",
                      color: "inherit",
                      resize: "vertical",
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </FLPModal>
      )}
    </footer>
  );
};

export default HomeFooter;
