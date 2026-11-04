import { Button } from "@repo/ui";
import { container, flex, stack } from "@repo/ui/styled-system/patterns";

const getAppUrl = (): string => {
  if (import.meta.env?.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:5173";
  }
  if (import.meta.env?.DEV) {
    return "http://localhost:5173";
  }
  return "https://web-production-845e6c.up.railway.app";
};

export default function App() {
  const appUrl = getAppUrl();

  const navigateTo = (path: string) => {
    if (typeof window !== "undefined") {
      window.location.href = `${appUrl}${path}`;
    }
  };

  return (
    <div className={container({ py: "12", maxW: "5xl" })}>
      <header className={flex({ justify: "space-between", align: "center", mb: "12" })}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", letterSpacing: "-0.02em" }}>
          Flump<span style={{ color: "#6363F1" }}>.</span>
        </h1>
        <div className={flex({ gap: "3", align: "center" })}>
          <Button variant="ghost" onClick={() => navigateTo("/tools")}>
            Free UK Calculators
          </Button>
          <Button variant="outline" onClick={() => navigateTo("/login")}>
            Sign In
          </Button>
          <Button variant="primary" onClick={() => navigateTo("/signUp")}>
            Get Started
          </Button>
        </div>
      </header>

      <main className={stack({ gap: "8", align: "center", textAlign: "center", py: "10" })}>
        <span
          style={{
            display: "inline-block",
            padding: "6px 14px",
            borderRadius: "9999px",
            backgroundColor: "rgba(99, 102, 241, 0.12)",
            color: "#6363F1",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          🇬🇧 Engineered Specifically for UK Personal Finance & HMRC Rules
        </span>

        <h2
          style={{ fontSize: "3.25rem", fontWeight: "800", lineHeight: "1.15", maxWidth: "800px" }}
        >
          Get out of the red. <br />
          <span
            style={{
              background: "linear-gradient(135deg, #EF4444 0%, #F59E0B 50%, #10B981 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Build into the black.
          </span>
        </h2>
        <p style={{ fontSize: "1.2rem", opacity: 0.8, maxWidth: "640px", lineHeight: "1.6" }}>
          The UK financial engine built for every stage of your money. Crush high-interest debt,
          build an unshakeable emergency runway, and model your path to long-term wealth—in one
          unified workspace.
        </p>

        <div className={flex({ gap: "4", flexWrap: "wrap", justify: "center" })}>
          <Button size="lg" variant="primary" onClick={() => navigateTo("/signUp")}>
            Launch Free Interactive Demo →
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigateTo("/tools")}>
            Explore Free UK Calculators
          </Button>
        </div>

        {/* Free Tool Directory Links */}
        <div style={{ marginTop: "32px", width: "100%", maxWidth: "780px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "16px", opacity: 0.7 }}>
            POPULAR UK FINANCIAL & DEBT TOOLS
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
              textAlign: "left",
            }}
          >
            <a
              href={`${appUrl}/tools/uk-debt-snowball-vs-avalanche-calculator`}
              style={{
                display: "block",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.1)",
                textDecoration: "none",
                color: "inherit",
                backgroundColor: "rgba(255,255,255,0.6)",
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                ⚡ Debt Snowball vs. Avalanche
              </div>
              <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>
                Compare payoff speeds & interest savings
              </div>
            </a>

            <a
              href={`${appUrl}/tools/0-percent-balance-transfer-payoff-calculator`}
              style={{
                display: "block",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.1)",
                textDecoration: "none",
                color: "inherit",
                backgroundColor: "rgba(255,255,255,0.6)",
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                💳 0% Balance Transfer Cliff
              </div>
              <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>
                Calculate monthly target before rate hike
              </div>
            </a>

            <a
              href={`${appUrl}/tools/overdraft-cost-and-payoff-calculator`}
              style={{
                display: "block",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.1)",
                textDecoration: "none",
                color: "inherit",
                backgroundColor: "rgba(255,255,255,0.6)",
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>🏦 Arranged Overdraft Cost</div>
              <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>
                Calculate stealth ~40% EAR charges
              </div>
            </a>

            <a
              href={`${appUrl}/tools/uk-student-loan-overpay-or-invest-calculator`}
              style={{
                display: "block",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.1)",
                textDecoration: "none",
                color: "inherit",
                backgroundColor: "rgba(255,255,255,0.6)",
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                🎓 Student Loan Overpay or Invest
              </div>
              <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>
                Graduate tax model for Plan 2 & 5
              </div>
            </a>

            <a
              href={`${appUrl}/tools/uk-100k-tax-trap-calculator`}
              style={{
                display: "block",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.1)",
                textDecoration: "none",
                color: "inherit",
                backgroundColor: "rgba(255,255,255,0.6)",
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>⚠️ £100k–£125k 60% Tax Trap</div>
              <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>
                Personal allowance taper & sacrifice savings
              </div>
            </a>

            <a
              href={`${appUrl}/tools/mortgage-overpayment-vs-isa-calculator`}
              style={{
                display: "block",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.1)",
                textDecoration: "none",
                color: "inherit",
                backgroundColor: "rgba(255,255,255,0.6)",
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>🏠 Mortgage vs. S&S ISA</div>
              <div style={{ fontSize: "12px", opacity: 0.7, marginTop: "4px" }}>
                Fixed guarantee vs. compounding equities
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
