import { css } from "@repo/ui/styled-system/css";
import { grid } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { Helmet } from "react-helmet-async";
import { FiEyeOff, FiLock, FiShield, FiTrash2 } from "react-icons/fi";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import {
  accountClosureMailto,
  SECURITY_CONTACT_EMAIL,
  securityMailto,
} from "../utils/placeholders";

const containerStyle = css({
  maxWidth: "5xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const sectionCardStyle = css({
  backgroundColor: "surface.card",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  p: { base: "6", md: "8" },
  mb: "8",
});

const iconTileStyle = css({
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  marginBottom: "16px",
});

const iconTileTones = {
  positive: css({ backgroundColor: "status.positive.bg", color: "status.positive.text" }),
  info: css({ backgroundColor: "status.info.bg", color: "status.info.text" }),
  warning: css({ backgroundColor: "status.warning.bg", color: "status.warning.text" }),
  neutral: css({ backgroundColor: "status.neutral.bg", color: "status.neutral.text" }),
};

const securityTitleStyle = css({
  fontSize: "1.25rem",
  fontWeight: "700",
  color: "text.primary",
  marginBottom: "8px",
});

const securityDescStyle = css({
  fontSize: "14px",
  color: "text.secondary",
  lineHeight: "1.7",
});

const linkStyle = css({
  color: "primary",
  textDecoration: "underline",
  fontWeight: "600",
});

const eyebrowStyle = css({
  fontSize: "12px",
  fontWeight: "600",
  letterSpacing: "0.01em",
  color: "status.positive.text",
});

const heroTitleStyle = css({
  fontSize: "clamp(2rem, 4vw, 3rem)",
  fontWeight: "800",
  color: "text.primary",
  marginTop: "8px",
});

const heroBodyStyle = css({
  fontSize: "1.1rem",
  color: "text.secondary",
  maxWidth: "620px",
  margin: "12px auto 0",
});

const contactRowStyle = css({ textAlign: "center", fontSize: "14px", color: "text.secondary" });

export const SecurityPage: FC = () => {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Helmet>
        <title>Security and privacy | Flump</title>
        <meta
          name="description"
          content="How Flump handles your data: manual-first planning, encrypted bank connection tokens and no data selling."
        />
        <link rel="canonical" href="https://flump.co.uk/security" />
      </Helmet>

      <Header />

      <main style={{ flex: 1 }}>
        <section className={containerStyle}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <span className={eyebrowStyle}>Trust and transparency hub</span>
            <h1 className={heroTitleStyle}>Security built into the architecture</h1>
            <p className={heroBodyStyle}>
              Flump is built around minimal data access. You choose what to enter, bank connection
              tokens are encrypted, and your data is visible only to your account.
            </p>
          </div>

          <div className={grid({ columns: { base: 1, md: 2 }, gap: "6", mb: "12" })}>
            <div className={sectionCardStyle}>
              <div className={`${iconTileStyle} ${iconTileTones.positive}`}>
                <FiShield />
              </div>
              <h3 className={securityTitleStyle}>Read-only by design</h3>
              <p className={securityDescStyle}>
                Flump only reads balances and transactions. It has no feature to make payments, move
                money or change your account settings. Bank connection is coming soon.
              </p>
            </div>

            <div className={sectionCardStyle}>
              <div className={`${iconTileStyle} ${iconTileTones.info}`}>
                <FiLock />
              </div>
              <h3 className={securityTitleStyle}>Encryption</h3>
              <p className={securityDescStyle}>
                Bank connection tokens are encrypted at rest with AES-256-GCM. The marketing site is
                served over HTTPS, and browsers are told to use HTTPS only.
              </p>
            </div>

            <div className={sectionCardStyle}>
              <div className={`${iconTileStyle} ${iconTileTones.warning}`}>
                <FiEyeOff />
              </div>
              <h3 className={securityTitleStyle}>Private manual mode</h3>
              <p className={securityDescStyle}>
                Flump works fully with manual entries, giving you the same tax and wealth
                projections without connecting a bank.
              </p>
            </div>

            <div className={sectionCardStyle}>
              <div className={`${iconTileStyle} ${iconTileTones.neutral}`}>
                <FiTrash2 />
              </div>
              <h3 className={securityTitleStyle}>Your data, your choice</h3>
              <p className={securityDescStyle}>
                We never sell your data or transaction history. You can delete all your financial
                data from your profile at any time. To close your account completely, email{" "}
                <a className={linkStyle} href={accountClosureMailto()}>
                  {SECURITY_CONTACT_EMAIL}
                </a>
                .
              </p>
            </div>
          </div>

          <p className={contactRowStyle}>
            Found a security issue?{" "}
            <a className={linkStyle} href={securityMailto()}>
              Email security
            </a>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
};
