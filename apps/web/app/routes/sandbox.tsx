import { persistOnboardingSeed } from "@repo/common";
import { css } from "@repo/ui/styled-system/css";
import { flex } from "@repo/ui/styled-system/patterns";
import { useState } from "react";
import { FiArrowRight, FiLock } from "react-icons/fi";
import { type LoaderFunctionArgs, type MetaFunction, useNavigate } from "react-router";
import { HomeDashboard } from "~/components/dashboard/HomeDashboard";
import { getSandboxPersonaData } from "~/utils/demoData";

export const meta: MetaFunction = () => [
  { title: "Live Demo Sandbox | Flump (Read-Only)" },
  { name: "robots", content: "noindex, nofollow" },
];

const bannerStyle = css({
  position: "sticky",
  top: 0,
  zIndex: 40,
  backgroundColor: "surface",
  color: "text.primary",
  padding: "10px 16px",
  borderRadius: "lg",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
  border: "1px solid",
  borderColor: "border",
  transition: "background-color 0.2s ease, border-color 0.2s ease",
});

const pillStyle = (active: boolean) =>
  css({
    fontSize: "12px",
    fontWeight: "700",
    padding: "5px 12px",
    borderRadius: "full",
    border: "1px solid",
    borderColor: active ? "primary" : "border",
    backgroundColor: active ? "primary" : "transparent",
    color: active ? "primary.foreground" : "text.primary",
    cursor: "pointer",
    transition: "all 0.15s ease",
    _hover: {
      borderColor: "primary",
    },
  });

const saveButtonStyle = css({
  backgroundColor: "success",
  color: "success.foreground",
  border: "none",
  borderRadius: "lg",
  padding: "6px 14px",
  fontSize: "12px",
  fontWeight: "700",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  transition: "background-color 0.15s ease",
  _hover: { backgroundColor: "success.hover" },
});

export const loader = async (_args: LoaderFunctionArgs) => {
  return {};
};

export default function SandboxRoute() {
  const navigate = useNavigate();
  const [activePersona, setActivePersona] = useState<"debt" | "wealth">("debt");
  const dashboardData = getSandboxPersonaData(activePersona);

  const handleSaveAndCreateAccount = () => {
    if (activePersona === "debt") {
      persistOnboardingSeed({
        annualIncome: 34000,
        initialCashSavings: 950,
        inferredModules: ["debt", "budget", "accounts"],
        timestamp: Date.now(),
      });
    } else {
      persistOnboardingSeed({
        annualIncome: 95000,
        initialCashSavings: 22000,
        initialInvestments: 48000,
        mortgageBalance: 180000,
        inferredModules: ["accounts", "tax", "mortgage", "pension", "forecast"],
        timestamp: Date.now(),
      });
    }

    navigate("/signUp");
  };

  return (
    <div
      className={css({
        display: "flex",
        flexDirection: "column",
        gap: "6",
        paddingTop: "4",
        paddingBottom: "12",
      })}
    >
      {/* Sticky Sandbox Header Banner */}
      <div className={bannerStyle}>
        <div
          className={flex({
            justify: "space-between",
            align: "center",
            flexWrap: "wrap",
            gap: "3",
            maxW: "7xl",
            mx: "auto",
          })}
        >
          <div className={flex({ align: "center", gap: "3" })}>
            <span
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: "700",
                color: "text.primary",
              })}
            >
              <FiLock size={14} className={css({ color: "primary" })} />
              LIVE DEMO SANDBOX (READ-ONLY)
            </span>

            {/* Persona Switcher */}
            <div className={flex({ gap: "2" })}>
              <button
                type="button"
                className={pillStyle(activePersona === "debt")}
                onClick={() => setActivePersona("debt")}
              >
                Persona A: Clearing £8k Debt
              </button>
              <button
                type="button"
                className={pillStyle(activePersona === "wealth")}
                onClick={() => setActivePersona("wealth")}
              >
                Persona B: £95k Earner + BTL
              </button>
            </div>
          </div>

          <div className={flex({ align: "center", gap: "3" })}>
            <span className={css({ fontSize: "11px", color: "text.muted" })}>
              Ready to use your own bank feeds & HMRC data?
            </span>
            <button type="button" className={saveButtonStyle} onClick={handleSaveAndCreateAccount}>
              Save My Changes & Create Account <FiArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Actual SPA Dashboard View */}
      <HomeDashboard
        accountsData={dashboardData.accountsData as any}
        budgetData={dashboardData.budgetData as any}
        checklistProps={{
          hasAccounts: true,
          hasBudget: true,
          hasMortgageAccount: dashboardData.hasMortgageAccount,
          hasPension: true,
          hasProfile: true,
          hasRunForecast: dashboardData.hasRunForecast,
          hasSavings: dashboardData.hasSavings,
          hasTax: true,
          completedSteps: dashboardData.completedSteps,
        }}
        debtData={dashboardData.debtData as any}
        forecastData={dashboardData.forecastData as any}
        mortgageData={dashboardData.mortgageData as any}
        pensionData={dashboardData.pensionData as any}
        savingsData={dashboardData.savingsData as any}
        taxData={dashboardData.taxData as any}
        user={dashboardData.user as any}
      />
    </div>
  );
}
