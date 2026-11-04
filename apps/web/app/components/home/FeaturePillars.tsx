import { css } from "@repo/ui/styled-system/css";
import { type FC, useState } from "react";
import type { IconType } from "react-icons";
import {
  FiDollarSign,
  FiFileText,
  FiHome,
  FiLayers,
  FiPercent,
  FiShield,
  FiTrendingUp,
} from "react-icons/fi";
import { Link as RouterLink } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";

const sectionContainerStyle = css({
  maxWidth: "6xl",
  margin: "0 auto",
  paddingLeft: "16px",
  paddingRight: "16px",
  marginBottom: { base: "64px", md: "96px" },
});

const headerContainerStyle = css({
  textAlign: "center",
  maxWidth: "3xl",
  margin: "0 auto 36px auto",
});

const personaTabsWrapperStyle = css({
  display: "flex",
  justifyContent: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "32px",
});

const personaTabStyle = (active: boolean) =>
  css({
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 18px",
    borderRadius: "full",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid",
    borderColor: active ? "primary" : "border",
    backgroundColor: active ? "primary" : "surface",
    color: active ? "#ffffff" : "text.secondary",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: "primary",
      transform: "translateY(-1px)",
    },
  });

const personaHighlightCardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "24px", md: "36px" },
  marginBottom: "48px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
  position: "relative",
  overflow: "hidden",
});

const personaGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "1.2fr 0.8fr" },
  gap: "28px",
  alignItems: "center",
});

const personaFeatureListStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginTop: "16px",
});

const personaFeatureItemStyle = css({
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  fontSize: "14px",
  color: "text.secondary",
  lineHeight: "1.5",
});

const metricCardStyle = css({
  backgroundColor: "background",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  textAlign: "left",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "repeat(2, 1fr)" },
  gap: "24px",
});

const cardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "2xl",
  padding: { base: "24px", md: "32px" },
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "sm",
  transition: "all 0.25s ease",
  "&:hover": {
    borderColor: "primary",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
    transform: "translateY(-2px)",
  },
});

const iconBadgeStyle = (bgColor: string, textColor: string) =>
  css({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    height: "48px",
    borderRadius: "xl",
    backgroundColor: bgColor,
    color: textColor,
    fontSize: "22px",
    marginBottom: "20px",
  });

const tagListStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "24px",
  paddingTop: "20px",
  borderTop: "1px solid",
  borderColor: "border",
});

const tagPillStyle = css({
  fontSize: "xs",
  fontWeight: "medium",
  padding: "4px 10px",
  borderRadius: "full",
  backgroundColor: "background",
  color: "text.muted",
  border: "1px solid",
  borderColor: "border",
});

type PersonaId = "paye" | "homeowner" | "landlord" | "wealth";

interface PersonaConfig {
  id: PersonaId;
  label: string;
  icon: IconType;
  title: string;
  badge: string;
  description: string;
  features: string[];
  metricLabel: string;
  metricValue: string;
  metricNote: string;
  toolLink: string;
  toolLinkLabel: string;
}

const PERSONAS: PersonaConfig[] = [
  {
    id: "paye",
    label: "Higher-Rate PAYE (£100k+)",
    icon: FiPercent,
    title: "Escape the 60% Tax Trap & Maximize Allowances",
    badge: "For High Earners",
    description:
      "Cross £100k and HMRC strips your £12,570 Personal Allowance at £1 for every £2, creating a punitive 60% marginal tax rate plus loss of tax-free childcare. Flump models exact salary sacrifice and SIPP contributions to reclaim your allowance.",
    features: [
      "Dynamic £100k–£125k tax trap detector with one-click escape modeling",
      "Salary sacrifice vs. SIPP relief comparison including employer NI pass-through",
      "Live £20,000 ISA & £60,000 Pension Annual Allowance countdown",
    ],
    metricLabel: "Average Tax Trap Relief",
    metricValue: "£5,020 / yr",
    metricNote: "Recovered via targeted £10k pension sacrifice at £110k gross salary",
    toolLink: "/tools/uk-100k-tax-trap-calculator",
    toolLinkLabel: "Open 60% Tax Trap Calculator →",
  },
  {
    id: "homeowner",
    label: "Homeowner & Remortgager",
    icon: FiHome,
    title: "Defeat Remortgage Shock & Compare Overpay vs. ISA",
    badge: "For Property Owners",
    description:
      "When your 2% fixed-rate deal expires, jumping to lender SVR or 5% rates can add hundreds to your monthly bill. Flump tracks your deal expiry, models milestone LTV bands, and mathematically proves whether overpaying beats investing.",
    features: [
      "Fix expiry alert & monthly jump forecast into lender Standard Variable Rate",
      "Target LTV milestone tracker (e.g. 75% vs. 80%) to unlock cheaper renewal tiers",
      "Live comparison of mortgage overpayment savings vs. tax-free S&S ISA compounding",
    ],
    metricLabel: "Mortgage vs ISA Spread",
    metricValue: "+£48,200",
    metricNote: "Projected 15-year ISA compounding advantage over 4.2% mortgage overpayment",
    toolLink: "/tools/mortgage-overpay-vs-isa",
    toolLinkLabel: "Open Overpay vs ISA Comparator →",
  },
  {
    id: "landlord",
    label: "Landlord & Side-Hustler",
    icon: FiDollarSign,
    title: "Section 24 Landlord Reducer & HMRC Payments on Account",
    badge: "For Property & Self-Employed",
    description:
      "Section 24 restricts buy-to-let finance costs to a 20% basic-rate credit, driving many landlords into higher-rate brackets on phantom profits. Flump calculates exact Section 24 adjustments, joint ownership splits, and January/July tax buffers.",
    features: [
      "Automated Section 24 restriction calculator with beneficial ownership split modeling",
      "Payments on Account cash-flow reserve schedule for January 31 & July 31 HMRC deadlines",
      "Self-Assessment Class 4 NI & allowable expense categorization",
    ],
    metricLabel: "HMRC Reserve Cushion",
    metricValue: "£420 / mo",
    metricNote: "Recommended monthly tax pot transfer to cover upcoming Payment on Account",
    toolLink: "/tools/section-24-landlord-calculator",
    toolLinkLabel: "Open Section 24 Landlord Calculator →",
  },
  {
    id: "wealth",
    label: "Long-Term Wealth Builder",
    icon: FiTrendingUp,
    title: "Multi-Account Balance Sheet & 30-Year Financial Runway",
    badge: "For Wealth Builders",
    description:
      "Stop juggling fragmented bank apps and spreadsheets. Flump unifies liquid cash, ISAs, SIPPs, crypto, and property equity into a single living net worth ledger with multi-decade Monte Carlo style projections.",
    features: [
      "Unified balance sheet tracking liquid cash vs. illiquid pension and property equity",
      "30-year compound trajectory simulating life events (home purchase, children, early retirement)",
      "Open Banking account aggregation with automated emergency runway stress testing",
    ],
    metricLabel: "Financial Independence Runway",
    metricValue: "18.4 Years",
    metricNote: "Liquid capital runway under current spending and compound ISA yields",
    toolLink: "/?demo=true",
    toolLinkLabel: "Explore Wealth Engine in Live Sandbox →",
  },
];

export const FeaturePillars: FC = () => {
  const [selectedPersonaId, setSelectedPersonaId] = useState<PersonaId>("paye");
  const activePersona = PERSONAS.find((p) => p.id === selectedPersonaId) ?? PERSONAS[0];
  const IconComponent = activePersona.icon;

  return (
    <section aria-labelledby="features-heading" className={sectionContainerStyle}>
      <div className={headerContainerStyle}>
        <span
          className={css({
            color: "primary",
            fontSize: "xs",
            fontWeight: "bold",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: "8px",
          })}
        >
          Built for Complexity
        </span>
        <FLPHeading as="h2" color="text.primary" id="features-heading" mb={3} size="3xl">
          Everything you need to master UK wealth & taxation
        </FLPHeading>
        <FLPText color="text.muted" fontSize="md">
          Generic budgeting apps track coffee expenses. Flump models your complete financial balance
          sheet, UK tax liabilities, and compound long-term wealth tailored to your exact life
          stage.
        </FLPText>
      </div>

      {/* Interactive Persona Selector */}
      <div aria-label="Select financial persona" className={personaTabsWrapperStyle} role="tablist">
        {PERSONAS.map((persona) => {
          const isSelected = persona.id === selectedPersonaId;
          const PersonaIcon = persona.icon;
          return (
            <button
              aria-selected={isSelected}
              className={personaTabStyle(isSelected)}
              key={persona.id}
              onClick={() => setSelectedPersonaId(persona.id)}
              role="tab"
              type="button"
            >
              <PersonaIcon aria-hidden="true" size={16} />
              <span>{persona.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Persona Spotlight Card */}
      <div aria-label={activePersona.title} className={personaHighlightCardStyle} role="tabpanel">
        <div className={personaGridStyle}>
          <div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#6366f1",
                display: "inline-block",
                marginBottom: "8px",
              }}
            >
              {activePersona.badge}
            </span>
            <FLPHeading as="h3" color="text.primary" mb={3} size="xl">
              {activePersona.title}
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              {activePersona.description}
            </FLPText>

            <div className={personaFeatureListStyle}>
              {activePersona.features.map((feature, i) => (
                <div className={personaFeatureItemStyle} key={i}>
                  <FiShield
                    aria-hidden="true"
                    color="#10b981"
                    size={16}
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "24px", display: "flex", gap: "12px", alignItems: "center" }}>
              <RouterLink
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#6366f1",
                  textDecoration: "none",
                }}
                to={activePersona.toolLink}
              >
                {activePersona.toolLinkLabel}
              </RouterLink>
            </div>
          </div>

          <div>
            <div className={metricCardStyle}>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                {activePersona.metricLabel}
              </span>
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                }}
              >
                {activePersona.metricValue}
              </span>
              <span style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>
                {activePersona.metricNote}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Core 4 Pillar Cards */}
      <div className={gridStyle}>
        {/* Pillar 1: UK Tax Engine */}
        <div className={cardStyle}>
          <div>
            <div className={iconBadgeStyle("rgba(59, 130, 246, 0.12)", "rgb(59, 130, 246)")}>
              <FiFileText aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" mb={2} size="xl">
              UK Tax & Self-Assessment Hub
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              Navigate UK taxation without fear. Includes HMRC fiscal-year (6 April – 5 April)
              tracking, PAYE take-home estimation, Class 4 National Insurance calculation, and
              automated Section 24 rental property mortgage interest relief cap (20% basic rate
              credit).
            </FLPText>
          </div>
          <div className={tagListStyle}>
            <span className={tagPillStyle}>£100k Taper Warning</span>
            <span className={tagPillStyle}>Section 24 Landlord Reducer</span>
            <span className={tagPillStyle}>Class 4 NI Bands</span>
            <span className={tagPillStyle}>Joint Ownership Split</span>
          </div>
        </div>

        {/* Pillar 2: Net Worth & Accounts */}
        <div className={cardStyle}>
          <div>
            <div className={iconBadgeStyle("rgba(16, 185, 129, 0.12)", "rgb(16, 185, 129)")}>
              <FiLayers aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" mb={2} size="xl">
              Complete Net Worth Aggregation
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              One unified balance sheet for your entire financial life. Aggregate current accounts,
              high-yield savings pots, Stocks & Shares ISAs, mortgages, credit cards, and personal
              loans. Distinguish liquid emergency cash from illiquid assets at a glance.
            </FLPText>
          </div>
          <div className={tagListStyle}>
            <span className={tagPillStyle}>Multi-Account Ledger</span>
            <span className={tagPillStyle}>Asset Allocation Pie</span>
            <span className={tagPillStyle}>Liquid vs Total Net Worth</span>
            <span className={tagPillStyle}>Open Banking Integration</span>
          </div>
        </div>

        {/* Pillar 3: Mortgage Scenario Engine */}
        <div className={cardStyle}>
          <div>
            <div className={iconBadgeStyle("rgba(245, 158, 11, 0.12)", "rgb(245, 158, 11)")}>
              <FiHome aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" mb={2} size="xl">
              Mortgage Optimization & ISA Comparison
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              Take the guesswork out of home loans. Accurately model amortization schedules,
              evaluate the exact interest saved by lump-sum or recurring overpayments, and directly
              compare paying down your mortgage against investing in a tax-sheltered ISA.
            </FLPText>
          </div>
          <div className={tagListStyle}>
            <span className={tagPillStyle}>Overpayment Term Shaver</span>
            <span className={tagPillStyle}>Mortgage vs ISA Arbitrage</span>
            <span className={tagPillStyle}>Equity Accumulation</span>
            <span className={tagPillStyle}>Remortgage Prep</span>
          </div>
        </div>

        {/* Pillar 4: Pensions & Long-Term Forecasting */}
        <div className={cardStyle}>
          <div>
            <div className={iconBadgeStyle("rgba(139, 92, 246, 0.12)", "rgb(139, 92, 246)")}>
              <FiTrendingUp aria-hidden="true" />
            </div>
            <FLPHeading as="h3" color="text.primary" mb={2} size="xl">
              Pensions & Compound Wealth Forecaster
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm" lineHeight="1.6">
              Simulate your trajectory to financial independence. Factors in UK auto-enrolment rules
              (qualifying earnings band £6,240 – £50,270 with standard 3% employer match), salary
              sacrifice NI efficiency, and multi-decade compound interest forecasts.
            </FLPText>
          </div>
          <div className={tagListStyle}>
            <span className={tagPillStyle}>Auto-Enrolment Qualifying Bands</span>
            <span className={tagPillStyle}>Salary Sacrifice Savings</span>
            <span className={tagPillStyle}>FIRE Target Age</span>
            <span className={tagPillStyle}>Cash Runway Stress Test</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturePillars;
