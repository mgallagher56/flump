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
  redirect,
  useNavigate,
  useSearchParams,
} from "react-router";
import { HomeDashboard } from "~/features/dashboard/components/HomeDashboard";
import { financialBaselineAtom, writeOnboardingSeedCookie } from "~/state/baseline.store";
import { getAuthSession } from "~/utils/auth.server";
import { getSandboxPersonaData } from "~/utils/demoData";

export const meta: MetaFunction = () => [
  { title: "Live Demo Sandbox | Flump (Read-Only)" },
  { name: "robots", content: "noindex, nofollow" },
];

const bannerStyle = css({
  // Sticky only from md up: on phones the banner would otherwise cover a third of the screen.
  position: { base: "static", md: "sticky" },
  top: 0,
  zIndex: 40,
  backgroundColor: "surface",
  color: "text.primary",
  padding: { base: "8px 12px", md: "10px 16px" },
  borderRadius: "lg",
  boxShadow: "card",
  border: "1px solid",
  borderColor: "border",
  transition: "background-color 0.2s ease, border-color 0.2s ease",
});

const pillStyle = (active: boolean) =>
  css({
    fontSize: "12px",
    fontWeight: "700",
    // 44px hit area (WCAG 2.5.8) without a taller visual chip on desktop.
    minHeight: "44px",
    padding: "5px 12px",
    borderRadius: "full",
    border: "1px solid",
    borderColor: active ? "primary" : "border",
    backgroundColor: active ? "primary.solid" : "transparent",
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
  minHeight: "44px",
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

// The sandbox is for signed-out visitors only: signed-in users already have real data.
export const loader = async (args: LoaderFunctionArgs) => {
  try {
    const { user } = await getAuthSession(args, { ensureSignedIn: false });
    if (user) return redirect("/");
  } catch (error) {
    // Auth redirects and similar Responses must propagate; anything else means signed out.
    if (error instanceof Response) throw error;
  }
  return {};
};

const PERSONAS = [
  { key: "debt", label: "Clearing £8k debt" },
  { key: "medium", label: "£45k earner, no debt" },
  { key: "high", label: "£100k high earner" },
] as const;

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
        gap: { base: "3", md: "6" },
        paddingTop: { base: "2", md: "4" },
        paddingBottom: "12",
        width: "100%",
        maxWidth: "1536px",
        margin: "0 auto",
      })}
    >
      {/* The single "Guidance, not advice" ProjectionNotice is rendered by HomeDashboard. */}
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
              Demo sandbox (read-only)
            </span>

            {/* Persona Switcher */}
            <fieldset
              className={flex({
                gap: "2",
                flexWrap: "wrap",
                border: "none",
                padding: 0,
                margin: 0,
              })}
            >
              <legend className={css({ srOnly: true })}>Sample persona</legend>
              {PERSONAS.map((persona) => (
                <button
                  key={persona.key}
                  type="button"
                  aria-pressed={activePersona === persona.key}
                  className={pillStyle(activePersona === persona.key)}
                  onClick={() => setActivePersona(persona.key)}
                >
                  {persona.label}
                </button>
              ))}
            </fieldset>
          </div>

          <div className={flex({ align: "center", gap: "3" })}>
            <span
              className={css({
                fontSize: "11px",
                color: "text.muted",
                display: { base: "none", md: "inline" },
              })}
            >
              Ready to use your own bank feeds & HMRC data?
            </span>
            <button
              type="button"
              aria-label="Save my numbers and create account"
              className={saveButtonStyle}
              onClick={handleSaveAndCreateAccount}
            >
              Save my numbers <FiArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      <p
        className={css({
          fontSize: "xs",
          color: "text.muted",
          px: { base: "1", md: "4" },
          py: { base: "0", md: "2" },
        })}
        id="sandbox-sample-data-label"
      >
        Sample data: illustrative figures, not yours. Tax due and take-home here are examples.
      </p>

      {/* Actual SPA Dashboard View */}
      <HomeDashboard
        isSample
        persistVisibility={false}
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
