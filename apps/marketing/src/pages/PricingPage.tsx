import { Button } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { flex, grid, stack } from "@repo/ui/styled-system/patterns";
import { type FC, useState } from "react";
import { Helmet } from "react-helmet-async";
import { FiCheck, FiMinus } from "react-icons/fi";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { getAppUrl } from "../utils/url";

const containerStyle = css({
  maxWidth: "6xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const tierCardStyle = (isPopular = false) =>
  css({
    backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
    border: "2px solid",
    borderColor: isPopular ? "indigo.500" : { base: "slate.200", _dark: "slate.800" },
    borderRadius: "2xl",
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    boxShadow: isPopular
      ? {
          base: "0 16px 40px rgba(99, 102, 241, 0.12)",
          _dark: "0 16px 40px rgba(99, 102, 241, 0.25)",
        }
      : { base: "0 4px 16px rgba(0,0,0,0.04)", _dark: "0 4px 16px rgba(0,0,0,0.2)" },
  });

export const PricingPage: FC = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const appUrl = getAppUrl();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Helmet>
        <title>Pricing and plans | Free manual vs Pro Open Banking | Flump</title>
        <meta
          name="description"
          content="Choose between our free manual tier or upgrade to Pro for automated FCA Open Banking sync and complete UK tax tools."
        />
        <link rel="canonical" href="https://flump.co.uk/pricing" />
      </Helmet>

      <Header />

      <main style={{ flex: 1 }}>
        <section className={containerStyle}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.01em",
                color: "var(--colors-primary)",
              }}
            >
              Simple, transparent pricing
            </span>
            <h1
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: "800",
                color: "var(--colors-text-primary, #0f172a)",
                marginTop: "8px",
              }}
            >
              Choose the plan for your financial journey
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#64748b",
                maxWidth: "600px",
                margin: "12px auto 0",
              }}
            >
              Start completely free with manual control, or unlock real-time bank sync and advanced
              UK tax modelling.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className={flex({ justify: "center", align: "center", gap: "3", mt: "8" })}>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: isAnnual ? "500" : "700",
                  color: isAnnual
                    ? "var(--colors-text-muted, #64748b)"
                    : "var(--colors-text-primary, #0f172a)",
                }}
              >
                Monthly billing
              </span>
              <button
                type="button"
                onClick={() => setIsAnnual(!isAnnual)}
                style={{
                  width: "56px",
                  height: "30px",
                  borderRadius: "9999px",
                  backgroundColor: isAnnual ? "#6363F1" : "#cbd5e1",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background-color 0.2s ease",
                  padding: "3px",
                }}
                aria-label="Toggle annual billing"
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    transform: isAnnual ? "translateX(26px)" : "translateX(0)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: isAnnual ? "700" : "500",
                  color: isAnnual
                    ? "var(--colors-text-primary, #0f172a)"
                    : "var(--colors-text-muted, #64748b)",
                }}
              >
                Annual billing{" "}
                <span style={{ color: "#10b981", fontWeight: "700" }}>(Save 20%)</span>
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div
            className={grid({
              columns: { base: 1, md: 2 },
              gap: "8",
              maxW: "4xl",
              mx: "auto",
              mb: "16",
            })}
          >
            {/* Free Tier */}
            <div className={tierCardStyle(false)}>
              <div>
                <h3
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "800",
                    color: "var(--colors-text-primary, #0f172a)",
                    marginBottom: "4px",
                  }}
                >
                  Free manual tier
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--colors-text-muted, #64748b)",
                    minHeight: "42px",
                  }}
                >
                  Ideal for spreadsheet users who want complete control over their personal data.
                </p>

                <div
                  style={{ margin: "24px 0", display: "flex", alignItems: "baseline", gap: "4px" }}
                >
                  <span
                    style={{
                      fontSize: "2.75rem",
                      fontWeight: "900",
                      color: "var(--colors-text-primary, #0f172a)",
                    }}
                  >
                    £0
                  </span>
                  <span style={{ fontSize: "1rem", color: "var(--colors-text-muted, #64748b)" }}>
                    / forever
                  </span>
                </div>

                <div className={stack({ gap: "3", mb: "8" })}>
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      fontSize: "14px",
                      color: "var(--colors-text-primary, #334155)",
                    })}
                  >
                    <FiCheck color="#10b981" size={18} /> Unlimited manual accounts and pots
                  </div>
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      fontSize: "14px",
                      color: "var(--colors-text-primary, #334155)",
                    })}
                  >
                    <FiCheck color="#10b981" size={18} /> Debt payoff (snowball and avalanche)
                  </div>
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      fontSize: "14px",
                      color: "var(--colors-text-primary, #334155)",
                    })}
                  >
                    <FiCheck color="#10b981" size={18} /> Safe to spend and emergency runway
                  </div>
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      fontSize: "14px",
                      color: "var(--colors-text-primary, #334155)",
                    })}
                  >
                    <FiCheck color="#10b981" size={18} /> CSV transaction and balance imports
                  </div>
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      fontSize: "14px",
                      color: "var(--colors-text-primary, #334155)",
                    })}
                  >
                    <FiCheck color="#10b981" size={18} /> 5-year net worth forecast
                  </div>
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      fontSize: "14px",
                      color: "#94a3b8",
                    })}
                  >
                    <FiMinus size={18} /> FCA Open Banking auto-sync
                  </div>
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      fontSize: "14px",
                      color: "#94a3b8",
                    })}
                  >
                    <FiMinus size={18} /> Section 24 landlord tax calculations
                  </div>
                </div>
              </div>

              <a href={`${appUrl}/signUp?plan=free`} style={{ textDecoration: "none" }}>
                <Button
                  size="lg"
                  variant="outline"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  Get started free
                </Button>
              </a>
            </div>

            {/* Pro Tier */}
            <div className={tierCardStyle(true)}>
              <div
                style={{
                  position: "absolute",
                  top: "-14px",
                  right: "32px",
                  backgroundColor: "#6363F1",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: "700",
                  padding: "4px 12px",
                  borderRadius: "9999px",
                  letterSpacing: "0.04em",
                }}
              >
                RECOMMENDED
              </div>

              <div>
                <h3
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "800",
                    color: "var(--colors-text-primary, #0f172a)",
                    marginBottom: "4px",
                  }}
                >
                  Pro Open Banking and tax tools
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--colors-text-muted, #64748b)",
                    minHeight: "42px",
                  }}
                >
                  Automated live bank feeds and comprehensive UK tax models.
                </p>

                <div
                  style={{ margin: "24px 0", display: "flex", alignItems: "baseline", gap: "4px" }}
                >
                  <span
                    style={{
                      fontSize: "2.75rem",
                      fontWeight: "900",
                      color: "var(--colors-text-primary, #0f172a)",
                    }}
                  >
                    £{isAnnual ? "7.99" : "9.99"}
                  </span>
                  <span style={{ fontSize: "1rem", color: "var(--colors-text-muted, #64748b)" }}>
                    / month {isAnnual ? "(billed £95.88/yr)" : ""}
                  </span>
                </div>

                <div className={stack({ gap: "3", mb: "8" })}>
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      fontSize: "14px",
                      color: "var(--colors-text-primary, #0f172a)",
                      fontWeight: "600",
                    })}
                  >
                    <FiCheck color="#10b981" size={18} /> Everything in Free manual
                  </div>
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      fontSize: "14px",
                      color: "var(--colors-text-primary, #0f172a)",
                      fontWeight: "600",
                    })}
                  >
                    <FiCheck color="#10b981" size={18} /> Regulated FCA Open Banking sync (all UK
                    banks)
                  </div>
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      fontSize: "14px",
                      color: "var(--colors-text-primary, #0f172a)",
                      fontWeight: "600",
                    })}
                  >
                    <FiCheck color="#10b981" size={18} /> £100k tax trap and 30-hour childcare
                    calculator
                  </div>
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      fontSize: "14px",
                      color: "var(--colors-text-primary, #0f172a)",
                      fontWeight: "600",
                    })}
                  >
                    <FiCheck color="#10b981" size={18} /> Section 24 buy-to-let finance cost
                    modeller
                  </div>
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      fontSize: "14px",
                      color: "var(--colors-text-primary, #0f172a)",
                      fontWeight: "600",
                    })}
                  >
                    <FiCheck color="#10b981" size={18} /> 30-year compounding net worth scenarios
                  </div>
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      fontSize: "14px",
                      color: "var(--colors-text-primary, #0f172a)",
                      fontWeight: "600",
                    })}
                  >
                    <FiCheck color="#10b981" size={18} /> Daily transaction auto-categorisation
                  </div>
                </div>
              </div>

              <a href={`${appUrl}/signUp?plan=pro`} style={{ textDecoration: "none" }}>
                <Button
                  size="lg"
                  variant="primary"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  Start 14-day free Pro trial →
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
