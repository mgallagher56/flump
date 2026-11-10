import type { OnboardingSeedPayload } from "@flump/finance-engine";
import { persistOnboardingSeed } from "@flump/finance-engine";
import { css } from "@repo/ui/styled-system/css";
import { flex } from "@repo/ui/styled-system/patterns";
import { useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { FiArrowRight, FiLock } from "react-icons/fi";
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useNavigate,
  useSearchParams,
} from "react-router";
import { HomeDashboard } from "~/components/dashboard/HomeDashboard";
import { financialBaselineAtom, writeOnboardingSeedCookie } from "~/state/baseline.store";
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
  backgroundColor: "status.positive.solid",
  color: "text.onContrast",
  border: "none",
  borderRadius: "lg",
  padding: "6px 14px",
  fontSize: "12px",
  fontWeight: "700",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  transition: "opacity 0.15s ease",
  _hover: { opacity: 0.9 },
});

export const loader = async (_args: LoaderFunctionArgs) => {
  return {};
};

export default function SandboxRoute() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const personaParam = searchParams.get("persona");

  const initialPersona: "debt" | "medium" | "high" =
    personaParam === "wealth" || personaParam === "high"
      ? "high"
      : personaParam === "medium"
        ? "medium"
        : "debt";

  const [activePersona, setActivePersona] = useState<"debt" | "medium" | "high">(initialPersona);
  const setBaseline = useSetAtom(financialBaselineAtom);

  useEffect(() => {
    if (activePersona === "debt") {
      setBaseline((prev) => ({
        ...prev,
        annualGrossSalary: 34000,
        financialStage: "STAGE_1_DEBT_RECOVERY",
        enabledModules: ["debt", "budget", "accounts"],
      }));
    } else if (activePersona === "medium") {
      setBaseline((prev) => ({
        ...prev,
        annualGrossSalary: 45000,
        financialStage: "STAGE_2_BUFFER_BUILD",
        enabledModules: ["accounts", "budget", "pension", "forecast"],
      }));
    } else {
      setBaseline((prev) => ({
        ...prev,
        annualGrossSalary: 115000,
        financialStage: "STAGE_3_WEALTH_OPTIMIZE",
        enabledModules: ["accounts", "budget", "tax", "pension", "mortgage", "forecast"],
      }));
    }
  }, [activePersona, setBaseline]);

  const dashboardData = getSandboxPersonaData(activePersona);

  const handleSaveAndCreateAccount = () => {
    const seed: OnboardingSeedPayload = {
      mode: activePersona === "debt" ? "DEBT" : "WEALTH",
      annualGrossSalary:
        activePersona === "debt" ? 34000 : activePersona === "medium" ? 45000 : 115000,
      inferredStage:
        activePersona === "debt"
          ? "STAGE_1_DEBT_RECOVERY"
          : activePersona === "medium"
            ? "STAGE_2_BUFFER_BUILD"
            : "STAGE_3_WEALTH_OPTIMIZE",
      inferredModules:
        activePersona === "debt"
          ? ["debt", "budget", "accounts"]
          : activePersona === "medium"
            ? ["accounts", "budget", "pension", "forecast"]
            : ["accounts", "budget", "tax", "pension", "mortgage", "forecast"],
      timestamp: Date.now(),
    };

    writeOnboardingSeedCookie(seed);
    persistOnboardingSeed(seed as any);

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
        width: "100%",
        maxWidth: "1536px",
        margin: "0 auto",
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
            width: "100%",
          })}
        >
          <div className={flex({ align: "center", gap: "3", flexWrap: "wrap" })}>
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
            <div className={flex({ gap: "2", flexWrap: "wrap" })}>
              <button
                type="button"
                className={pillStyle(activePersona === "debt")}
                onClick={() => setActivePersona("debt")}
              >
                Persona A: Clearing £8k Debt
              </button>
              <button
                type="button"
                className={pillStyle(activePersona === "medium")}
                onClick={() => setActivePersona("medium")}
              >
                Persona B: £45k Earner (No Debt)
              </button>
              <button
                type="button"
                className={pillStyle(activePersona === "high")}
                onClick={() => setActivePersona("high")}
              >
                Persona C: £100k High Earner
              </button>
            </div>
          </div>

          <div className={flex({ align: "center", gap: "3" })}>
            <span className={css({ fontSize: "11px", color: "text.muted" })}>
              Ready to use your own bank feeds & HMRC data?
            </span>
            <button type="button" className={saveButtonStyle} onClick={handleSaveAndCreateAccount}>
              Save My Custom Numbers <FiArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Actual SPA Dashboard View */}
      <HomeDashboard
        userProfile={dashboardData.userProfile}
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
