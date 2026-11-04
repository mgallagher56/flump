import { Button } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { stack } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { Helmet } from "react-helmet-async";
import { FiArrowLeft } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { GUIDES_DATA } from "./GuidesIndexPage";

const containerStyle = css({
  maxWidth: "4xl",
  mx: "auto",
  py: "12",
  px: "4",
});

const contentCardStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "2xl",
  p: { base: "6", md: "10" },
  boxShadow: { base: "0 6px 24px rgba(0,0,0,0.03)", _dark: "0 4px 16px rgba(0,0,0,0.2)" },
  mb: "12",
  lineHeight: "1.8",
  color: { base: "slate.700", _dark: "slate.200" },
  fontSize: "16px",
});

const badgeStyle = css({
  fontSize: "11px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  backgroundColor: { base: "#e0e7ff", _dark: "rgba(99, 102, 241, 0.18)" },
  color: { base: "#4338ca", _dark: "#a5b4fc" },
  border: "1px solid",
  borderColor: { base: "transparent", _dark: "rgba(99, 102, 241, 0.3)" },
  padding: "3px 10px",
  borderRadius: "full",
});

const calloutBoxStyle = css({
  backgroundColor: { base: "#f8fafc", _dark: "dark.bg" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderLeftWidth: "4px",
  borderLeftColor: "indigo.500",
  padding: "16px 20px",
  borderRadius: "0 12px 12px 0",
  margin: "16px 0",
});

export const GuidePage: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const guide =
    GUIDES_DATA.find((g) => g.slug === slug) ?? (GUIDES_DATA[0] as (typeof GUIDES_DATA)[number]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Helmet>
        <title>{guide.title} | UK Playbook | Flump</title>
        <meta name="description" content={guide.summary} />
        <link rel="canonical" href={`https://flump.co.uk/guides/${guide.slug}`} />
      </Helmet>

      <Header />

      <main style={{ flex: 1 }}>
        <article className={containerStyle}>
          <div style={{ marginBottom: "20px" }}>
            <Link
              to="/guides"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#6363f1",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              <FiArrowLeft /> All Playbooks
            </Link>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <div
              style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}
            >
              <span className={badgeStyle}>{guide.category}</span>
              <span style={{ fontSize: "13px", color: "var(--colors-text-muted, #94a3b8)" }}>
                {guide.readTime}
              </span>
            </div>
            <h1
              style={{
                fontSize: "clamp(2rem, 4vw, 2.75rem)",
                fontWeight: "800",
                color: "var(--colors-text-primary, #0f172a)",
                lineHeight: "1.2",
                margin: "12px 0",
              }}
            >
              {guide.title}
            </h1>
          </div>

          <div className={contentCardStyle}>
            {slug === "how-to-escape-the-60-percent-tax-trap" && (
              <div className={stack({ gap: "6" })}>
                <p>
                  In the UK, when your adjusted net income crosses £100,000, HMRC reduces your
                  standard tax-free Personal Allowance (£12,570) by £1 for every £2 earned above the
                  threshold. This creates a stealth <strong>60% marginal income tax rate</strong>{" "}
                  between £100,000 and £125,140 (40% higher rate tax plus 20% lost allowance tax
                  relief).
                </p>

                <h2
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    color: "var(--colors-text-primary, #0f172a)",
                    margin: "16px 0 8px",
                  }}
                >
                  The 30-Hour Childcare Cliff
                </h2>
                <p>
                  For parents with young children, the penalty is even steeper. Earning £100,001
                  immediately disqualifies your household from Tax-Free Childcare (worth up to
                  £2,000 per child per year) and the 15 to 30 hours of free government-funded
                  nursery childcare (worth up to £6,000–£8,000 per year).
                </p>

                <div className={calloutBoxStyle}>
                  <strong style={{ color: "var(--colors-text-primary, #0f172a)" }}>
                    The Salary Sacrifice Solution:
                  </strong>{" "}
                  Every £1 contributed to an employer pension via salary sacrifice reduces your
                  adjusted net income. Contributing £15,000 on a £115,000 salary restores your full
                  Personal Allowance and protects childcare eligibility.
                </div>

                <div style={{ marginTop: "16px" }}>
                  <Link to="/tools/uk-100k-tax-trap-calculator" style={{ textDecoration: "none" }}>
                    <Button variant="primary">Open the Free £100k Tax Trap Calculator →</Button>
                  </Link>
                </div>
              </div>
            )}

            {slug !== "how-to-escape-the-60-percent-tax-trap" && (
              <div className={stack({ gap: "6" })}>
                <p>{guide.summary}</p>
                <p>
                  UK personal finance operates under distinct statutory frameworks. Whether
                  optimizing debt payoff through Avalanche vs Snowball, assessing buy-to-let rental
                  returns under Section 24, or weighing mortgage repayments against global equities
                  in an ISA, running exact mathematical models prevents costly errors.
                </p>

                <div style={{ marginTop: "20px" }}>
                  <Link to="/tools" style={{ textDecoration: "none" }}>
                    <Button variant="primary">
                      Explore Interactive Calculators for this Playbook →
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};
