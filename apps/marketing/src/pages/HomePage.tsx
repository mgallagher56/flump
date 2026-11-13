import { Button } from "@repo/ui";
import { flex, stack } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { BaselineSnapshotPreview } from "../components/BaselineSnapshotPreview";
import { BigMovesSection } from "../components/BigMovesSection";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { HomeFAQ } from "../components/HomeFAQ";
import { McpSpotlightSection } from "../components/McpSpotlightSection";
import { MonthlyPictureSection } from "../components/MonthlyPictureSection";
import { PageMeta } from "../components/PageMeta";
import { PayRiseTeaser } from "../components/PayRiseTeaser";
import { SecurityPrivacySection } from "../components/SecurityPrivacySection";
import { signupCta } from "../utils/site";
import { getAppUrl } from "../utils/url";

export const HomePage: FC = () => {
  const appUrl = getAppUrl();
  const cta = signupCta();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PageMeta
        title="Flump | See where you stand each month, under UK rules"
        description="See where you stand each month, whether you rent or pay a mortgage: months of cover, safe to spend and what a change would do, under UK rules."
      />

      <Header />

      <main style={{ flex: 1 }}>
        {/* Section 00: Hero Section with Architectural Grid & Radial Glow */}
        <section
          style={{
            position: "relative",
            padding: "80px 16px 72px",
            textAlign: "center",
            overflow: "hidden",
            backgroundColor: "var(--colors-surface-canvas)",
          }}
        >
          {/* Subtle radial ambient spotlight backdrop */}
          <div
            style={{
              position: "absolute",
              top: "-80px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "1100px",
              height: "520px",
              background:
                "radial-gradient(ellipse 70% 60% at 50% 10%, rgba(99, 102, 241, 0.16) 0%, rgba(16, 185, 129, 0.05) 45%, transparent 75%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          <div
            style={{ maxWidth: "1060px", margin: "0 auto", position: "relative", zIndex: 1 }}
            className={stack({ gap: "7", align: "center" })}
          >
            <span
              style={{
                display: "inline-block",
                padding: "8px 18px",
                borderRadius: "9999px",
                backgroundColor: "var(--colors-surface-tinted)",
                color: "var(--colors-primary)",
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "0.04em",
                fontFamily: "var(--fonts-mono)",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.15)",
              }}
            >
              🇬🇧 Built for UK tax rules
            </span>

            <h1
              style={{
                fontSize: "clamp(2.875rem, 6.5vw, 5.25rem)",
                fontWeight: "900",
                lineHeight: "1.08",
                letterSpacing: "-0.04em",
                color: "var(--colors-text-primary)",
                fontFamily: "var(--fonts-display)",
                margin: 0,
                maxWidth: "960px",
              }}
            >
              See where you stand each month.
            </h1>

            <p
              style={{
                fontSize: "clamp(1.15rem, 2vw, 1.35rem)",
                color: "var(--colors-text-secondary)",
                maxWidth: "780px",
                lineHeight: "1.65",
                margin: 0,
              }}
            >
              Enter six rough numbers, no bank login needed. See your months of cover and what's
              safe to spend, then model what a change would do under UK rules.
            </p>

            <div className={flex({ gap: "4", flexWrap: "wrap", justify: "center" })}>
              <a href={cta.href} style={{ textDecoration: "none" }}>
                <Button
                  size="lg"
                  variant="primary"
                  style={{
                    padding: "16px 36px",
                    fontSize: "1.0625rem",
                    fontWeight: "700",
                    borderRadius: "12px",
                    boxShadow: "0 10px 28px -4px rgba(99, 102, 241, 0.45)",
                  }}
                >
                  {cta.label} →
                </Button>
              </a>
              <a
                href={`${appUrl}/sandbox`}
                style={{ textDecoration: "none" }}
                target="_blank"
                rel="noreferrer"
              >
                <Button
                  size="lg"
                  variant="outline"
                  style={{
                    padding: "16px 28px",
                    fontSize: "1.0625rem",
                    borderRadius: "12px",
                  }}
                >
                  Try the live demo
                </Button>
              </a>
            </div>
          </div>

          {/* Clean Baseline Snapshot Preview Card with Cashflow Bar */}
          <div style={{ marginTop: "44px", position: "relative", zIndex: 1 }}>
            <BaselineSnapshotPreview />
          </div>
        </section>

        {/* Section 01: The monthly picture (months of cover, safe to spend, check-in) */}
        <MonthlyPictureSection />

        {/* Section 02: Three big moves (rent or mortgage, debts, pension) */}
        <BigMovesSection />

        {/* Section 03: What you keep from a pay rise */}
        <PayRiseTeaser />

        {/* Section 04: Security & Privacy (Full-Bleed Contrast Dark Band) */}
        <SecurityPrivacySection />

        {/* Section 05: Model Context Protocol (MCP) Spotlight */}
        <McpSpotlightSection />

        {/* Section 06: FAQ Accordion (Subtle Surface Band) */}
        <HomeFAQ />

        {/* Final CTA Banner */}
        <section
          style={{
            padding: "80px 16px",
            textAlign: "center",
            backgroundColor: "var(--colors-surface-canvas)",
            borderTop: "1px solid var(--colors-border)",
          }}
        >
          <div style={{ maxWidth: "680px", margin: "0 auto" }}>
            <h2
              style={{
                fontSize: "2.5rem",
                fontWeight: "800",
                color: "var(--colors-text-primary)",
                fontFamily: "var(--fonts-display)",
                letterSpacing: "-0.03em",
                margin: "0 0 14px 0",
              }}
            >
              Ready to see where you stand?
            </h2>
            <p
              style={{
                fontSize: "1.15rem",
                color: "var(--colors-text-secondary)",
                marginBottom: "32px",
                lineHeight: "1.6",
              }}
            >
              Start with six rough numbers. No bank login needed.
            </p>
            <div className={flex({ gap: "4", justify: "center", flexWrap: "wrap" })}>
              <a href={cta.href} style={{ textDecoration: "none" }}>
                <Button size="lg" variant="primary">
                  {cta.label} →
                </Button>
              </a>
              <Link to="/tools" style={{ textDecoration: "none" }}>
                <Button size="lg" variant="ghost">
                  Browse free calculators
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
