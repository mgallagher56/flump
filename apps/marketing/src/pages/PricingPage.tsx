import { Button } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { flex, grid, stack } from "@repo/ui/styled-system/patterns";
import { type FC, useState } from "react";
import { Helmet } from "react-helmet-async";
import { FiCheck, FiClock } from "react-icons/fi";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { PRICE_PLACEHOLDER, PRICE_PLACEHOLDER_ANNUAL } from "../utils/placeholders";
import { getAppUrl } from "../utils/url";

const containerStyle = css({ maxWidth: "6xl", mx: "auto", py: "16", px: "4" });

const eyebrowStyle = css({ fontSize: "12px", fontWeight: "600", color: "primary" });

const headingStyle = css({
  fontSize: "clamp(2rem, 4vw, 3rem)",
  fontWeight: "800",
  color: "text.primary",
  marginTop: "2",
});

const introStyle = css({
  fontSize: "1.1rem",
  color: "text.secondary",
  maxWidth: "600px",
  margin: "3 auto 0",
});

const toggleTrackStyle = css({
  width: "56px",
  height: "30px",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.input",
  backgroundColor: "surface.subtle",
  cursor: "pointer",
  position: "relative",
  padding: "3px",
  '&[aria-checked="true"]': { backgroundColor: "primary.solid", borderColor: "primary.border" },
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

const toggleThumbStyle = css({
  display: "block",
  width: "22px",
  height: "22px",
  borderRadius: "full",
  backgroundColor: "surface.card",
  boxShadow: "sm",
  transition: "transform 0.2s ease",
});

const cardStyle = css({
  backgroundColor: "surface.card",
  border: "2px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: "8",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  '&[data-featured="true"]': { borderColor: "primary.border" },
});

const planNameStyle = css({ fontSize: "1.5rem", fontWeight: "800", color: "text.primary" });
const planDescStyle = css({ fontSize: "14px", color: "text.secondary", minHeight: "42px" });

const priceRowStyle = css({
  margin: "6 0 2",
  display: "flex",
  alignItems: "baseline",
  gap: "1",
  flexWrap: "wrap",
});

const priceStyle = css({
  fontSize: "2.75rem",
  fontWeight: "900",
  color: "text.primary",
  fontVariantNumeric: "tabular-nums",
});

const priceUnitStyle = css({
  fontSize: "1rem",
  color: "text.secondary",
  fontVariantNumeric: "tabular-nums",
});

const placeholderNoteStyle = css({
  fontSize: "12px",
  fontWeight: "600",
  color: "status.warning.text",
  backgroundColor: "status.warning.bg",
  border: "1px solid",
  borderColor: "status.warning.border",
  borderRadius: "md",
  padding: "1 2",
  display: "inline-block",
  marginBottom: "6",
});

const featureStyle = css({ fontSize: "14px", color: "text.primary" });
const checkStyle = css({ color: "status.positive.text", flexShrink: 0 });
const pendingStyle = css({ color: "text.muted", flexShrink: 0 });

const FREE_FEATURES = [
  "£100k–£125k tax trap and childcare calculator",
  "Debt snowball vs avalanche payoff",
  "0% balance transfer payoff calculator",
  "Section 24 landlord tax calculator",
  "Mortgage overpayment vs Stocks and Shares ISA",
  "Arranged overdraft cost and payoff modeller",
  "Student loan overpay or invest calculator",
];

export const PricingPage: FC = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const appUrl = getAppUrl();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Helmet>
        <title>Pricing and plans | Flump</title>
        <meta
          name="description"
          content="Flump's planning tools are free to use while pricing is being finalised. Paid plan prices are placeholders and not final."
        />
      </Helmet>

      <Header />

      <main style={{ flex: 1 }}>
        <section className={containerStyle}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <span className={eyebrowStyle}>Pricing</span>
            <h1 className={headingStyle}>Pricing</h1>
            <p className={introStyle}>
              The calculators are free to use today. A paid plan is planned; its price is not set
              yet.
            </p>

            <div className={flex({ justify: "center", align: "center", gap: "3", mt: "8" })}>
              <span
                className={css({
                  fontSize: "14px",
                  color: "text.primary",
                  fontWeight: isAnnual ? "500" : "700",
                })}
              >
                Monthly billing
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isAnnual}
                aria-label="Annual billing"
                className={toggleTrackStyle}
                onClick={() => setIsAnnual((v) => !v)}
              >
                <span
                  className={toggleThumbStyle}
                  style={{ transform: isAnnual ? "translateX(26px)" : "translateX(0)" }}
                />
              </button>
              <span
                className={css({
                  fontSize: "14px",
                  color: "text.primary",
                  fontWeight: isAnnual ? "700" : "500",
                })}
              >
                Annual billing
              </span>
            </div>
          </div>

          <div
            className={grid({
              columns: { base: 1, md: 2 },
              gap: "8",
              maxW: "4xl",
              mx: "auto",
              mb: "16",
            })}
          >
            <div className={cardStyle} data-featured="false">
              <div>
                <h2 className={planNameStyle}>Free</h2>
                <p className={planDescStyle}>The calculators listed on the Flump tools page.</p>

                <div className={priceRowStyle}>
                  <span className={priceStyle}>Free today</span>
                </div>
                <div style={{ height: "36px" }} />

                <ul
                  className={stack({ gap: "3", mb: "8" })}
                  style={{ listStyle: "none", padding: 0 }}
                >
                  {FREE_FEATURES.map((feature) => (
                    <li key={feature} className={flex({ align: "center", gap: "2" })}>
                      <FiCheck size={18} className={checkStyle} aria-hidden="true" />
                      <span className={featureStyle}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <a href={`${appUrl}/signUp`} style={{ textDecoration: "none" }}>
                <Button
                  size="lg"
                  variant="outline"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  Get started
                </Button>
              </a>
            </div>

            <div className={cardStyle} data-featured="true">
              <div>
                <h2 className={planNameStyle}>Paid plan</h2>
                <p className={planDescStyle}>
                  A future paid plan. Nothing is charged today and it cannot be purchased yet.
                </p>

                <div className={priceRowStyle}>
                  <span className={priceStyle}>
                    {isAnnual ? PRICE_PLACEHOLDER_ANNUAL : PRICE_PLACEHOLDER}
                  </span>
                  <span className={priceUnitStyle}>
                    per month{isAnnual ? ", billed annually" : ""}
                  </span>
                </div>
                <span className={placeholderNoteStyle}>Placeholder price: not final</span>

                <ul
                  className={stack({ gap: "3", mb: "8" })}
                  style={{ listStyle: "none", padding: 0 }}
                >
                  <li className={flex({ align: "center", gap: "2" })}>
                    <FiCheck size={18} className={checkStyle} aria-hidden="true" />
                    <span className={featureStyle}>Everything in Free</span>
                  </li>
                  <li className={flex({ align: "center", gap: "2" })}>
                    <FiClock size={18} className={pendingStyle} aria-hidden="true" />
                    <span className={featureStyle}>Bank connection (coming soon)</span>
                  </li>
                </ul>
              </div>

              <Button
                size="lg"
                variant="primary"
                disabled
                style={{ width: "100%", justifyContent: "center" }}
              >
                Pricing coming soon
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
